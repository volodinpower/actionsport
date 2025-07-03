import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";

import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import Banner from "../components/Banner";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import FilterBar from "../components/FilterBar";
import SortControl from "../components/SortControl";

import {
  fetchProducts,
  fetchPopularProducts,
  fetchCategories,
  fetchFilteredBrands,
  fetchFilteredSizes,
  fetchFilteredGenders,
} from "../api";

const PAGE_LIMIT = 20;

function getColumnsCount() {
  const width = window.innerWidth;
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 640) return 3;
  return 2;
}
function getHomeLimit(cols) {
  if (cols === 5) return 20;
  if (cols === 4) return 20;
  if (cols === 3) return 18;
  return 10;
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

  const searchQuery = urlSearchParams.get("search") || "";
  const categoryKey = urlSearchParams.get("category") || "";
  const subcategoryKey = urlSearchParams.get("subcategory") || "";
  const sizeFilter = urlSearchParams.get("size") || "";
  const brandFilter = urlSearchParams.get("brand") || "";
  const genderFilter = urlSearchParams.get("gender") || "";
  const sort = urlSearchParams.get("sort") || "";

  const isHome = useMemo(
    () => !searchQuery && !categoryKey && !brandFilter && !genderFilter && !sizeFilter,
    [searchQuery, categoryKey, brandFilter, genderFilter, sizeFilter]
  );

  const [categoryLabel, setCategoryLabel] = useState("");
  const [columns, setColumns] = useState(getColumnsCount());
  const [homeLimit, setHomeLimit] = useState(getHomeLimit(columns));

  useEffect(() => {
    function handleResize() {
      const cols = getColumnsCount();
      setColumns(cols);
      setHomeLimit(getHomeLimit(cols));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Категории ---
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // --- Фильтры ---
  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);

  useEffect(() => {
    async function updateFilterOptions() {
      let realCategoryKey = categoryKey;
      let realSubcategoryKey = subcategoryKey;
      if (realSubcategoryKey) realCategoryKey = "";

      const params = {
        categoryKey: realCategoryKey === "sale" ? "" : realCategoryKey,
        subcategoryKey: realSubcategoryKey,
        gender: genderFilter,
        size: sizeFilter,
        search: isHome ? "" : searchQuery,
        brand: brandFilter,
      };

      const brands = await fetchFilteredBrands(params);
      const sizes = await fetchFilteredSizes(params);
      const genders = await fetchFilteredGenders(params);

      setBrandsInFilter(brands);
      setSizesInFilter(sizes);
      setGendersInFilter(genders);
    }
    updateFilterOptions();
  }, [categoryKey, subcategoryKey, genderFilter, sizeFilter, searchQuery, brandFilter, isHome]);

  // --- React Query infinite query ---
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery(
    [
      "products",
      {
        search: searchQuery,
        category_key: categoryKey,
        subcategory_key: subcategoryKey,
        size: sizeFilter,
        brand: brandFilter,
        gender: genderFilter,
        sort,
        isHome,
        homeLimit,
      },
    ],
    ({ pageParam = 0 }) => {
      if (isHome) {
        return fetchPopularProducts(homeLimit, 0).then(groupProducts);
      }
      if (categoryKey === "sale") {
        return fetchProducts(
          "",
          PAGE_LIMIT,
          pageParam,
          "",
          brandFilter,
          sort || "asc",
          "sale",
          "",
          genderFilter,
          sizeFilter
        ).then(groupProducts);
      }
      return fetchProducts(
        searchQuery,
        PAGE_LIMIT,
        pageParam,
        "",
        brandFilter,
        sort || "asc",
        categoryKey,
        subcategoryKey,
        genderFilter,
        sizeFilter
      ).then(groupProducts);
    },
    {
      getNextPageParam: (lastPage, pages) =>
        lastPage.length === PAGE_LIMIT ? pages.length * PAGE_LIMIT : undefined,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  // Объединяем страницы
  const products = useMemo(() => {
    if (!data) return [];
    return data.pages.flat();
  }, [data]);

  // --- Подкатегории ---
  const submenuList = useMemo(() => {
    const cat = categories.find(c => c.category_key === categoryKey);
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

  // Навигация на страницу товара
  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`, {
      state: { from: location.pathname + location.search },
    });
  };

  // Управление фильтрами в URL
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
      ...newFilters,
    })) {
      if (value) params.set(key, value);
    }
    navigate({ pathname: "/", search: params.toString() });
  }

  const handleSearch = (query = "") => {
    updateUrlFilters({ search: query });
  };
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
  const onCategoryChange = (subKey) => {
    updateUrlFilters({
      category: categoryKey,
      subcategory: subKey,
      brand: "",
      size: "",
      gender: "",
      sort: "",
    });
  };
  const onBrandChange = (brand) => {
    updateUrlFilters({ ...getCurrentFilters(), brand });
  };
  const onSizeChange = (size) => {
    updateUrlFilters({ ...getCurrentFilters(), size });
  };
  const onGenderChange = (gender) => {
    updateUrlFilters({ ...getCurrentFilters(), gender });
  };
  const onSortChange = (s) => {
    updateUrlFilters({ ...getCurrentFilters(), sort: s });
  };
  const clearFilters = () => {
    updateUrlFilters({
      search: "",
      category: "",
      subcategory: "",
      size: "",
      brand: "",
      gender: "",
      sort: "",
    });
  };
  const getCurrentFilters = () => ({
    search: searchQuery,
    category: categoryKey,
    subcategory: subcategoryKey,
    size: sizeFilter,
    brand: brandFilter,
    gender: genderFilter,
    sort,
  });

  // Хлебные крошки
  const breadcrumbs = useMemo(() => {
    if (searchQuery) {
      return [
        { label: "Main", query: "" },
        { label: `Search: ${searchQuery}`, query: searchQuery },
      ];
    }
    if (categoryKey) {
      return [
        { label: "Main", query: "" },
        { label: categoryLabel || categoryKey, query: categoryKey },
      ];
    }
    return [{ label: "Main", query: "" }];
  }, [searchQuery, categoryKey, categoryLabel]);

  const handleBreadcrumbClick = (idx) => {
    if (idx === 0) clearFilters();
  };

  // Подгрузка при скролле
  useEffect(() => {
    if (isHome) return;
    if (!hasNextPage || isFetchingNextPage) return;

    function onScroll() {
      if (
        window.innerHeight + document.documentElement.scrollTop
        >= document.documentElement.offsetHeight - 600
      ) {
        fetchNextPage();
      }
    }

    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isHome]);

  // Рендер
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
        <>
          <FilterBar
            allSizes={sizesInFilter}
            allBrands={brandsInFilter}
            submenuList={submenuList}
            sizeFilter={sizeFilter}
            brandFilter={brandFilter}
            genderFilter={genderFilter}
            categoryFilter={subcategoryKey}
            genderOptions={gendersInFilter.map((g) => ({
              value: g,
              label: g === "m" ? "Men" : g === "w" ? "Women" : g === "k" ? "Kids" : g,
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
          <SortControl sort={sort} setSort={onSortChange} />
        </>
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
              {isLoading || isFetching ? "Loading..." : "No products to display"}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
