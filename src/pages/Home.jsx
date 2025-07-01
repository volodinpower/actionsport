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

// Просто возвращаем sizes из товара
function groupProducts(rawProducts) {
  return rawProducts.map(p => ({
    ...p,
    sizes: Array.isArray(p.sizes) ? p.sizes.filter(Boolean) : [],
  }));
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  // Читаем из URL
  const urlSearchParams = new URLSearchParams(location.search);
  const urlSearch = urlSearchParams.get("search") || "";

  // Состояния
  const [categories, setCategories] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ label: "Main", query: "", exclude: "" }]);
  const [rawProducts, setRawProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

  const [sort, setSort] = useState("");

  // На главной: если ни одного фильтра не выбрано и нет поискового запроса
  const isHome = useMemo(
    () => !urlSearch && !categoryFilter && !brandFilter && !genderFilter && !sizeFilter,
    [urlSearch, categoryFilter, brandFilter, genderFilter, sizeFilter]
  );

  // Определяем подкатегорию
  const subcategoryKey = useMemo(() => {
    if (!categoryFilter) return "";
    for (const c of categories) {
      if ((c.subcategories || []).some(sub =>
        (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === categoryFilter
      )) {
        return categoryFilter;
      }
    }
    return "";
  }, [categoryFilter, categories]);

  // Актуальные фильтры
  const filters = useMemo(() => ({
    query: urlSearch,
    categoryKey: subcategoryKey ? "" : categoryFilter,
    subcategoryKey,
    brand: brandFilter,
    gender: genderFilter,
    size: sizeFilter,
  }), [urlSearch, categoryFilter, subcategoryKey, brandFilter, genderFilter, sizeFilter]);

  // Категории (1 раз)
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Фильтры для селекторов
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

  // Пагинация
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

  // Сброс данных при смене фильтра/поиска/сортировки
  useEffect(() => {
    setRawProducts([]);
    setProducts([]);
    setHasMore(true);
    loadProducts({ reset: true });
    // eslint-disable-next-line
  }, [filters, isHome]);

  // Подгрузка при скролле (кроме главной)
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

  // Все действия фильтрации и поиска идут через ЭТУ функцию
  const handleSearch = (
    query = "",
    breadcrumbTrail = [{ label: "Main", query: "", exclude: "" }],
    excludeArg = "",
    filterBrand = "",
    category = "",
    subcategory = "",
    genderArg = "",
    sizeArg = ""
  ) => {
    setBreadcrumbs(breadcrumbTrail);
    setCategoryFilter(subcategory || category || "");
    setBrandFilter(filterBrand || "");
    setGenderFilter(genderArg || "");
    setSizeFilter(sizeArg || "");
    setForceOpenCategory(!!subcategory);

    // Меняем URL, чтобы синхронизировать поиск
    if (navigate) {
      if (query) navigate(`/?search=${encodeURIComponent(query)}`);
      else navigate(`/`);
    }
  };

  // Для FilterBar — все изменения идут через handleSearch (чисто!)
  const onCategoryChange = (cat) =>
    handleSearch("", [{ label: "Main", query: "", exclude: "" }], "", "", cat);
  const onBrandChange = (brand) =>
    handleSearch("", [{ label: "Main", query: "", exclude: "" }], "", brand);
  const onSizeChange = (size) =>
    handleSearch("", [{ label: "Main", query: "", exclude: "" }], "", "", "", "", "", size);
  const onGenderChange = (gender) =>
    handleSearch("", [{ label: "Main", query: "", exclude: "" }], "", "", "", "", gender);

  // Сброс всех фильтров
  const clearFilters = () => {
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setCategoryFilter("");
    setForceOpenCategory(false);
    setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
    navigate("/");
  };

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

  // Для карточки
  const handleCardClick = (productId) => {
    const lastCrumb = breadcrumbs[breadcrumbs.length - 1] || { query: "", exclude: "" };
    const searchParam = lastCrumb.query ? `?search=${encodeURIComponent(lastCrumb.query)}` : "";
    navigate(`/product/${productId}${searchParam}`, {
      state: {
        from: location.pathname + searchParam,
        breadcrumbs,
        query: lastCrumb.query,
        exclude: lastCrumb.exclude,
      }
    });
  };
  const handleMenuCategoryClick = (categoryKey, categoryLabel, subcategoryKey = "") => {
    // breadcrumbs будут: Main > Категория
    setBreadcrumbs([
      { label: "Main", query: "", exclude: "" },
      { label: categoryLabel, query: categoryKey }
    ]);
    setCategoryFilter(subcategoryKey || categoryKey);
    setBrandFilter("");
    setGenderFilter("");
    setSizeFilter("");
    setForceOpenCategory(!!subcategoryKey);
    // Сброс поисковой строки!
    navigate(`/`);
  };
  // Список подкатегорий для селекта
  const submenuList = useMemo(() => {
    let cat = categories.find(c => c.category_key === categoryFilter);
    if (cat) {
      return cat.subcategories.map(sub =>
        typeof sub === "string" ? sub : sub.subcategory_key || sub.label
      );
    }
    for (let c of categories) {
      if ((c.subcategories || []).some(sub =>
        (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === categoryFilter
      )) {
        return c.subcategories.map(sub =>
          typeof sub === "string" ? sub : sub.subcategory_key || sub.label
        );
      }
    }
    return [];
  }, [categories, categoryFilter]);

  // Гендерные опции
  const genderOptions = useMemo(
    () =>
      gendersInFilter.map(g => ({
        value: g,
        label: g === "m" ? "Men" : g === "w" ? "Women" : g === "k" ? "Kids" : g
      })),
    [gendersInFilter]
  );
  const showGenderOption = gendersInFilter.length > 1 || !!genderFilter;

  // Клик по хлебным крошкам
  const handleBreadcrumbClick = async (idx) => {
    const newTrail = breadcrumbs.slice(0, idx + 1);
    const lastCrumb = newTrail[newTrail.length - 1];
    setCategoryFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setSizeFilter("");
    setBreadcrumbs(newTrail);
    if (lastCrumb.query === "") {
      setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
      navigate("/");
    } else {
      navigate(`/?search=${encodeURIComponent(lastCrumb.query)}`);
    }
  };

  // --- Рендер ---
  return (
    <>
      <Header
        onSearch={handleSearch}
        breadcrumbs={breadcrumbs}
        isHome={isHome}
        setCategoryFilter={setCategoryFilter}
        setForceOpenCategory={setForceOpenCategory}
        navigate={navigate}
        onMenuCategoryClick={handleMenuCategoryClick}
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
            categoryFilter={categoryFilter}
            genderOptions={genderOptions}
            forceOpenCategory={forceOpenCategory}
            setForceOpenCategory={setForceOpenCategory}
            clearFilters={clearFilters}
            showGender={showGenderOption}
            showCategory={categoryFilter !== "sale"}
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
