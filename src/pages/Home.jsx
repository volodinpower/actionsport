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

function getColumnsCount() {
  const width = window.innerWidth;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  if (width >= 640) return 2;
  return 2;
}
function getLimitByColumns(columns) {
  return columns === 3 ? 21 : 20;
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- Фильтры и поиск из query-параметров ---
  const urlSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [searchQuery, setSearchQuery] = useState(urlSearchParams.get("search") || "");
  const [categoryKey, setCategoryKey] = useState(urlSearchParams.get("category") || "");
  const [subcategoryKey, setSubcategoryKey] = useState(urlSearchParams.get("subcategory") || "");
  const [sizeFilter, setSizeFilter] = useState(urlSearchParams.get("size") || "");
  const [brandFilter, setBrandFilter] = useState(urlSearchParams.get("brand") || "");
  const [genderFilter, setGenderFilter] = useState(urlSearchParams.get("gender") || "");
  const [sort, setSort] = useState(urlSearchParams.get("sort") || "");
  const [categoryLabel, setCategoryLabel] = useState(""); // можно тянуть из categories

  // --- Синхронизация фильтров с URL ---
  useEffect(() => {
    setSearchQuery(urlSearchParams.get("search") || "");
    setCategoryKey(urlSearchParams.get("category") || "");
    setSubcategoryKey(urlSearchParams.get("subcategory") || "");
    setSizeFilter(urlSearchParams.get("size") || "");
    setBrandFilter(urlSearchParams.get("brand") || "");
    setGenderFilter(urlSearchParams.get("gender") || "");
    setSort(urlSearchParams.get("sort") || "");
  }, [location.search]);

  // --- Обновление URL при смене фильтра ---
  function updateUrlFilters(newFilters = {}) {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(newFilters)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    navigate({ pathname: "/", search: params.toString() }, { replace: false });
  }

  // --- Filter handlers ---
  const handleSearch = (query = "") => updateUrlFilters({ search: query });
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") =>
    updateUrlFilters({ category: catKey, subcategory: subKey || "" });
  const onCategoryChange = (subKey) => updateUrlFilters({ subcategory: subKey });
  const onBrandChange = (brand) => updateUrlFilters({ brand });
  const onSizeChange = (size) => updateUrlFilters({ size });
  const onGenderChange = (gender) => updateUrlFilters({ gender });
  const onSortChange = (s) => updateUrlFilters({ sort: s });
  const clearFilters = () =>
    updateUrlFilters({
      search: "",
      category: "",
      subcategory: "",
      size: "",
      brand: "",
      gender: "",
      sort: "",
    });

  // --- Категории ---
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // --- FilterBar списки ---
  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);

  const filters = useMemo(() => ({
    query: searchQuery,
    categoryKey,
    subcategoryKey,
    brand: brandFilter,
    gender: genderFilter,
    size: sizeFilter,
  }), [searchQuery, categoryKey, subcategoryKey, brandFilter, genderFilter, sizeFilter]);

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

  // --- Считаем число колонок и лимит ---
  const [limit, setLimit] = useState(() => {
    const initialColumns = getColumnsCount();
    return getLimitByColumns(initialColumns);
  });
  useEffect(() => {
    function updateLimit() {
      const columns = getColumnsCount();
      setLimit(getLimitByColumns(columns));
    }
    updateLimit();
    window.addEventListener("resize", updateLimit);
    return () => window.removeEventListener("resize", updateLimit);
  }, []);

  // --- Логика isHome ---
  const isHome = useMemo(
    () => !searchQuery && !categoryKey && !brandFilter && !genderFilter && !sizeFilter,
    [searchQuery, categoryKey, brandFilter, genderFilter, sizeFilter]
  );

  // --- Загрузка товаров ---
  const [rawProducts, setRawProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

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

  // --- Сброс данных при смене фильтра/поиска/категории ---
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

  // --- Подкатегории ---
  const submenuList = useMemo(() => {
    let cat = categories.find(c => c.category_key === categoryKey);
    if (!cat) return [];
    return (cat.subcategories || []).map(sub =>
      typeof sub === "string" ? sub : sub.subcategory_key || sub.label
    );
  }, [categories, categoryKey]);

  // --- Для сортировки ---
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

  // --- Переход к карточке товара (отправляем from для возврата!) ---
  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`, {
      state: { from: location.pathname + location.search }
    });
  };

  // --- Хлебные крошки ---
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

  const handleBreadcrumbClick = idx => {
    if (idx === 0) clearFilters();
  };

  // --- render ---
  return (
    <>
      <Header
        onSearch={handleSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={isHome}
        setCategoryFilter={setSubcategoryKey}
        setForceOpenCategory={() => {}}
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
            forceOpenCategory={false}
            setForceOpenCategory={() => {}}
            clearFilters={clearFilters}
            showGender={gendersInFilter.length > 1 || !!genderFilter}
            showCategory={!!categoryKey && categoryKey !== "sale"}
            onCategoryChange={onCategoryChange}
            onBrandChange={onBrandChange}
            onSizeChange={onSizeChange}
            onGenderChange={onGenderChange}
          />
          <div>
            <SortControl sort={sort} setSort={onSortChange} />
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
      </div>
      <Footer />
    </>
  );
}
