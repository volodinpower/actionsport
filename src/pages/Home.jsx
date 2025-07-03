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

const PAGE_LIMIT = 20;

function getColumnsCount() {
  const width = window.innerWidth;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}
function getHomeLimit(cols) {
  if (cols === 5) return 20;
  if (cols === 4) return 20;
  if (cols === 3) return 18;
  return 10;
}
function groupProducts(rawProducts) {
  return rawProducts.map(p => ({
    ...p,
    sizes: Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : [],
  }));
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  // Парсим параметры из URL
  const urlSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const searchQuery = urlSearchParams.get("search") || "";
  const categoryKey = urlSearchParams.get("category") || "";
  const subcategoryKey = urlSearchParams.get("subcategory") || "";
  const sizeFilter = urlSearchParams.get("size") || "";
  const brandFilter = urlSearchParams.get("brand") || "";
  const genderFilter = urlSearchParams.get("gender") || "";
  const sort = urlSearchParams.get("sort") || "";

  const isHome = useMemo(
    () => !searchQuery && !categoryKey && !brandFilter && !genderFilter && !sizeFilter,
    [searchQuery, categoryKey, brandFilter, genderFilter, sizeFilter]
  );

  // Колонки и лимит для главной
  const [columns, setColumns] = useState(getColumnsCount());
  const [homeLimit, setHomeLimit] = useState(getHomeLimit(getColumnsCount()));
  useEffect(() => {
    function handleResize() {
      const cols = getColumnsCount();
      setColumns(cols);
      setHomeLimit(getHomeLimit(cols));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- State для карточек ---
  const [products, setProducts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // --- Категории ---
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // --- FilterBar списки ---
  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);

  // Параметры для получения фильтров (без search)
  const filtersForOptions = useMemo(() => {
    let realCategoryKey = categoryKey;
    if (subcategoryKey) realCategoryKey = "";
    return {
      categoryKey: realCategoryKey,
      subcategoryKey,
      gender: genderFilter,
      size: sizeFilter,
      search: "", // не учитываем поиск при обновлении опций фильтров
    };
  }, [categoryKey, subcategoryKey, genderFilter, sizeFilter]);

  // Обновляем фильтры в боксе при изменении зависимостей
  useEffect(() => {
    async function updateOptions() {
      const brandsFilters = { ...filtersForOptions };
      delete brandsFilters.brand;
      setBrandsInFilter(await fetchFilteredBrands(brandsFilters));
      setSizesInFilter(await fetchFilteredSizes(filtersForOptions));
      setGendersInFilter(await fetchFilteredGenders(filtersForOptions));
    }
    updateOptions();
  }, [filtersForOptions, categories]);

  // Сбрасываем offset при изменении параметров фильтрации (search, category, subcategory, brand, size, gender, sort)
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
  }, [searchQuery, categoryKey, subcategoryKey, sizeFilter, brandFilter, genderFilter, sort]);

  // --- Загрузка товаров ---
  const loadProducts = useCallback(async () => {
    if (isHome) {
      setIsLoading(true);
      try {
        const raw = await fetchPopularProducts(homeLimit, 0);
        setProducts(groupProducts(raw));
        setHasMore(false);
      } catch {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (isLoading || !hasMore) return;
      setIsLoading(true);
      try {
        const raw = await fetchProducts(
          searchQuery,
          PAGE_LIMIT,
          offset,
          "",
          brandFilter,
          sort || "asc",
          categoryKey,
          subcategoryKey,
          genderFilter,
          sizeFilter
        );
        const grouped = groupProducts(raw);
        setProducts(prev =>
          offset === 0 ? grouped : [...prev, ...grouped]
        );
        setHasMore(grouped.length === PAGE_LIMIT);
      } catch {
        if (offset === 0) setProducts([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    }
  }, [
    searchQuery,
    categoryKey,
    subcategoryKey,
    sizeFilter,
    brandFilter,
    genderFilter,
    sort,
    offset,
    hasMore,
    isLoading,
    isHome,
    homeLimit,
  ]);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line
  }, [offset, searchQuery, categoryKey, subcategoryKey, sizeFilter, brandFilter, genderFilter, sort, isHome, homeLimit]);

  // --- Infinite scroll только для каталога ---
  useEffect(() => {
    if (isHome) return;
    if (!hasMore || isLoading) return;
    function onScroll() {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 600
      ) {
        if (!isLoading && hasMore) setOffset(prev => prev + PAGE_LIMIT);
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome, hasMore, isLoading]);

  // --- Подкатегории ---
  const submenuList = useMemo(() => {
    let cat = categories.find(c => c.category_key === categoryKey);
    if (!cat) return [];
    return (cat.subcategories || []).map(sub =>
      typeof sub === "string" ? sub : sub.subcategory_key || sub.label
    );
  }, [categories, categoryKey]);

  // --- Сортировка ---
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

  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`, {
      state: { from: location.pathname + location.search }
    });
  };

  // --- Управление URL фильтрами ---
  function updateUrlFilters(newFilters = {}) {
    const params = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(newFilters)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    navigate({ pathname: "/", search: params.toString() });
  }

  // Обработчики для фильтров
  const handleSearch = (query = "") => {
    updateUrlFilters({ search: query });
  };
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    updateUrlFilters({
      category: catKey,
      subcategory: subKey || "",
      search: "",
      brand: "",
      size: "",
      gender: "",
      sort: "",
    });
  };
  const onCategoryChange = (subKey) => updateUrlFilters({ subcategory: subKey });
  const onBrandChange = (brand) => updateUrlFilters({ brand });
  const onSizeChange = (size) => updateUrlFilters({ size });
  const onGenderChange = (gender) => updateUrlFilters({ gender });
  const onSortChange = (sortValue) => updateUrlFilters({ sort: sortValue });

  function clearFilters() {
    navigate({ pathname: "/" });
  }

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
    if (idx === 0) {
      clearFilters();
    }
  };

  return (
    <>
      <Header
        onSearch={handleSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={isHome}
        setCategoryFilter={() => { }}
        setForceOpenCategory={() => { }}
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
            setForceOpenCategory={() => { }}
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
              {isLoading ? "Loading..." : "No products to display"}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
