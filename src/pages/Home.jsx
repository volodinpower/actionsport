import { useEffect, useState, useMemo } from "react";
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
  const [products, setProducts] = useState([]);
  const [isHome, setIsHome] = useState(true);

  const [sort, setSort] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

  // --- Загрузка категорий ---
  useEffect(() => {
    fetchCategories()
      .then(data => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

  // --- submenuList для FilterBar ---
  const mainCategoryKey = breadcrumbs[1]?.label || "";
  const submenuList = useMemo(() => {
    const cat = categories.find(c => c.category_key === mainCategoryKey);
    return cat
      ? cat.subcategories.map(sub =>
          typeof sub === "string"
            ? sub
            : sub.subcategory_key || sub.label
        )
      : [];
  }, [categories, mainCategoryKey]);

  // --- Загрузка товаров ---
  const load = async (
    query = "",
    bc = [{ label: "Main", query: "", exclude: "" }],
    excludeArg = "",
    brandFilterArg = ""
  ) => {
    const lastExclude = bc.length > 0 ? bc[bc.length - 1].exclude || excludeArg : excludeArg;
    const lastBrand = bc.length > 0 ? bc[bc.length - 1].brand || brandFilterArg : brandFilterArg;
    let productsList = [];
    let limit = 150;
    if (!query && !lastBrand) {
      productsList = await fetchPopularProducts(20);
      setIsHome(true);
      setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
    } else {
      productsList = await fetchProducts(query, limit, 0, lastExclude, lastBrand);
      setIsHome(false);
      setBreadcrumbs(bc);
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
    await load(query, breadcrumbTrail || breadcrumbs, excludeArg, filterBrand);

    // ВАЖНО: всегда передавать ключ!
    if (subcategory) {
      setCategoryFilter(subcategory); // если подкатегория — фильтруем по subcategory_key
    } else if (category) {
      setCategoryFilter(category); // если категория — фильтруем по category_key
    } else {
      setCategoryFilter("");
    }
    setBrandFilter(filterBrand || "");
    setForceOpenCategory(!!subcategory);
  };

  // --- Клик по хлебным крошкам ---
  const handleBreadcrumbClick = async (idx) => {
    const newTrail = breadcrumbs.slice(0, idx + 1);
    const lastCrumb = newTrail[newTrail.length - 1];
    if (lastCrumb.query === "") {
      await load("", [{ label: "Main", query: "", exclude: "" }]);
      setCategoryFilter("");
    } else {
      await load(lastCrumb.query, newTrail);
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

  // --- ГЛАВНАЯ ФИЛЬТРАЦИЯ ---
const filteredProducts = useMemo(() => {
  return products.filter(p => {
    console.log(
      'DEBUG:', 
      'categoryFilter:', categoryFilter, 
      '| p.category_key:', p.category_key, 
      '| p.subcategory_key:', p.subcategory_key,
      '| ==cat?', p.category_key === categoryFilter,
      '| ==subcat?', p.subcategory_key === categoryFilter
    );
    return (
      p.category_key === categoryFilter ||
      p.subcategory_key === categoryFilter
    );
  });
}, [products, categoryFilter]);


  // --- Фильтры для FilterBar ---
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

  const clearFilters = () => {
    setSizeFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setCategoryFilter("");
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
    console.log("Товар полностью:", products[0]);

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
            setCategoryFilter={setCategoryFilter}
            clearFilters={clearFilters}
            showGender={showGenderOption}
            showCategory={true}
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
