import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import {
  fetchProducts,
  fetchPopularProducts,
  fetchCategories,
  fetchFilteredBrands,
  fetchFilteredGenders,
  fetchFilteredSizes,
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
  const [breadcrumbs, setBreadcrumbs] = useState([
    { label: "Main", query: "", exclude: "" },
  ]);
  const [products, setProducts] = useState([]);
  const [isHome, setIsHome] = useState(true);

  const [sort, setSort] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [forceOpenCategory, setForceOpenCategory] = useState(false);

  // --- Новый стейт для брендов, гендеров и размеров после всех фильтров ---
  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data || []))
      .catch(() => setCategories([]));
  }, []);

  // Определяем реальные значения category_key и subcategory_key для фильтров
  const getFilterKeys = () => {
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
    return { realCategoryKey, subcategoryKey };
  };

  // ---- Обновляем brandsInFilter, gendersInFilter, sizesInFilter при любом изменении фильтра ----
  useEffect(() => {
    async function updateFilterOptions() {
      const { realCategoryKey, subcategoryKey } = getFilterKeys();

      const [brands, genders, sizes] = await Promise.all([
        fetchFilteredBrands({
          categoryKey: realCategoryKey,
          subcategoryKey,
          gender: genderFilter,
          size: sizeFilter,
          search: urlSearch,
        }),
        fetchFilteredGenders({
          categoryKey: realCategoryKey,
          subcategoryKey,
          brand: brandFilter,
          size: sizeFilter,
          search: urlSearch,
        }),
        fetchFilteredSizes({
          categoryKey: realCategoryKey,
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          search: urlSearch,
        }),
      ]);
      setBrandsInFilter(brands);
      setGendersInFilter(genders);
      setSizesInFilter(sizes);
    }
    updateFilterOptions();
    // eslint-disable-next-line
  }, [categoryFilter, brandFilter, genderFilter, sizeFilter, urlSearch, categories]);

  const submenuList = useMemo(() => {
    let cat = categories.find((c) => c.category_key === categoryFilter);
    if (cat) {
      return cat.subcategories.map((sub) =>
        typeof sub === "string" ? sub : sub.subcategory_key || sub.label
      );
    }
    for (let c of categories) {
      if (
        (c.subcategories || []).some(
          (sub) =>
            (typeof sub === "string"
              ? sub
              : sub.subcategory_key || sub.label) === categoryFilter
        )
      ) {
        return c.subcategories.map((sub) =>
          typeof sub === "string" ? sub : sub.subcategory_key || sub.label
        );
      }
    }
    return [];
  }, [categories, categoryFilter]);

  // Основная загрузка товаров
  const load = async (
    query = "",
    bc = [{ label: "Main", query: "", exclude: "" }],
    excludeArg = "",
    brandFilterArg = "",
    categoryKey = "",
    subcategoryKey = "",
    shouldSetBreadcrumbs = true
  ) => {
    const lastExclude =
      bc.length > 0 ? bc[bc.length - 1].exclude || excludeArg : excludeArg;
    const lastBrand =
      bc.length > 0 ? bc[bc.length - 1].brand || brandFilterArg : brandFilterArg;
    let productsList = [];
    let limit = 150;

    if (categoryKey === "sale") {
      productsList = await fetchProducts("", 500, 0, "", "", "asc", "", "");
      productsList = productsList.filter(
        (p) =>
          (p.discount && Number(p.discount) > 0) ||
          (p.discount_price &&
            Number(p.discount_price) > 0 &&
            Number(p.discount_price) < Number(p.price))
      );
      setIsHome(false);
      if (shouldSetBreadcrumbs)
        setBreadcrumbs([
          { label: "Main", query: "", exclude: "" },
          { label: "Sale", query: "sale" },
        ]);
    } else if (
      !query &&
      !lastBrand &&
      !categoryKey &&
      !subcategoryKey
    ) {
      productsList = await fetchPopularProducts(20);
      setIsHome(true);
      if (shouldSetBreadcrumbs)
        setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
    } else {
      productsList = await fetchProducts(
        query,
        limit,
        0,
        lastExclude,
        lastBrand,
        "asc",
        categoryKey,
        subcategoryKey
      );
      setIsHome(false);
      if (shouldSetBreadcrumbs) setBreadcrumbs(bc);
    }

    setProducts(productsList);
    setSort("");
    setSizeFilter("");
    setBrandFilter(lastBrand || "");
    setGenderFilter("");
  };

  // Обработчик для фильтра категории
  const handleCategoryFilterChange = async (newCategory) => {
    setCategoryFilter(newCategory);
    await load("", breadcrumbs, "", brandFilter, newCategory, "", false);
  };

  // ГЛАВНЫЙ обработчик поиска
  const handleSearch = (
    query,
    breadcrumbTrail,
    excludeArg = "",
    filterBrand = "",
    category = "",
    subcategory = ""
  ) => {
    if (category || subcategory) {
      let categoryKey = "";
      let subcategoryKey = "";
      let newBreadcrumbs = [];

      if (subcategory) {
        subcategoryKey = subcategory;
        const parent = categories.find((c) =>
          (c.subcategories || []).some(
            (sub) =>
              (typeof sub === "string"
                ? sub
                : sub.subcategory_key || sub.label) === subcategory
          )
        );
        if (parent) {
          categoryKey = parent.category_key;
          newBreadcrumbs = [
            { label: "Main", query: "", exclude: "" },
            { label: getCategoryLabel(parent), query: parent.category_key },
          ];
        } else {
          newBreadcrumbs = [{ label: "Main", query: "", exclude: "" }];
        }
      } else if (category) {
        categoryKey = category;
        const cat = categories.find((c) => c.category_key === category);
        newBreadcrumbs = [
          { label: "Main", query: "", exclude: "" },
          { label: cat ? getCategoryLabel(cat) : category, query: category },
        ];
      }

      load(
        "",
        newBreadcrumbs,
        excludeArg,
        filterBrand,
        categoryKey,
        subcategoryKey,
        true
      );

      if (subcategory) {
        setCategoryFilter(subcategory);
      } else if (category) {
        setCategoryFilter(category);
      } else {
        setCategoryFilter("");
      }
      setBrandFilter(filterBrand || "");
      setForceOpenCategory(!!subcategory);
    } else if (query) {
      navigate(`/?search=${encodeURIComponent(query)}`);
    }
  };

  // Клик по хлебным крошкам
  const handleBreadcrumbClick = async (idx) => {
    const newTrail = breadcrumbs.slice(0, idx + 1);
    const lastCrumb = newTrail[newTrail.length - 1];
    if (lastCrumb.query === "") {
      setBreadcrumbs([{ label: "Main", query: "", exclude: "" }]);
      await load(
        "",
        [{ label: "Main", query: "", exclude: "" }],
        "",
        "",
        "",
        "",
        false
      );
      setCategoryFilter("");
    } else {
      setBreadcrumbs(newTrail);
      await load(
        lastCrumb.query,
        newTrail,
        "",
        "",
        "",
        "",
        false
      );
      setCategoryFilter("");
    }
  };

  useEffect(() => {
    async function initialize() {
      if (location.state && location.state.breadcrumbs) {
        if (location.state.query) {
          await load(
            location.state.query,
            location.state.breadcrumbs,
            "",
            "",
            "",
            "",
            true
          );
        } else {
          await load(
            "",
            location.state.breadcrumbs,
            "",
            "",
            "",
            "",
            true
          );
        }
        setCategoryFilter("");
        return;
      }

      if (urlSearch) {
        const initialBreadcrumbs = [
          { label: "Main", query: "", exclude: "" },
          { label: urlSearch, query: urlSearch, exclude: "" },
        ];
        await load(
          urlSearch,
          initialBreadcrumbs,
          "",
          "",
          "",
          "",
          true
        );
        setCategoryFilter("");
        return;
      }

      await load(
        "",
        [{ label: "Main", query: "", exclude: "" }],
        "",
        "",
        "",
        "",
        true
      );
      setCategoryFilter("");
    }
    initialize();
    // eslint-disable-next-line
  }, [location.search]);

  useEffect(() => {
    async function updateProducts() {
      if (!categoryFilter) {
        await load();
        return;
      }
      if (categoryFilter === "sale") {
        return;
      }

      let categoryKey = "";
      let subcategoryKey = "";

      const cat = categories.find((c) => c.category_key === categoryFilter);
      if (cat) {
        categoryKey = categoryFilter;
      } else {
        for (const c of categories) {
          if (
            (c.subcategories || []).some(
              (sub) =>
                (typeof sub === "string"
                  ? sub
                  : sub.subcategory_key || sub.label) === categoryFilter
            )
          ) {
            categoryKey = c.category_key;
            subcategoryKey = categoryFilter;
            break;
          }
        }
      }

      await load(
        "",
        undefined,
        "",
        brandFilter,
        categoryKey,
        subcategoryKey,
        false
      );
    }

    updateProducts().catch(console.error);
    // eslint-disable-next-line
  }, [categoryFilter, categories]);

  // --- Фильтрация товаров на клиенте ---
  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter === "sale") {
      list = list.filter(
        (p) =>
          Number(p.discount) > 0 ||
          (Number(p.discount_price) > 0 &&
            Number(p.discount_price) < Number(p.price))
      );
    }
    if (
      sizeFilter &&
      (!Array.isArray(list[0]?.sizes) ||
        !list.some(
          (p) => Array.isArray(p.sizes) && p.sizes.includes(sizeFilter)
        ))
    )
      return [];
    if (sizeFilter)
      list = list.filter(
        (p) => Array.isArray(p.sizes) && p.sizes.includes(sizeFilter)
      );
    if (brandFilter) {
      const brandVariants = brandFilter
        .split(",")
        .map((x) => x.trim().toLowerCase());
      list = list.filter(
        (p) =>
          p.brand && brandVariants.includes(p.brand.trim().toLowerCase())
      );
    }
    if (genderFilter) list = list.filter((p) => p.gender === genderFilter);
    return list;
  }, [products, sizeFilter, brandFilter, genderFilter, categoryFilter]);

  // Используем списки из backend для фильтров
  const allSizes = useMemo(() => sizesInFilter, [sizesInFilter]);
  const allBrands = useMemo(() => brandsInFilter, [brandsInFilter]);
  const allGenders = useMemo(() => gendersInFilter, [gendersInFilter]);

  // Формируем опции для Select'а gender
  const genderOptions = useMemo(() => {
    const options = [];
    if (allGenders.length > 1 || !genderFilter) {
      options.push({ value: "", label: "All genders" });
    }
    allGenders.forEach((g) => {
      options.push({
        value: g,
        label: g === "m" ? "Men" : g === "w" ? "Women" : "Kids",
      });
    });
    return options;
  }, [allGenders, genderFilter]);

  const getEffectivePrice = (item) => {
    const fix = (val) => {
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
  };

  const handleCardClick = (productId) => {
    const lastCrumb =
      breadcrumbs[breadcrumbs.length - 1] || { query: "", exclude: "" };
    const searchParam = lastCrumb.query
      ? `?search=${encodeURIComponent(lastCrumb.query)}`
      : "";
    navigate(`/product/${productId}${searchParam}`, {
      state: {
        from: location.pathname + searchParam,
        breadcrumbs: breadcrumbs,
        query: lastCrumb.query,
        exclude: lastCrumb.exclude,
      },
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
        <Breadcrumbs
          items={breadcrumbs}
          onBreadcrumbClick={handleBreadcrumbClick}
        />
      )}

      {isHome && <Banner />}

      {!isHome && (
        <div>
          <FilterBar
            allSizes={allSizes}
            allBrands={allBrands}
            allGenders={allGenders}
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
            showGender={genderOptions.length > 1}
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
            displayedProducts.map((product) => (
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
