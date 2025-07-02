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

  // Флаг, что мы уже восстановили фильтры из location.state
  const [initialized, setInitialized] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
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

  const [limit, setLimit] = useState(() => {
    const initialColumns = getColumnsCount();
    return getLimitByColumns(initialColumns);
  });

  useEffect(() => {
    function updateLimit() {
      const columns = getColumnsCount();
      const newLimit = getLimitByColumns(columns);
      setLimit(newLimit);
    }
    updateLimit();
    window.addEventListener("resize", updateLimit);
    return () => window.removeEventListener("resize", updateLimit);
  }, []);

  // Восстановление фильтров из location.state (только 1 раз)
  useEffect(() => {
    if (!initialized && location.state) {
      if (location.state.categoryKey) setCategoryKey(location.state.categoryKey);
      if (location.state.categoryLabel) setCategoryLabel(location.state.categoryLabel);
      if (location.state.subcategoryKey) setSubcategoryKey(location.state.subcategoryKey);
      if (location.state.searchQuery !== undefined) setSearchQuery(location.state.searchQuery);

      if (location.state.brandFilter !== undefined) setBrandFilter(location.state.brandFilter);
      if (location.state.sizeFilter !== undefined) setSizeFilter(location.state.sizeFilter);
      if (location.state.genderFilter !== undefined) setGenderFilter(location.state.genderFilter);
      if (location.state.forceOpenCategory !== undefined) setForceOpenCategory(location.state.forceOpenCategory);

      setInitialized(true);
    }
  }, [initialized, location.state]);

  // Следим за изменением URL параметра search — только если еще не инициализировались
  useEffect(() => {
    if (!initialized) {
      const urlSearchParams = new URLSearchParams(location.search);
      const urlSearch = urlSearchParams.get("search") || "";
      setSearchQuery(urlSearch);
    }
  }, [location.search, initialized]);

  const isHome = useMemo(
    () => !searchQuery && !categoryKey && !brandFilter && !genderFilter && !sizeFilter,
    [searchQuery, categoryKey, brandFilter, genderFilter, sizeFilter]
  );

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

  const filters = useMemo(() => ({
    query: searchQuery,
    categoryKey,
    subcategoryKey,
    brand: brandFilter,
    gender: genderFilter,
    size: sizeFilter,
  }), [searchQuery, categoryKey, subcategoryKey, brandFilter, genderFilter, sizeFilter]);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

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
      } catch { }
    }
    updateOptions();
  }, [filters, categories]);

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

  useEffect(() => {
    setRawProducts([]);
    setProducts([]);
    setHasMore(true);
    loadProducts({ reset: true });
  }, [filters, isHome, limit, loadProducts]);

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
      state: {
        from: location.pathname + location.search,  // текущий адрес с фильтрами
        categoryKey,
        categoryLabel,
        subcategoryKey,
        searchQuery,
        brandFilter,
        sizeFilter,
        genderFilter,
        forceOpenCategory,
        breadcrumbs,
      }
    });
  };

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

  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    setCategoryKey(catKey);
    setCategoryLabel(catLabel);
    setSubcategoryKey(subKey || "");
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setForceOpenCategory(!!subKey);
    setSearchQuery("");
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
      </div>
      <Footer />
    </>
  );
}
