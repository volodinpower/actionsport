import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import { fetchProducts, fetchPopularProducts, fetchCategories } from "../api";
import Banner from "../components/Banner";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import FilterBar from "../components/FilterBar";
import SortControl from "../components/SortControl";

export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  const urlSearchParams = new URLSearchParams(location.search);
  const urlSearch = urlSearchParams.get("search") || "";

  const [categories, setCategories] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ label: "Main", query: "", exclude: "" }]);
  const breadcrumbsRef = useRef(breadcrumbs); // ref для сравнения и предотвращения лишних обновлений
  const [products, setProducts] = useState([]);
  const [isHome, setIsHome] = useState(true);

  const [sort, setSort] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

  // Обновляем ref, когда меняются breadcrumbs
  useEffect(() => {
    breadcrumbsRef.current = breadcrumbs;
  }, [breadcrumbs]);

  // --- Загрузка категорий ---
  useEffect(() => {
    fetchCategories()
      .then(data => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

  // --- submenuList для FilterBar ---
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

  // --- Загрузка товаров и обновление breadcrumbs с защитой от лишних обновлений ---
  const load = async (
    query = "",
    bc = breadcrumbsRef.current,
    excludeArg = "",
    brandFilterArg = "",
    categoryKey = "",
    subcategoryKey = ""
  ) => {
    const lastExclude = bc.length > 0 ? bc[bc.length - 1].exclude || excludeArg : excludeArg;
    const lastBrand = bc.length > 0 ? bc[bc.length - 1].brand || brandFilterArg : brandFilterArg;
    let productsList = [];
    let limit = 150;

    if (!query && !lastBrand && !categoryKey && !subcategoryKey) {
      productsList = await fetchPopularProducts(20);
      setIsHome(true);
      // Обновляем breadcrumbs только если изменились
      setBreadcrumbs(prev => {
        const def = [{ label: "Main", query: "", exclude: "" }];
        return JSON.stringify(prev) !== JSON.stringify(def) ? def : prev;
      });
    } else {
      productsList = await fetchProducts(
        query, limit, 0, lastExclude, lastBrand, "asc", categoryKey, subcategoryKey
      );
      setIsHome(false);
      setBreadcrumbs(prev => (JSON.stringify(prev) !== JSON.stringify(bc) ? bc : prev));
    }

    setProducts(productsList);
    setSort("");
    setSizeFilter("");
    setBrandFilter(lastBrand || "");
    setGenderFilter("");
  };

  // --- Клик по меню/подменю ---
  const handleSearch = async (
    query,
    breadcrumbTrail,
    excludeArg = "",
    filterBrand = "",
    category = "",
    subcategory = ""
  ) => {
    let categoryKey = "";
    let subcategoryKey = "";
    if (subcategory) {
      subcategoryKey = subcategory;
      const parent = categories.find(c =>
        (c.subcategories || []).some(
          sub =>
            (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === subcategory
        )
      );
      if (parent) categoryKey = parent.category_key;
    } else if (category) {
      categoryKey = category;
    }

    await load("", breadcrumbTrail || breadcrumbsRef.current, excludeArg, filterBrand, categoryKey, subcategoryKey);

    if (subcategory) {
      setCategoryFilter(subcategory);
    } else if (category) {
      setCategoryFilter(category);
    } else {
      setCategoryFilter("");
    }
    setBrandFilter(filterBrand || "");
    setForceOpenCategory(!!subcategory);
  };

  // --- Клик по хлебным крошкам ---
  const handleBreadcrumbClick = async (idx) => {
    const newTrail = breadcrumbsRef.current.slice(0, idx + 1);
    const lastCrumb = newTrail[newTrail.length - 1];
    if (lastCrumb.query === "") {
      await load("", newTrail, "", brandFilter);
      setCategoryFilter("");
    } else {
      await load(lastCrumb.query, newTrail, "", brandFilter);
      setCategoryFilter("");
    }
  };

  // --- Инициализация (по location/search) ---
  useEffect(() => {
    if (location.state && location.state.breadcrumbs) {
      setBreadcrumbs(location.state.breadcrumbs);
      if (location.state.query) {
        load(location.state.query, location.state.breadcrumbs);
        setCategoryFilter("");
        return;
      }
    }
    if (urlSearch) {
      load(
        urlSearch,
        [
          { label: "Main", query: "", exclude: "" },
          { label: urlSearch, query: urlSearch, exclude: "" }
        ]
      );
      setCategoryFilter("");
    } else {
      load();
      setCategoryFilter("");
    }
    // eslint-disable-next-line
  }, [location.search]);

  // --- Отслеживание изменений фильтра категорий ---
  useEffect(() => {
    async function updateProducts() {
      if (!categoryFilter) {
        await load();
        return;
      }

      let categoryKey = "";
      let subcategoryKey = "";

      const cat = categories.find(c => c.category_key === categoryFilter);
      if (cat) {
        categoryKey = categoryFilter;
      } else {
        for (const c of categories) {
          if ((c.subcategories || []).some(sub =>
            (typeof sub === "string" ? sub : sub.subcategory_key || sub.label) === categoryFilter
          )) {
            categoryKey = c.category_key;
            subcategoryKey = categoryFilter;
            break;
          }
        }
      }

      await load("", breadcrumbsRef.current, "", brandFilter, categoryKey, subcategoryKey);
    }

    updateProducts().catch(console.error);
  }, [categoryFilter, categories, brandFilter]);

  // --- Фильтрация по size, brand, gender на клиенте ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (sizeFilter && (!Array.isArray(p.sizes) || !p.sizes.includes(sizeFilter))) return false;
      if (brandFilter) {
        const brandVariants = brandFilter.split(",").map(x => x.trim().toLowerCase());
        if (!p.brand || !brandVariants.includes(p.brand.trim().toLowerCase())) return false;
      }
      if (genderFilter && p.gender !== genderFilter) return false;
      return true;
    });
  }, [products, sizeFilter, brandFilter, genderFilter]);

  // --- Подготовка опций для фильтров ---
  const allSizes = useMemo(() =>
    Array.from(
      new Set(filteredProducts.flatMap(p => Array.isArray(p.sizes) ? p.sizes : []).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ru", { numeric: true }))
  , [filteredProducts]);

  const uniqueGenders = useMemo(() =>
    Array.from(new Set(filteredProducts.map(p => p.gender).filter(g => ["m", "w", "kids"].includes(g))))
  , [filteredProducts]);

  const showGenderOption = uniqueGenders.length > 1 || !!genderFilter;

  const allBrands = useMemo(() =>
    Array.from(
      new Set(filteredProducts.map(p => p.brand).filter(Boolean))
    ).sort()
  , [filteredProducts]);

  const genderOptions = useMemo(() => {
    const variants = Array.from(
      new Set(filteredProducts.map(p => p.gender).filter(g => ["m", "w", "kids"].includes(g)))
    );
    const options = [];
    if (variants.length > 1 || !genderFilter) {
      options.push({ value: "", label: "All genders" });
    }
    variants.forEach(g => {
      options.push({
        value: g,
        label: g === "m" ? "Men" : g === "w" ? "Women" : "Kids"
      });
    });
    return options;
  }, [filteredProducts, genderFilter]);

  // --- Сортировка по цене, популярности, скидке ---
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
    let arr = [...filteredProducts];
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
  }, [filteredProducts, sort]);

  // --- Сброс фильтров ---
  const clearFilters = () => {
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    // НЕ сбрасываем categoryFilter, чтобы фильтр категорий оставался видимым
  };

  // --- Переход на страницу товара ---
  const handleCardClick = (productId) => {
    const lastCrumb = breadcrumbsRef.current[breadcrumbsRef.current.length - 1] || { query: "", exclude: "" };
    const searchParam = lastCrumb.query ? `?search=${encodeURIComponent(lastCrumb.query)}` : "";
    navigate(`/product/${productId}${searchParam}`, {
      state: {
        from: location.pathname + searchParam,
        breadcrumbs: breadcrumbsRef.current,
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

      {!isHome && breadcrumbs.length > 1 && (
        <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
      )}

      {isHome && <Banner />}

      {!isHome && (
        <>
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
            setCategoryFilter={setCategoryFilter}
            clearFilters={clearFilters}
            showGender={showGenderOption}
            showCategory={true}
            forceOpenCategory={forceOpenCategory}
            setForceOpenCategory={setForceOpenCategory}
          />
          <SortControl sort={sort} setSort={setSort} />
        </>
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
