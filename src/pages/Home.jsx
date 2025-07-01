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

  // --- Новый локальный state для поиска ---
  const [searchQuery, setSearchQuery] = useState("");

  // Категории (из API)
  const [categories, setCategories] = useState([]);
  const [categoryKey, setCategoryKey] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  const [subcategoryKey, setSubcategoryKey] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

  const [rawProducts, setRawProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [sort, setSort] = useState("");

  // Лимит по умолчанию
  const [limit, setLimit] = useState(20);

  // Следим за изменением ширины экрана и меняем лимит
  useEffect(() => {
    function updateLimit() {
      const width = window.innerWidth;
      let columns;
      if (width >= 1280) columns = 5;
      else if (width >= 1024) columns = 4;
      else if (width >= 768) columns = 3;
      else if (width >= 640) columns = 2;
      else columns = 2;

      // Если 3 карточки в ряд, показываем 21
      if (columns === 3) setLimit(21);
      else setLimit(20);
    }
    updateLimit();
    window.addEventListener("resize", updateLimit);
    return () => window.removeEventListener("resize", updateLimit);
  }, []);

  // Новый isHome, основанный на searchQuery и фильтрах
  const isHome = useMemo(
    () => !searchQuery && !categoryKey && !brandFilter && !genderFilter && !sizeFilter,
    [searchQuery, categoryKey, brandFilter, genderFilter, sizeFilter]
  );

  // --- Формируем breadcrumbs ---
  const breadcrumbs = useMemo(() => {
    if (searchQuery) {
      return [
        { label: "Main", query: "" },
        { label: `Search: ${searchQuery}`, query: searchQuery }
      ];
    }
    if (categoryKey) {
      return [
        { label: "Main", query: "" },
        { label: categoryLabel || categoryKey, query: categoryKey }
      ];
    }
    return [{ label: "Main", query: "" }];
  }, [searchQuery, categoryKey, categoryLabel]);

  // --- filters для API ---
  const filters = useMemo(() => ({
    query: searchQuery,
    categoryKey,
    subcategoryKey,
    brand: brandFilter,
    gender: genderFilter,
    size: sizeFilter,
  }), [searchQuery, categoryKey, subcategoryKey, brandFilter, genderFilter, sizeFilter]);

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
      let rawLimit = limit * RAW_FETCH_MULTIPLIER;
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
      const showCount = reset ? limit : products.length + limit;
      const paged = grouped.slice(0, showCount);

      setProducts(paged);
      setHasMore(fetchedRaw.length === rawLimit);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [filters, isLoading, rawProducts, isHome, products.length, limit]);

  // --- Сброс данных при смене фильтра/поиска/категории
  useEffect(() => {
    setRawProducts([]);
    setProducts([]);
    setHasMore(true);
    loadProducts({ reset: true });
    // eslint-disable-next-line
  }, [filters, isHome, limit]);

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

  // Остальной код — без изменений, рендер, обработчики и т.д.

  // Определяем список подкатегорий для FilterBar
  const submenuList = useMemo(() => {
    let cat = categories.find(c => c.category_key === categoryKey);
    if (!cat) return [];
    return (cat.subcategories || []).map(sub =>
      typeof sub === "string" ? sub : sub.subcategory_key || sub.label
    );
  }, [categories, categoryKey]);

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

  const displayedProductsSorted = useMemo(() => {
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

  // Клик по хлебным крошкам
  const handleBreadcrumbClick = idx => {
    if (idx === 0) {
      setCategoryKey("");
      setCategoryLabel("");
      setSubcategoryKey("");
      setBrandFilter("");
      setGenderFilter("");
      setSizeFilter("");
      setForceOpenCategory(false);
      setSearchQuery("");
      navigate("/");
    }
  };

  // Обработчики меню и поиска
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    setCategoryKey(catKey);
    setCategoryLabel(catLabel);
    setSubcategoryKey(subKey || "");
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setForceOpenCategory(!!subKey);
    setSearchQuery(""); // сбрасываем поиск при выборе категории
    navigate("/");
  };

  const handleSearch = (query = "") => {
    setCategoryKey("");
    setCategoryLabel("");
    setSubcategoryKey("");
    setBrandFilter("");
    setGenderFilter("");
    setSizeFilter("");
    setForceOpenCategory(false);
    setSearchQuery(query);
    navigate(query ? `/?search=${encodeURIComponent(query)}` : "/");
  };

  // FilterBar
  const onCategoryChange = (newSubKey) => {
    setSubcategoryKey(newSubKey);
    setForceOpenCategory(false);
  };
  const onBrandChange = setBrandFilter;
  const onSizeChange = setSizeFilter;
  const onGenderChange = setGenderFilter;

  const clearFilters = () => {
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setSubcategoryKey("");
    setForceOpenCategory(false);
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
          <SortControl sort={sort} setSort={setSort} />
        </div>
      )}

      <div className="mx-auto px-2 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-2">
          {displayedProductsSorted.length > 0 ? (
            displayedProductsSorted.map(product => (
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
      </div>
      <Footer />
    </>
  );
}
