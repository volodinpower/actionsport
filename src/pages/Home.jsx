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

  // URL params
  const urlSearchParams = new URLSearchParams(location.search);
  const urlSearch = urlSearchParams.get("search") || "";

  // Категории (из API)
  const [categories, setCategories] = useState([]);

  // Фильтры и состояние
  const [categoryKey, setCategoryKey] = useState("");      // выбранная категория (главное меню)
  const [categoryLabel, setCategoryLabel] = useState("");  // её подпись
  const [subcategoryKey, setSubcategoryKey] = useState(""); // подкатегория (если выбрана)

  // breadcrumbs: [{label, query}], всегда Main / Категория
  const breadcrumbs = useMemo(() => {
    if (urlSearch) {
      return [
        { label: "Main", query: "" },
        { label: `Search: ${urlSearch}`, query: urlSearch }
      ];
    }
    if (categoryKey) {
      return [
        { label: "Main", query: "" },
        { label: categoryLabel || categoryKey, query: categoryKey }
      ];
    }
    return [{ label: "Main", query: "" }];
  }, [urlSearch, categoryKey, categoryLabel]);

  // Селекторные фильтры
  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

  // Для товара
  const [rawProducts, setRawProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [sort, setSort] = useState("");

  // HOME-проверка
  const isHome = useMemo(
    () => !urlSearch && !categoryKey && !brandFilter && !genderFilter && !sizeFilter,
    [urlSearch, categoryKey, brandFilter, genderFilter, sizeFilter]
  );

  // Filters для API
  const filters = useMemo(() => ({
    query: urlSearch,
    categoryKey,
    subcategoryKey,
    brand: brandFilter,
    gender: genderFilter,
    size: sizeFilter,
  }), [urlSearch, categoryKey, subcategoryKey, brandFilter, genderFilter, sizeFilter]);

  // --- Категории ---
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // --- Фильтры для селекторов ---
  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);

  useEffect(() => {
    async function updateOptions() {
      try {
        setBrandsInFilter(await fetchFilteredBrands(filters));
        setSizesInFilter(await fetchFilteredSizes(filters));
        setGendersInFilter(await fetchFilteredGenders(filters));
      } catch {}
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
    } catch {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isLoading, rawProducts, isHome, products.length]);

  // Сброс данных при смене фильтра/поиска/категории
  useEffect(() => {
    setRawProducts([]);
    setProducts([]);
    setHasMore(true);
    loadProducts({ reset: true });
    // eslint-disable-next-line
  }, [filters, isHome]);

  // --- Пагинация при скролле ---
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

  // --- Основной поиск и обработка кликов меню/поиска ---
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    setCategoryKey(catKey);
    setCategoryLabel(catLabel);
    setSubcategoryKey(subKey);
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setForceOpenCategory(!!subKey);
    // Breadcrumbs — только Main/Категория!
    navigate("/");
  };

  const handleSearch = (
    query = "",
    crumbs = [{ label: "Main", query: "", exclude: "" }],
    _exclude = "",
    _brand = "",
    _category = "",
    _subcategory = "",
    _gender = "",
    _size = ""
  ) => {
    // Поиск всегда Main / Search: query
    setCategoryKey("");
    setCategoryLabel("");
    setSubcategoryKey("");
    setBrandFilter("");
    setGenderFilter("");
    setSizeFilter("");
    setForceOpenCategory(false);
    navigate(query ? `/?search=${encodeURIComponent(query)}` : "/");
  };

  // FilterBar — только подкатегории, НЕ меняет хлебные крошки!
  const onCategoryChange = (newSubKey) => {
    setSubcategoryKey(newSubKey);
    setForceOpenCategory(false);
  };
  const onBrandChange = setBrandFilter;
  const onSizeChange = setSizeFilter;
  const onGenderChange = setGenderFilter;

  // Сброс фильтров (но не breadcrumbs)
  const clearFilters = () => {
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setSubcategoryKey("");
    setForceOpenCategory(false);
  };

  // Список подкатегорий для FilterBar
  const submenuList = useMemo(() => {
    let cat = categories.find(c => c.category_key === categoryKey);
    if (!cat) return [];
    return (cat.subcategories || []).map(sub =>
      typeof sub === "string" ? sub : sub.subcategory_key || sub.label
    );
  }, [categories, categoryKey]);

  // Для сортировки
  const getEffectivePrice = (item) => {
    const fix = val => {
      if (val == null) return Infinity;
      if (typeof val === "number") return val;
      const str = String(val).replace(/\s| /g, "").replace(",", ".").replace(/[^0-9.]/g, "");
      const n = Number(str);
      return isNaN(n) ? Infinity : n;
    };
    const discount = fix(item.discount_price);
    const price = fix(item.price);
    return discount > 0 ? discount : price;
  };

  const displayedProducts = useMemo(() => {
    let arr = [...products];
    if (sort === "asc") arr.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    else if (sort === "desc") arr.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    else if (sort === "popular") arr.sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (sort === "discount") arr.sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0));
    return arr;
  }, [products, sort]);

  // Карточка товара
  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`);
  };

  // Breadcrumbs клик
  const handleBreadcrumbClick = idx => {
    // Main всегда первый
    if (idx === 0) {
      setCategoryKey("");
      setCategoryLabel("");
      setSubcategoryKey("");
      setBrandFilter("");
      setGenderFilter("");
      setSizeFilter("");
      setForceOpenCategory(false);
      navigate("/");
    }
  };

  // Рендер
  return (
    <>
      <Header
        onSearch={handleSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={isHome}
        setCategoryFilter={setSubcategoryKey}
        setForceOpenCategory={setForceOpenCategory}
        navigate={navigate}
      />

      {!isHome && (
        <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
      )}

      {isHome && <Banner />}

      {!isHome && (
        <div>
          <FilterBar
            allSizes={sizesInFilter}
            allBrands={brandsInFilter}
            submenuList={submenuList}
            sizeFilter={sizeFilter}
            brandFilter={brandFilter}
            genderFilter={genderFilter}
            categoryFilter={subcategoryKey}
            genderOptions={gendersInFilter.map(g => ({
              value: g,
              label: g === "m" ? "Men" : g === "w" ? "Women" : g === "k" ? "Kids" : g
            }))}
            forceOpenCategory={forceOpenCategory}
            setForceOpenCategory={setForceOpenCategory}
            clearFilters={clearFilters}
            showGender={gendersInFilter.length > 1 || !!genderFilter}
            showCategory={!!categoryKey && categoryKey !== "sale"}
            onCategoryChange={onCategoryChange}
            onBrandChange={onBrandChange}
            onSizeChange={onSizeChange}
            onGenderChange={onGenderChange}
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
