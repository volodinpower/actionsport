import { useEffect, useState, useMemo, useRef, useCallback } from "react";
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

function getCategoryLabel(cat) {
  if (!cat) return "";
  return (
    cat.label ||
    cat.name ||
    cat.title ||
    cat.category_title ||
    cat.category_name ||
    cat.category_key ||
    "Category"
  );
}

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const urlSearchParams = new URLSearchParams(location.search);
  const urlSearch = urlSearchParams.get("search") || "";

  const LIMIT = 30;

  const [categories, setCategories] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ label: "Main", query: "", exclude: "" }]);
  const [products, setProducts] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const [isHome, setIsHome] = useState(true);

  const [sort, setSort] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

  // Серверные фильтры для опций
  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);

  // Получение списка подкатегорий для выпадающего фильтра
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

  // Загрузка категорий
  useEffect(() => {
    fetchCategories()
      .then(data => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

  // Серверные опции для фильтров — при любом изменении фильтров/категории
  useEffect(() => {
    async function updateOptions() {
      let realCategoryKey = categoryFilter;
      let subcategoryKey = "";
      if (categoryFilter && !categories.find(c => c.category_key === categoryFilter)) {
        for (const c of categories) {
          if ((c.subcategories || []).some(sub =>
            (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === categoryFilter
          )) {
            realCategoryKey = c.category_key;
            subcategoryKey = categoryFilter;
            break;
          }
        }
      }
      // Бренды
      const brands = await fetchFilteredBrands({
        categoryKey: realCategoryKey,
        subcategoryKey,
        gender: genderFilter,
        size: sizeFilter,
        search: urlSearch,
      });
      setBrandsInFilter(brands);
      // Размеры
      const sizes = await fetchFilteredSizes({
        categoryKey: realCategoryKey,
        subcategoryKey,
        brand: brandFilter,
        gender: genderFilter,
        search: urlSearch,
      });
      setSizesInFilter(sizes);
      // Гендеры
      const genders = await fetchFilteredGenders({
        categoryKey: realCategoryKey,
        subcategoryKey,
        brand: brandFilter,
        size: sizeFilter,
        search: urlSearch,
      });
      setGendersInFilter(genders);
    }
    updateOptions();
    // eslint-disable-next-line
  }, [categoryFilter, brandFilter, genderFilter, sizeFilter, urlSearch, categories]);

  // Загрузка первых товаров или при изменении фильтров
  const loadInitialProducts = useCallback(async (
    query = urlSearch,
    bc = [{ label: "Main", query: "", exclude: "" }],
    excludeArg = "",
    brandFilterArg = brandFilter,
    categoryKey = categoryFilter,
    subcategoryKey = "",
    genderArg = genderFilter,
    sizeArg = sizeFilter,
    shouldSetBreadcrumbs = true
  ) => {
    setLoading(true);

    // Проверка субкатегории
    if (categoryKey && !categories.find(c => c.category_key === categoryKey)) {
      for (const c of categories) {
        if ((c.subcategories || []).some(sub =>
          (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === categoryKey
        )) {
          subcategoryKey = categoryKey;
          categoryKey = c.category_key;
          break;
        }
      }
    }

    let productsList = [];
    if (categoryKey || subcategoryKey || brandFilterArg || genderArg || sizeArg || query) {
      productsList = await fetchProducts(
        query, LIMIT, 0, excludeArg, brandFilterArg, "asc", categoryKey, subcategoryKey, genderArg, sizeArg
      );
      setIsHome(false);
      if (shouldSetBreadcrumbs) setBreadcrumbs(bc);
    } else {
      productsList = await fetchPopularProducts(20);
      setIsHome(true);
      if (shouldSetBreadcrumbs) setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
    }

    setProducts(productsList);
    setOffset(productsList.length);
    setHasMore(productsList.length === LIMIT);
    setLoading(false);
  }, [urlSearch, brandFilter, categoryFilter, genderFilter, sizeFilter, categories]);

  // Загрузка дополнительных товаров при скролле вниз
  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    let realCategoryKey = categoryFilter;
    let subcategoryKey = "";
    if (categoryFilter && !categories.find(c => c.category_key === categoryFilter)) {
      for (const c of categories) {
        if ((c.subcategories || []).some(sub =>
          (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === categoryFilter
        )) {
          realCategoryKey = c.category_key;
          subcategoryKey = categoryFilter;
          break;
        }
      }
    }

    const moreProducts = await fetchProducts(
      urlSearch,
      LIMIT,
      offset,
      "",
      brandFilter,
      "asc",
      realCategoryKey,
      subcategoryKey,
      genderFilter,
      sizeFilter
    );

    setProducts(prev => [...prev, ...moreProducts]);
    setOffset(prev => prev + moreProducts.length);
    setHasMore(moreProducts.length === LIMIT);
    setLoading(false);
  }, [loading, hasMore, offset, urlSearch, brandFilter, categoryFilter, genderFilter, sizeFilter, categories]);

  // Элемент для отслеживания прокрутки (инфинити скролл)
  const loader = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        loadMoreProducts();
      }
    }, { rootMargin: "200px" });
    if (loader.current) observer.observe(loader.current);
    return () => {
      if (loader.current) observer.unobserve(loader.current);
    };
  }, [loader, loadMoreProducts]);

  // При изменении фильтров или поиска — загружаем заново первые товары
  useEffect(() => {
    loadInitialProducts();
  }, [loadInitialProducts]);

  // Меняется фильтр категории (или подкатегории)
  const handleCategoryFilterChange = async (newCategory) => {
    setCategoryFilter(newCategory);
  };

  // ГЛАВНЫЙ обработчик поиска и кликов в меню
  const handleSearch = (
    query,
    breadcrumbTrail,
    excludeArg = "",
    filterBrand = "",
    category = "",
    subcategory = "",
    genderArg = "",
    sizeArg = ""
  ) => {
    setCategoryFilter(subcategory || category || "");
    setBrandFilter(filterBrand || "");
    setGenderFilter(genderArg || "");
    setSizeFilter(sizeArg || "");

    setBreadcrumbs(breadcrumbTrail);
  };

  // Клик по хлебным крошкам
  const handleBreadcrumbClick = async (idx) => {
    const newTrail = breadcrumbs.slice(0, idx + 1);
    const lastCrumb = newTrail[newTrail.length - 1];
    setCategoryFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setSizeFilter("");
    if (lastCrumb.query === "") {
      setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
      await loadInitialProducts("", [{ label: "Main", query: "", exclude: "" }], "", "", "", "", "", "", false);
    } else {
      setBreadcrumbs(newTrail);
      await loadInitialProducts(lastCrumb.query, newTrail, "", "", "", "", "", "", false);
    }
  };

  const allBrands = useMemo(() => brandsInFilter, [brandsInFilter]);
  const allSizes = useMemo(() => sizesInFilter, [sizesInFilter]);
  const genderOptions = useMemo(() =>
    gendersInFilter.map(g => ({
      value: g,
      label: g === "m" ? "Men" : g === "w" ? "Women" : g === "k" ? "Kids" : g
    })),
    [gendersInFilter]
  );
  const showGenderOption = gendersInFilter.length > 1 || !!genderFilter;

  const getEffectivePrice = (item) => {
    const fix = val => {
      if (val == null) return Infinity;
      if (typeof val === "number") return val;
      const str = String(val)
        .replace(/\s| /g, "")
        .replace(",", ".")
        .replace(/[^0-9.]/g, "");
      const n = Number(str);
      return isNaN(n) ? Infinity : n;
    };
    const discount = fix(item.discount_price);
    const price = fix(item.price);
    return discount > 0 ? discount : price;
  };

  const displayedProducts = useMemo(() => {
    let arr = [...products];
    if (sort === "asc") {
      arr.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (sort === "desc") {
      arr.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    } else if (sort === "popular") {
      arr.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === "discount") {
      arr.sort((a, b) => {
        const ad = Number(a.discount) || 0;
        const bd = Number(b.discount) || 0;
        return bd - ad;
      });
    }
    return arr;
  }, [products, sort]);

  const clearFilters = () => {
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
  };

  const handleCardClick = (productId) => {
    const lastCrumb = breadcrumbs[breadcrumbs.length - 1] || { query: "", exclude: "" };
    const searchParam = lastCrumb.query ? `?search=${encodeURIComponent(lastCrumb.query)}` : "";
    navigate(`/product/${productId}${searchParam}`, {
      state: {
        from: location.pathname + searchParam,
        breadcrumbs: breadcrumbs,
        query: lastCrumb.query,
        exclude: lastCrumb.exclude,
      }
    });
  };

  return (
    <>
      <Header
        onSearch={handleSearch}
        breadcrumbs={breadcrumbs}
        isHome={isHome}
        setCategoryFilter={setCategoryFilter}
        setForceOpenCategory={setForceOpenCategory}
      />

      {!isHome && (
        <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
      )}

      {isHome && <Banner />}

      {!isHome && (
        <div>
          <FilterBar
            allSizes={allSizes}
            allBrands={allBrands}
            submenuList={submenuList}
            sizeFilter={sizeFilter}
            setSizeFilter={setSizeFilter}
            brandFilter={brandFilter}
            setBrandFilter={setBrandFilter}
            genderFilter={genderFilter}
            setGenderFilter={setGenderFilter}
            genderOptions={genderOptions}
            categoryFilter={categoryFilter}
            setCategoryFilter={handleCategoryFilterChange}
            clearFilters={clearFilters}
            showGender={showGenderOption}
            showCategory={categoryFilter !== "sale"}
            forceOpenCategory={forceOpenCategory}
            setForceOpenCategory={setForceOpenCategory}
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
        <div ref={loader} className="text-center py-4">
          {loading && <p>Loading...</p>}
          {!hasMore && <p>No more products</p>}
        </div>
      </div>
      <Footer />
    </>
  );
}
