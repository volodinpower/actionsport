import { useEffect, useState, useMemo } from "react";
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

  const [categories, setCategories] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ label: "Main", query: "", exclude: "" }]);
  const [products, setProducts] = useState([]);
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

  // Основная загрузка товаров
  const load = async (
    query = "",
    bc = [{ label: "Main", query: "", exclude: "" }],
    excludeArg = "",
    brandFilterArg = "",
    categoryKey = "",
    subcategoryKey = "",
    genderArg = "",
    sizeArg = "",
    shouldSetBreadcrumbs = true
  ) => {
    let productsList = [];
    let limit = 150;
    if (categoryKey || subcategoryKey || brandFilterArg || genderArg || sizeArg || query) {
      productsList = await fetchProducts(
        query, limit, 0, excludeArg, brandFilterArg, "asc", categoryKey, subcategoryKey, genderArg, sizeArg
      );
      setIsHome(false);
      if (shouldSetBreadcrumbs) setBreadcrumbs(bc);
    } else {
      productsList = await fetchPopularProducts(20);
      setIsHome(true);
      if (shouldSetBreadcrumbs) setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
    }
    setProducts(productsList);
  };

  // Меняется фильтр категории (или подкатегории)
  const handleCategoryFilterChange = async (newCategory) => {
    setCategoryFilter(newCategory);
    await load("", breadcrumbs, "", brandFilter, newCategory, "", genderFilter, sizeFilter, false);
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
    let newBreadcrumbs = breadcrumbTrail;
    let categoryKey = "";
    let subcategoryKey = "";
    if (subcategory) {
      subcategoryKey = subcategory;
      const parent = categories.find(c =>
        (c.subcategories || []).some(
          sub => (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === subcategory
        )
      );
      if (parent) categoryKey = parent.category_key;
    } else if (category) {
      categoryKey = category;
    }
    setCategoryFilter(subcategory || category || "");
    setBrandFilter(filterBrand || "");
    setGenderFilter(genderArg || "");
    setSizeFilter(sizeArg || "");
    load(query, newBreadcrumbs, excludeArg, filterBrand, categoryKey, subcategoryKey, genderArg, sizeArg, true);
    setForceOpenCategory(!!subcategory);
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
      await load("", [{ label: "Main", query: "", exclude: "" }], "", "", "", "", "", "", false);
    } else {
      setBreadcrumbs(newTrail);
      await load(lastCrumb.query, newTrail, "", "", "", "", "", "", false);
    }
  };

  // Первичная загрузка
  useEffect(() => {
    async function initialize() {
      if (location.state && location.state.breadcrumbs) {
        if (location.state.query) {
          await load(location.state.query, location.state.breadcrumbs);
        } else {
          await load("", location.state.breadcrumbs);
        }
        setCategoryFilter("");
        return;
      }
      if (urlSearch) {
        const initialBreadcrumbs = [
          { label: "Main", query: "", exclude: "" },
          { label: urlSearch, query: urlSearch, exclude: "" }
        ];
        await load(urlSearch, initialBreadcrumbs);
        setCategoryFilter("");
        return;
      }
      await load("", [{ label: "Main", query: "", exclude: "" }]);
      setCategoryFilter("");
    }
    initialize();
    // eslint-disable-next-line
  }, [location.search]);

  // Перезагружать товары при изменении фильтра
  useEffect(() => {
    async function updateProducts() {
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
      await load(
        urlSearch, breadcrumbs, "", brandFilter, realCategoryKey, subcategoryKey, genderFilter, sizeFilter, false
      );
    }
    if (
      categoryFilter || brandFilter || genderFilter || sizeFilter || urlSearch
    ) {
      updateProducts().catch(console.error);
    }
    // eslint-disable-next-line
  }, [categoryFilter, brandFilter, genderFilter, sizeFilter, urlSearch, categories]);

  // --- НЕ ФИЛЬТРУЕМ НА КЛИЕНТЕ! Просто выводим products ---
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
      </div>
      <Footer />
    </>
  );
}
