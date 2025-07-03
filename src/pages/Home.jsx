import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
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

  // Колонки и лимит для главной
  const [columns, setColumns] = useState(getColumnsCount());
  const [homeLimit, setHomeLimit] = useState(getHomeLimit(getColumnsCount()));

  useEffect(() => {
    function handleResize() {
      const cols = getColumnsCount();
      setColumns(cols);
      setHomeLimit(getHomeLimit(cols));
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Загрузка категорий ---
  const { data: categories = [], isLoading: loadingCategories } = useQuery(
    ["categories"],
    fetchCategories,
    { staleTime: 1000 * 60 * 5 }
  );

  // --- Подготовка фильтров (без пагинации!) ---
  const filtersForOptions = useMemo(() => {
    let realCategoryKey = categoryKey;
    let realSubcategoryKey = subcategoryKey;
    if (realSubcategoryKey) realCategoryKey = "";

    return {
      categoryKey: realCategoryKey,
      subcategoryKey: realSubcategoryKey,
      gender: genderFilter,
      size: sizeFilter,
      brand: brandFilter,
      search: isHome ? "" : searchQuery, // Можно по-разному
    };
  }, [categoryKey, subcategoryKey, genderFilter, sizeFilter, brandFilter, searchQuery, isHome]);

  // --- Фильтры ---
  const { data: brandsInFilter = [] } = useQuery(
    ["brandsFiltered", filtersForOptions],
    () => fetchFilteredBrands(filtersForOptions),
    { staleTime: 1000 * 60 * 5 }
  );
  const { data: sizesInFilter = [] } = useQuery(
    ["sizesFiltered", filtersForOptions],
    () => fetchFilteredSizes(filtersForOptions),
    { staleTime: 1000 * 60 * 5 }
  );
  const { data: gendersInFilter = [] } = useQuery(
    ["gendersFiltered", filtersForOptions],
    () => fetchFilteredGenders(filtersForOptions),
    { staleTime: 1000 * 60 * 5 }
  );

  // --- Загрузка товаров с пагинацией (инфинити скролл) ---

  const productQueryKey = useMemo(() => {
    if (isHome) {
      return ["popularProducts", homeLimit];
    } else {
      return [
        "products",
        {
          search: searchQuery,
          brand: brandFilter,
          sort,
          category_key: categoryKey,
          subcategory_key: subcategoryKey,
          gender: genderFilter,
          size: sizeFilter,
          limit: PAGE_LIMIT,
        },
      ];
    }
  }, [isHome, homeLimit, searchQuery, brandFilter, sort, categoryKey, subcategoryKey, genderFilter, sizeFilter]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingProducts,
    refetch: refetchProducts,
  } = useInfiniteQuery(
    productQueryKey,
    async ({ pageParam = 0 }) => {
      if (isHome) {
        // Популярные - без пагинации
        const raw = await fetchPopularProducts(homeLimit, 0);
        return { data: groupProducts(raw), nextOffset: null };
      } else {
        const raw = await fetchProducts(
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
        );
        const grouped = groupProducts(raw);
        return { data: grouped, nextOffset: grouped.length === PAGE_LIMIT ? pageParam + PAGE_LIMIT : null };
      }
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextOffset,
      keepPreviousData: true,
      staleTime: 1000 * 60 * 2,
      cacheTime: 1000 * 60 * 10,
      enabled: true,
    }
  );

  // --- Собираем все загруженные страницы в один массив ---
  const products = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.data);
  }, [data]);

  // --- Infinite scroll (пагинация) ---
  useEffect(() => {
    if (isHome) return; // отключаем инфинити скролл на главной

    function onScroll() {
      if (
        window.innerHeight + window.scrollY >= document.documentElement.offsetHeight - 600 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isHome]);

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

  // --- Обработчики кликов и смены фильтров ---
  const navigateWithFilters = useCallback((newFilters = {}) => {
    const params = new URLSearchParams();
    const currentFilters = {
      search: searchQuery,
      category: categoryKey,
      subcategory: subcategoryKey,
      size: sizeFilter,
      brand: brandFilter,
      gender: genderFilter,
      sort,
      ...newFilters,
    };
    Object.entries(currentFilters).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    navigate({ pathname: "/", search: params.toString() });
  }, [searchQuery, categoryKey, subcategoryKey, sizeFilter, brandFilter, genderFilter, sort, navigate]);

  const handleSearch = (query = "") => {
    navigateWithFilters({ search: query, category: "", subcategory: "", brand: "", size: "", gender: "", sort: "" });
  };

  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    navigateWithFilters({ category: catKey, subcategory: subKey, search: "", brand: "", size: "", gender: "", sort: "" });
  };

  const onCategoryChange = (subKey) => {
    navigateWithFilters({ category: categoryKey, subcategory: subKey, brand: "", size: "", gender: "", sort: "" });
  };
  const onBrandChange = (brand) => {
    navigateWithFilters({ brand });
  };
  const onSizeChange = (size) => {
    navigateWithFilters({ size });
  };
  const onGenderChange = (gender) => {
    navigateWithFilters({ gender });
  };
  const onSortChange = (s) => {
    navigateWithFilters({ sort: s });
  };

  const clearFilters = () => {
    navigateWithFilters({ search: "", category: "", subcategory: "", brand: "", size: "", gender: "", sort: "" });
  };

  // --- Breadcrumbs ---
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
        { label: categoryKey, query: categoryKey }
      ];
    }
    return [{ label: "Main", query: "" }];
  }, [searchQuery, categoryKey]);

  const handleBreadcrumbClick = idx => {
    if (idx === 0) clearFilters();
  };

  // --- Подкатегории ---
  const submenuList = useMemo(() => {
    const cat = categories.find(c => c.category_key === categoryKey);
    if (!cat) return [];
    return (cat.subcategories || []).map(sub =>
      typeof sub === "string" ? sub : sub.subcategory_key || sub.label
    );
  }, [categories, categoryKey]);

  // --- Render ---
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
          <SortControl sort={sort} setSort={onSortChange} />
        </>
      )}

      <div className="mx-auto px-2 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-2">
          {displayedProducts.length > 0 ? (
            displayedProducts.map(product => (
              <ProductCard
                key={product.id || product.name + product.color}
                product={product}
                onClick={() => navigate(`/product/${product.id}`, {
                  state: { from: location.pathname + location.search }
                })}
              />
            ))
          ) : (
            <div className="col-span-5 text-center text-gray-500 py-12">
              {loadingProducts ? "Loading..." : "No products to display"}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
