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

const PAGE_LIMIT = 20;

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

  const urlSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [categoryLabel, setCategoryLabel] = useState("");

  const searchQuery = urlSearchParams.get("search") || "";
  const categoryKey = urlSearchParams.get("category") || "";
  const subcategoryKey = urlSearchParams.get("subcategory") || "";
  const sizeFilter = urlSearchParams.get("size") || "";
  const brandFilter = urlSearchParams.get("brand") || "";
  const genderFilter = urlSearchParams.get("gender") || "";
  const sort = urlSearchParams.get("sort") || "";

  // State для инфинит-скролла
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

  const filters = useMemo(() => ({
    query: searchQuery,
    categoryKey,
    subcategoryKey,
    brand: brandFilter,
    gender: genderFilter,
    size: sizeFilter,
  }), [searchQuery, categoryKey, subcategoryKey, brandFilter, genderFilter, sizeFilter]);

  // Для сброса offset/products только при смене фильтра или сортировки
  const prevFilters = useRef();
  useEffect(() => {
    const key = JSON.stringify(filters) + sort;
    if (prevFilters.current !== key) {
      setProducts([]);
      setOffset(0);
      setHasMore(true);
    }
    prevFilters.current = key;
  }, [filters, sort]);

  useEffect(() => {
    async function updateOptions() {
      let realCategoryKey = filters.categoryKey;
      let realSubcategoryKey = filters.subcategoryKey;
      if (realSubcategoryKey) realCategoryKey = "";
      const brandsFilters = { ...filters, categoryKey: realCategoryKey, subcategoryKey: realSubcategoryKey };
      delete brandsFilters.brand;
      setBrandsInFilter(await fetchFilteredBrands(brandsFilters));
      const sizesFilters = { ...filters, categoryKey: realCategoryKey, subcategoryKey: realSubcategoryKey };
      delete sizesFilters.size;
      setSizesInFilter(await fetchFilteredSizes(sizesFilters));
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

  // --- Загрузка товаров (странично!) ---
  const loadProducts = useCallback(async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      let raw = [];
      if (isHome) {
        raw = await fetchPopularProducts(PAGE_LIMIT, offset);
      } else {
        raw = await fetchProducts(
          filters.query,
          PAGE_LIMIT,
          offset,
          "",
          filters.brand,
          sort || "asc",
          filters.categoryKey,
          filters.subcategoryKey,
          filters.gender,
          filters.size
        );
      }
      const grouped = groupProducts(raw);
      setProducts(prev =>
        offset === 0 ? grouped : [...prev, ...grouped]
      );
      setHasMore(grouped.length === PAGE_LIMIT);
    } catch (e) {
      if (offset === 0) setProducts([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [
    filters, isHome, sort, offset, hasMore, isLoading
  ]);

  // Загружаем товары при первом рендере и смене offset (или фильтров)
  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line
  }, [offset, filters, isHome, sort]);

  // --- Infinite scroll ---
  useEffect(() => {
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
  }, [hasMore, isLoading]);

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

  // --- Для управления фильтрами (все твои функции сохранены) ---
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
  function clearFilters() {
    updateUrlFilters({
      search: "",
      category: "",
      subcategory: "",
      size: "",
      brand: "",
      gender: "",
      sort: ""
    });
  }
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
      setProducts([]);
      setOffset(0);
      setHasMore(true);
      clearFilters();
    }
  };

  // --- Render ---
  return (
    <>
      <Header
        onSearch={(q) => {
          setProducts([]);
          setOffset(0);
          setHasMore(true);
          handleSearch(q);
        }}
        onMenuCategoryClick={(...args) => {
          setProducts([]);
          setOffset(0);
          setHasMore(true);
          handleMenuCategoryClick(...args);
        }}
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
            clearFilters={() => {
              setProducts([]);
              setOffset(0);
              setHasMore(true);
              clearFilters();
            }}
            showGender={gendersInFilter.length > 1 || !!genderFilter}
            showCategory={!!categoryKey && categoryKey !== "sale"}
            onCategoryChange={(sub) => {
              setProducts([]);
              setOffset(0);
              setHasMore(true);
              onCategoryChange(sub);
            }}
            onBrandChange={(brand) => {
              setProducts([]);
              setOffset(0);
              setHasMore(true);
              onBrandChange(brand);
            }}
            onSizeChange={(size) => {
              setProducts([]);
              setOffset(0);
              setHasMore(true);
              onSizeChange(size);
            }}
            onGenderChange={(g) => {
              setProducts([]);
              setOffset(0);
              setHasMore(true);
              onGenderChange(g);
            }}
          />
          <div>
            <SortControl sort={sort} setSort={(s) => {
              setProducts([]);
              setOffset(0);
              setHasMore(true);
              onSortChange(s);
            }} />
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
        {isLoading && (
          <div className="text-center text-gray-400 py-4">Loading more...</div>
        )}
        {!hasMore && (
          <div className="text-center text-gray-400 py-4">End of list</div>
        )}
      </div>
      <Footer />
    </>
  );
}
