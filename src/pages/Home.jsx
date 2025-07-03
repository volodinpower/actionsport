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

function getColumnsCount() {
  const width = window.innerWidth;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
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

  // --- Query параметры
  const urlSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [categoryLabel, setCategoryLabel] = useState("");

  const searchQuery = urlSearchParams.get("search") || "";
  const categoryKey = urlSearchParams.get("category") || "";
  const subcategoryKey = urlSearchParams.get("subcategory") || "";
  const sizeFilter = urlSearchParams.get("size") || "";
  const brandFilter = urlSearchParams.get("brand") || "";
  const genderFilter = urlSearchParams.get("gender") || "";
  const sort = urlSearchParams.get("sort") || "";

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

      // Бренды (без текущего бренда)
      const brandsFilters = { ...filters, categoryKey: realCategoryKey, subcategoryKey: realSubcategoryKey };
      delete brandsFilters.brand;
      setBrandsInFilter(await fetchFilteredBrands(brandsFilters));

      // Размеры (без текущего размера)
      const sizesFilters = { ...filters, categoryKey: realCategoryKey, subcategoryKey: realSubcategoryKey };
      delete sizesFilters.size;
      setSizesInFilter(await fetchFilteredSizes(sizesFilters));

      // Пол (без текущего пола)
      const gendersFilters = { ...filters, categoryKey: realCategoryKey, subcategoryKey: realSubcategoryKey };
      delete gendersFilters.gender;
      setGendersInFilter(await fetchFilteredGenders(gendersFilters));
    }
    updateOptions();
  }, [filters, categories]);

  // --- isHome ---
  const isHome = useMemo(
    () => !searchQuery && !categoryKey && !brandFilter && !genderFilter && !sizeFilter,
    [searchQuery, categoryKey, brandFilter, genderFilter, sizeFilter]
  );

  // --- Колонки ---
  const [columns, setColumns] = useState(getColumnsCount());
  useEffect(() => {
    function handleResize() {
      setColumns(getColumnsCount());
    }
    window.addEventListener("resize", handleResize);
    handleResize(); // Обновить при монтировании
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Сброс при смене фильтров ---
  const prevFilterKey = useRef("");
  function getFilterKey() {
    return JSON.stringify([filters, sort, isHome]);
  }

  // --- Пагинация ---
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Сброс при смене фильтров/категорий
  useEffect(() => {
    if (prevFilterKey.current !== getFilterKey()) {
      setProducts([]);
      setOffset(0);
      setHasMore(true);
      prevFilterKey.current = getFilterKey();
    }
  }, [filters, sort, isHome]);

  // --- Подгрузка товаров ---
  const loadProducts = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      let newProducts = [];
      if (isHome) {
        // Для главной — не делаем скролл, просто ровно один раз
        newProducts = await fetchPopularProducts(LIMIT * columns);
        setProducts(groupProducts(newProducts));
        setHasMore(false);
      } else {
        newProducts = await fetchProducts(
          filters.categoryKey === "sale" ? "" : filters.query,
          LIMIT,
          offset,
          "",
          filters.brand,
          sort || "asc",
          filters.categoryKey,
          filters.subcategoryKey,
          filters.gender,
          filters.size
        );
        setProducts(prev => [...prev, ...groupProducts(newProducts)]);
        setHasMore(newProducts.length === LIMIT);
        setOffset(prev => prev + LIMIT);
      }
    } catch (e) {
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line
  }, [filters, sort, offset, columns, isHome, hasMore, isLoading]);

  // --- Инициализация и подгрузка при скролле ---
  useEffect(() => {
    if (isHome && products.length === 0) {
      loadProducts();
      return;
    }
    if (!isHome && offset === 0) {
      loadProducts();
    }
    // eslint-disable-next-line
  }, [filters, sort, isHome, columns]);

  useEffect(() => {
    if (isHome) return;
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 400 && hasMore && !isLoading) {
        loadProducts();
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadProducts, hasMore, isLoading, isHome]);

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

  // --- UI-хэндлеры ---
  function updateUrlFilters(newFilters = {}) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({
      search: "",
      category: "",
      subcategory: "",
      size: "",
      brand: "",
      gender: "",
      sort: "",
      ...newFilters
    })) {
      if (value) params.set(key, value);
    }
    navigate({ pathname: "/", search: params.toString() });
  }

  const handleSearch = (query = "") => updateUrlFilters({ search: query });

  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    setCategoryLabel(catLabel || "");
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

  const onCategoryChange = (subKey) =>
    updateUrlFilters({
      category: categoryKey,
      subcategory: subKey,
      brand: "",
      size: "",
      gender: "",
      sort: "",
    });

  const onBrandChange = (brand) => updateUrlFilters({ ...getCurrentFilters(), brand });
  const onSizeChange = (size) => updateUrlFilters({ ...getCurrentFilters(), size });
  const onGenderChange = (gender) => updateUrlFilters({ ...getCurrentFilters(), gender });
  const onSortChange = (s) => updateUrlFilters({ ...getCurrentFilters(), sort: s });

  const clearFilters = () =>
    updateUrlFilters({
      search: "",
      category: "",
      subcategory: "",
      size: "",
      brand: "",
      gender: "",
      sort: ""
    });

  function getCurrentFilters() {
    return {
      search: searchQuery,
      category: categoryKey,
      subcategory: subcategoryKey,
      size: sizeFilter,
      brand: brandFilter,
      gender: genderFilter,
      sort: sort,
    };
  }

  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`, {
      state: { from: location.pathname + location.search }
    });
  };

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

  // --- Рендер ---
  return (
    <>
      <Header
        onSearch={handleSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={isHome}
        setCategoryFilter={() => {}}
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
              {isLoading ? "Loading..." : "No products to display"}
            </div>
          )}
        </div>
        {/* Infinity Loader */}
        {!isHome && isLoading && (
          <div className="text-center py-6 text-lg text-gray-400">Loading...</div>
        )}
        {!isHome && !hasMore && products.length > 0 && (
          <div className="text-center py-6 text-gray-400">— Конец списка —</div>
        )}
      </div>
      <Footer />
    </>
  );
}
