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

const CATEGORY_LIMIT = 2000;

// --- Получить кол-во колонок в сетке для текущей ширины экрана
function getColumnsCount() {
  const width = window.innerWidth;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}

// Подобрать лимит чтобы карточки были кратны колонкам, minLimit - минимум карточек
function computeLimit(minLimit, columns) {
  let limit = minLimit;
  while (limit % columns !== 0) limit++;
  return limit;
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

  // --- Колонки и лимит для главной ---
  const [columns, setColumns] = useState(getColumnsCount());
  useEffect(() => {
    function handleResize() {
      setColumns(getColumnsCount());
    }
    window.addEventListener("resize", handleResize);
    handleResize(); // Обновить при монтировании
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Лимит для популярки — всегда ровный ряд!
  const homeLimit = useMemo(() => (isHome ? computeLimit(20, columns) : 20), [columns, isHome]);

  // --- Товары и загрузка ---
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

const loadProducts = useCallback(async () => {
  setIsLoading(true);
  try {
    if (isHome) {
      const raw = await fetchPopularProducts(homeLimit);
      setProducts(groupProducts(raw));
    } else {
      const raw = await fetchProducts(
        filters.categoryKey === "sale" ? "" : filters.query,
        CATEGORY_LIMIT,
        0,
        "",
        filters.brand,
        sort || "asc",
        filters.categoryKey,
        filters.subcategoryKey,
        filters.gender,
        filters.size
      );
      setProducts(groupProducts(raw));
    }
  } catch (e) {
    setProducts([]);
  } finally {
    setIsLoading(false);
  }
}, [filters, isHome, sort, homeLimit]);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line
  }, [filters, isHome, sort, homeLimit]);

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

  // --- Карточка товара ---
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
      </div>
      <Footer />
    </>
  );
}
