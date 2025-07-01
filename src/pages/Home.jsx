import { useEffect, useState, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import {
  fetchProducts,
  fetchPopularProducts,
  fetchCategories,
  fetchFilteredBrands,
  fetchFilteredSizes,
  fetchFilteredGenders,
} from "../api";
import Banner from "../components/Banner";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import FilterBar from "../components/FilterBar";
import SortControl from "../components/SortControl";

const LIMIT = 20;
const RAW_FETCH_MULTIPLIER = 3;

function groupProducts(rawProducts) {
  return rawProducts.map(p => ({
    ...p,
    sizes: Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : [],
  }));
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const urlSearchParams = new URLSearchParams(location.search);
  const urlSearch = urlSearchParams.get("search") || "";

  const [categories, setCategories] = useState([]);

  // --- ключевой state для главной выбранной категории ---
  const [mainCategoryKey, setMainCategoryKey] = useState("");        // Например: Shoes
  const [mainCategoryLabel, setMainCategoryLabel] = useState("");    // Например: Shoes/Обувь

  // breadcrumbs зависят только от mainCategory
  const breadcrumbs = useMemo(() => {
    if (!mainCategoryKey) return [{ label: "Main", query: "" }];
    return [
      { label: "Main", query: "" },
      { label: mainCategoryLabel || mainCategoryKey, query: "", categoryKey: mainCategoryKey }
    ];
  }, [mainCategoryKey, mainCategoryLabel]);

  // filters — отдельно!
  const [rawProducts, setRawProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(""); // Это сабкатегория
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

  const [sort, setSort] = useState("");

  // На главной, когда нет категории вообще
  const isHome = useMemo(() =>
    !mainCategoryKey && !urlSearch && !brandFilter && !genderFilter && !sizeFilter
  , [mainCategoryKey, urlSearch, brandFilter, genderFilter, sizeFilter]);

  // Вычисляем subcategory (categoryFilter) только если выбрана основная категория
  const subcategoryKey = useMemo(() => {
    if (!mainCategoryKey || !categoryFilter) return "";
    // найдём такую подкатегорию в основной категории
    const cat = categories.find(c => c.category_key === mainCategoryKey);
    if (cat && (cat.subcategories || []).some(sub =>
      (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === categoryFilter
    )) {
      return categoryFilter;
    }
    return "";
  }, [mainCategoryKey, categoryFilter, categories]);

  // Все фильтры, которые нужны для fetch
  const filters = useMemo(() => ({
    query: urlSearch,
    categoryKey: mainCategoryKey,
    subcategoryKey,
    brand: brandFilter,
    gender: genderFilter,
    size: sizeFilter,
  }), [urlSearch, mainCategoryKey, subcategoryKey, brandFilter, genderFilter, sizeFilter]);

  // --- Загружаем категории один раз
  useEffect(() => {
    fetchCategories()
      .then(data => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

  // ... filter options (бренды, размеры, пол)
  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);

  useEffect(() => {
    async function updateOptions() {
      try {
        const brands = await fetchFilteredBrands(filters);
        setBrandsInFilter(brands);

        const sizes = await fetchFilteredSizes(filters);
        setSizesInFilter(sizes);

        const genders = await fetchFilteredGenders(filters);
        setGendersInFilter(genders);
      } catch {
        // ignore
      }
    }
    updateOptions();
  }, [filters]);

  // --- Загрузка товаров ---
  const loadProducts = useCallback(async ({ reset = false } = {}) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      let offset = reset ? 0 : rawProducts.length;
      let rawLimit = LIMIT * RAW_FETCH_MULTIPLIER;

      let fetchedRaw = [];
      if (isHome) {
        fetchedRaw = await fetchPopularProducts(rawLimit);
        offset = 0;
      } else {
        fetchedRaw = await fetchProducts(
          filters.query,
          rawLimit,
          offset,
          "",
          filters.brand,
          "asc",
          filters.categoryKey,
          filters.subcategoryKey,
          filters.gender,
          filters.size
        );
      }

      let updatedRaw = reset ? fetchedRaw : [...rawProducts, ...fetchedRaw];
      setRawProducts(updatedRaw);
      const grouped = groupProducts(updatedRaw);

      const showCount = reset ? LIMIT : products.length + LIMIT;
      const paged = grouped.slice(0, showCount);

      setProducts(paged);
      setHasMore(fetchedRaw.length === rawLimit);
    } catch (err) {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isLoading, rawProducts, isHome, products.length]);

  // --- Сброс при смене фильтров и mainCategory ---
  useEffect(() => {
    setRawProducts([]);
    setProducts([]);
    setHasMore(true);
    loadProducts({ reset: true });
    // eslint-disable-next-line
  }, [filters, isHome]);

  // --- Скролл для подгрузки
  useEffect(() => {
    if (isHome) return;
    const onScroll = () => {
      if (isLoading || !hasMore) return;
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
        loadProducts({ reset: false });
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [loadProducts, isLoading, hasMore, isHome]);

  // --- ВЫБОР ГЛАВНОЙ КАТЕГОРИИ ЧЕРЕЗ HEADER/NavMenu ---
  // Эту функцию передай в Header/NavMenu!
  const handleMainCategorySelect = (categoryKey, label) => {
    setMainCategoryKey(categoryKey);
    setMainCategoryLabel(label || categoryKey);
    setCategoryFilter(""); // Сбрасываем сабкатегорию
    setBrandFilter("");
    setGenderFilter("");
    setSizeFilter("");
    // breadcrumbs сам обновится!
    navigate(`/?category=${categoryKey}`); // или другой url, если нужно
  };

  // --- Изменение фильтров в FilterBar ---
  // НЕ МЕНЯЕМ mainCategoryKey или breadcrumbs!
  const handleCategoryFilterChange = (newCategory) => setCategoryFilter(newCategory);

  // --- Поиск (Enter, input, select Brand и др.) ---
  const handleSearch = (
    query,
    breadcrumbTrail,
    excludeArg = "",
    filterBrand = "",
    category = "",
    subcategory = "",
    genderArg = "",
    sizeArg = ""
  ) => {
    // Если поиск с главной — сбрасываем mainCategory
    if (breadcrumbTrail && breadcrumbTrail.length === 1) {
      setMainCategoryKey("");
      setMainCategoryLabel("");
      setCategoryFilter("");
    }
    setBrandFilter(filterBrand || "");
    setGenderFilter(genderArg || "");
    setSizeFilter(sizeArg || "");
    // фильтр категорий не трогаем
    navigate(query ? `/?search=${encodeURIComponent(query)}` : `/`);
  };

  // --- Остальное как было ---
  const genderOptions = useMemo(() =>
    gendersInFilter.map(g => ({
      value: g,
      label: g === "m" ? "Men" : g === "w" ? "Women" : g === "k" ? "Kids" : g
    })),
    [gendersInFilter]
  );
  const showGenderOption = gendersInFilter.length > 1 || !!genderFilter;

  const getEffectivePrice = (item) => {
    const fix = val => {
      if (val == null) return Infinity;
      if (typeof val === "number") return val;
      const str = String(val)
        .replace(/\s| /g, "")
        .replace(",", ".")
        .replace(/[^0-9.]/g, "");
      const n = Number(str);
      return isNaN(n) ? Infinity : n;
    };
    const discount = fix(item.discount_price);
    const price = fix(item.price);
    return discount > 0 ? discount : price;
  };

  const displayedProducts = useMemo(() => {
    let arr = [...products];
    if (sort === "asc") {
      arr.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (sort === "desc") {
      arr.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    } else if (sort === "popular") {
      arr.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === "discount") {
      arr.sort((a, b) => {
        const ad = Number(a.discount) || 0;
        const bd = Number(b.discount) || 0;
        return bd - ad;
      });
    }
    return arr;
  }, [products, sort]);

  const clearFilters = () => {
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setCategoryFilter("");
  };

  const handleCardClick = (productId) => {
    const searchParam = urlSearch ? `?search=${encodeURIComponent(urlSearch)}` : "";
    navigate(`/product/${productId}${searchParam}`, {
      state: {
        from: location.pathname + searchParam,
        breadcrumbs: breadcrumbs,
        query: urlSearch,
      }
    });
  };

  // submenuList для FilterBar
  const submenuList = useMemo(() => {
    const cat = categories.find(c => c.category_key === mainCategoryKey);
    if (!cat) return [];
    return (cat.subcategories || []).map(sub =>
      typeof sub === "string" ? sub : sub.subcategory_key || sub.label
    );
  }, [categories, mainCategoryKey]);

  return (
    <>
      <Header
        onSearch={handleSearch}
        onMainCategorySelect={handleMainCategorySelect}
        breadcrumbs={breadcrumbs}
        isHome={isHome}
        setCategoryFilter={setCategoryFilter}
        setForceOpenCategory={setForceOpenCategory}
        mainCategoryKey={mainCategoryKey}
      />

      {!isHome && (
        <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={() => {
          setMainCategoryKey("");
          setMainCategoryLabel("");
          setCategoryFilter("");
          setBrandFilter("");
          setGenderFilter("");
          setSizeFilter("");
          navigate("/");
        }} />
      )}

      {isHome && <Banner />}

      {!isHome && (
        <div>
          <FilterBar
            submenuList={submenuList}
            sizeFilter={sizeFilter}
            brandFilter={brandFilter}
            genderFilter={genderFilter}
            genderOptions={genderOptions}
            allSizes={sizesInFilter}
            allBrands={brandsInFilter}
            forceOpenCategory={forceOpenCategory}
            setForceOpenCategory={setForceOpenCategory}
            clearFilters={clearFilters}
            showGender={showGenderOption}
            showCategory={!!mainCategoryKey}
            onCategoryChange={setCategoryFilter}   // подкатегория!
            onBrandChange={setBrandFilter}
            onSizeChange={setSizeFilter}
            onGenderChange={setGenderFilter}
          />
          <div>
            <SortControl sort={sort} setSort={setSort} />
          </div>
        </div>
      )}

      <div className="mx-auto px-2 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-2">
          {displayedProducts.length > 0 ? (
            displayedProducts.map(product => (
              <ProductCard
                key={product.id || product.name + product.color}
                product={product}
                onClick={() => handleCardClick(product.id)}
              />
            ))
          ) : (
            <div className="col-span-5 text-center text-gray-500 py-12">
              No products to display
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center text-gray-600 py-4">Loading more products...</div>
        )}

        {!hasMore && !isLoading && !isHome && (
          <div className="text-center text-gray-600 py-4">No more products</div>
        )}
      </div>

      <Footer />
    </>
  );
}
