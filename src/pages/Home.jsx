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

const HOME_LIMIT = 20;
const OTHER_LIMIT = 30;

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
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isHome, setIsHome] = useState(true);

  const [sort, setSort] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

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

  const filters = useMemo(() => ({
    query: urlSearch,
    categoryKey: subcategoryKey ? "" : categoryFilter,
    subcategoryKey,
    brand: brandFilter,
    gender: genderFilter,
    size: sizeFilter,
  }), [urlSearch, categoryFilter, subcategoryKey, brandFilter, genderFilter, sizeFilter]);

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

  useEffect(() => {
    fetchCategories()
      .then(data => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);

  useEffect(() => {
    async function updateOptions() {
      let realCategoryKey = filters.categoryKey;
      let realSubcategoryKey = filters.subcategoryKey;

      if (realSubcategoryKey) {
        realCategoryKey = "";
      }

      try {
        const brands = await fetchFilteredBrands({
          categoryKey: realCategoryKey,
          subcategoryKey: realSubcategoryKey,
          gender: filters.gender,
          size: filters.size,
          search: filters.query,
        });
        setBrandsInFilter(brands);

        const sizes = await fetchFilteredSizes({
          categoryKey: realCategoryKey,
          subcategoryKey: realSubcategoryKey,
          brand: filters.brand,
          gender: filters.gender,
          search: filters.query,
        });
        setSizesInFilter(sizes);

        const genders = await fetchFilteredGenders({
          categoryKey: realCategoryKey,
          subcategoryKey: realSubcategoryKey,
          brand: filters.brand,
          size: filters.size,
          search: filters.query,
        });
        setGendersInFilter(genders);
      } catch {
        // Ошибки молча игнорируем или можно добавить UI-оповещение
      }
    }
    updateOptions();
  }, [filters, categories]);

  const loadProducts = useCallback(async ({ reset = false } = {}) => {
    if (isLoading) return;
    setIsLoading(true);

    const isMainPage = !filters.query && !filters.categoryKey && !filters.subcategoryKey && !filters.brand && !filters.gender && !filters.size;
    const limit = isMainPage ? HOME_LIMIT : OTHER_LIMIT;
    const offset = reset ? 0 : products.length;

    try {
      let fetched;
      if (!isMainPage) {
        fetched = await fetchProducts(
          filters.query,
          limit,
          offset,
          "",
          filters.brand,
          "asc",
          filters.categoryKey,
          filters.subcategoryKey,
          filters.gender,
          filters.size
        );
        setIsHome(false);
      } else {
        fetched = await fetchPopularProducts(limit);
        setIsHome(true);
      }

      if (reset) {
        setProducts(fetched);
        setHasMore(fetched.length === limit && !isMainPage);
      } else {
        setProducts(prev => [...prev, ...fetched]);
        setHasMore(fetched.length === limit);
      }
    } catch {
      // Ошибки молча игнорируем или можно добавить UI-оповещение
    } finally {
      setIsLoading(false);
    }
  }, [filters, isLoading, products.length]);

  useEffect(() => {
    loadProducts({ reset: true });
  }, [filters, loadProducts]);

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

  const handleCategoryFilterChange = (newCategory) => {
    setCategoryFilter(newCategory);
  };

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

    setBreadcrumbs(newBreadcrumbs);
    setCategoryFilter(subcategory || category || "");
    setBrandFilter(filterBrand || "");
    setGenderFilter(genderArg || "");
    setSizeFilter(sizeArg || "");
    setForceOpenCategory(!!subcategory);
  };

  const handleBreadcrumbClick = async (idx) => {
    const newTrail = breadcrumbs.slice(0, idx + 1);
    const lastCrumb = newTrail[newTrail.length - 1];

    setCategoryFilter("");
    setBrandFilter("");
    setGenderFilter("");
    setSizeFilter("");

    if (lastCrumb.query === "") {
      setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
      await loadProducts({ reset: true });
    } else {
      setBreadcrumbs(newTrail);
      await loadProducts({ reset: true, query: lastCrumb.query });
    }
  };

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
            allSizes={sizesInFilter}
            allBrands={brandsInFilter}
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
