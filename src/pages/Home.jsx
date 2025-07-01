import { useEffect, useState, useMemo, useCallback, useRef } from "react";
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
  const [categoryKey, setCategoryKey] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [subcategoryKey, setSubcategoryKey] = useState("");

  // Для контроля предыдущих фильтров (чтобы не вызывать loadProducts без смысла)
  const prevFiltersRef = useRef({});

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
      let realCategoryKey = filters.categoryKey;
      let realSubcategoryKey = filters.subcategoryKey;
      if (realSubcategoryKey) realCategoryKey = "";
      try {
        setBrandsInFilter(await fetchFilteredBrands({
          categoryKey: realCategoryKey,
          subcategoryKey: realSubcategoryKey,
          gender: filters.gender,
          size: filters.size,
          search: filters.query,
        }));
        setSizesInFilter(await fetchFilteredSizes({
          categoryKey: realCategoryKey,
          subcategoryKey: realSubcategoryKey,
          brand: filters.brand,
          gender: filters.gender,
          search: filters.query,
        }));
        setGendersInFilter(await fetchFilteredGenders({
          categoryKey: realCategoryKey,
          subcategoryKey: realSubcategoryKey,
          brand: filters.brand,
          size: filters.size,
          search: filters.query,
        }));
      } catch { /* no-op */ }
    }
    updateOptions();
  }, [filters, categories]);

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

  // Сброс данных при смене фильтра/поиска/категории (только если фильтры реально изменились)
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const curr = {
      query: filters.query,
      categoryKey: filters.categoryKey,
      subcategoryKey: filters.subcategoryKey,
      brand: filters.brand,
      gender: filters.gender,
      size: filters.size,
    };

    const isEqual = JSON.stringify(prev) === JSON.stringify(curr);

    if (!isEqual) {
      prevFiltersRef.current = curr;
      setRawProducts([]);
      setProducts([]);
      setHasMore(true);
      loadProducts({ reset: true });
    }
  }, [filters, isHome, loadProducts]);

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

  // --- Определяем количество колонок в сетке по ширине экрана ---
  const columnsCount = useMemo(() => {
    const width = window.innerWidth;
    if (width >= 1280) return 5;
    if (width >= 1024) return 4;
    if (width >= 768) return 3;
    if (width >= 640) return 2;
    return 2;
  }, []);

  // --- Добавляем пустые карточки для ровного последнего ряда ---
  const displayedProductsWithFiller = useMemo(() => {
    const productsCount = products.length;
    const remainder = productsCount % columnsCount;
    if (remainder === 0) return products;
    const fillersCount = columnsCount - remainder;
    const fillers = new Array(fillersCount).fill(null);
    return [...products, ...fillers];
  }, [products, columnsCount]);

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

  const displayedSortedProducts = useMemo(() => {
    let arr = [...displayedProductsWithFiller];
    if (sort === "asc") arr.sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return getEffectivePrice(a) - getEffectivePrice(b);
    });
    else if (sort === "desc") arr.sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return getEffectivePrice(b) - getEffectivePrice(a);
    });
    else if (sort === "popular") arr.sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return (b.views || 0) - (a.views || 0);
    });
    else if (sort === "discount") arr.sort((a, b) => {
      if (!a) return 1;
      if (!b) return -1;
      return (Number(b.discount) || 0) - (Number(a.discount) || 0);
    });
    return arr;
  }, [displayedProductsWithFiller, sort]);

  // Карточка товара
  const handleCardClick = (productId) => {
    if (!productId) return;
    navigate(`/product/${productId}`);
  };

  // Breadcrumbs клик
  const handleBreadcrumbClick = idx => {
    if (idx === 0) {
      setCategoryKey("");
      setCategoryLabel("");
      setSubcategoryKey("");
      setBrandFilter("");
      setGenderFilter("");
      setSizeFilter("");
      setForceOpenCategory(false);
      // Только навигация если не на главной
      if (location.pathname !== "/" || location.search !== "") {
        navigate("/");
      }
    }
  };

  // Основной поиск и меню
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    setCategoryKey(catKey);
    setCategoryLabel(catLabel);
    setSubcategoryKey(subKey);
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setForceOpenCategory(!!subKey);

    // Переход только если URL с поиском
    if (urlSearch) {
      navigate("/");
    }
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
    setCategoryKey("");
    setCategoryLabel("");
    setSubcategoryKey("");
    setBrandFilter("");
    setGenderFilter("");
    setSizeFilter("");
    setForceOpenCategory(false);

    navigate(query ? `/?search=${encodeURIComponent(query)}` : "/");
  };

  // FilterBar handlers
  const onCategoryChange = (newSubKey) => {
    setSubcategoryKey(newSubKey);
    setForceOpenCategory(false);
  };
  const onBrandChange = setBrandFilter;
  const onSizeChange = setSizeFilter;
  const onGenderChange = setGenderFilter;

  // Сброс фильтров
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
          {displayedSortedProducts.length > 0 ? (
            displayedSortedProducts.map((product, idx) =>
              product ? (
                <ProductCard
                  key={product.id || product.name + product.color}
                  product={product}
                  onClick={() => handleCardClick(product.id)}
                />
              ) : (
                <div key={"filler-" + idx} className="product-card product-card--filler" />
              )
            )
          ) : (
            <div className="col-span-5 text-center text-gray-500 py-12">
              No products to display
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
