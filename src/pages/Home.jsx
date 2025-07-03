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
  return rawProducts.map((p) => ({
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

  // Загрузка категорий
  const { data: categories = [] } = useQuery(["categories"], fetchCategories, {
    staleTime: 5 * 60 * 1000,
  });

  // Подготовка фильтров (без пагинации)
  const filtersForOptions = useMemo(() => {
    let realCategoryKey = categoryKey;
    let realSubcategoryKey = subcategoryKey;
    if (realSubcategoryKey) realCategoryKey = "";

    return {
      categoryKey: realCategoryKey === "sale" ? "" : realCategoryKey, // фильтры для "sale" отдельно
      subcategoryKey: realSubcategoryKey,
      gender: genderFilter,
      size: sizeFilter,
      brand: brandFilter,
      search: isHome ? "" : searchQuery,
    };
  }, [categoryKey, subcategoryKey, genderFilter, sizeFilter, brandFilter, searchQuery, isHome]);

  // Фильтры для брендов, размеров, гендеров
  const { data: brandsInFilter = [] } = useQuery(
    ["brandsFiltered", filtersForOptions],
    () => fetchFilteredBrands(filtersForOptions),
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: sizesInFilter = [] } = useQuery(
    ["sizesFiltered", filtersForOptions],
    () => fetchFilteredSizes(filtersForOptions),
    { staleTime: 5 * 60 * 1000 }
  );
  const { data: gendersInFilter = [] } = useQuery(
    ["gendersFiltered", filtersForOptions],
    () => fetchFilteredGenders(filtersForOptions),
    { staleTime: 5 * 60 * 1000 }
  );

  // Ключ для загрузки товаров
  const productQueryKey = useMemo(() => {
    if (isHome) {
      return ["popularProducts", homeLimit];
    } else if (categoryKey === "sale") {
      // для sale отдельный ключ
      return [
        "productsSale",
        {
          brand: brandFilter,
          sort,
          gender: genderFilter,
          size: sizeFilter,
          limit: PAGE_LIMIT,
          offset: 0, // offset будет в pageParam
        },
      ];
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
          offset: 0,
        },
      ];
    }
  }, [
    isHome,
    homeLimit,
    categoryKey,
    brandFilter,
    sort,
    genderFilter,
    sizeFilter,
    searchQuery,
    subcategoryKey,
  ]);

  // Загрузка товаров с бесконечным скроллом
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
        const raw = await fetchPopularProducts(homeLimit, 0);
        return { data: groupProducts(raw), nextOffset: null };
      } else if (categoryKey === "sale") {
        // Для sale - фильтрация discount>0 на сервере
        // Здесь нужно вызвать fetchProducts с category_key='sale' и пагинацией
        const raw = await fetchProducts(
          "", // search пустой, т.к. в sale не учитываем поиск в имени
          PAGE_LIMIT,
          pageParam,
          "",
          brandFilter,
          sort || "asc",
          "sale", // category_key для sale
          "",
          genderFilter,
          sizeFilter
        );
        const grouped = groupProducts(raw);
        return {
          data: grouped,
          nextOffset: grouped.length === PAGE_LIMIT ? pageParam + PAGE_LIMIT : null,
        };
      } else {
        // Обычный запрос с фильтрами и пагинацией
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
        return {
          data: grouped,
          nextOffset: grouped.length === PAGE_LIMIT ? pageParam + PAGE_LIMIT : null,
        };
      }
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextOffset,
      keepPreviousData: true,
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      enabled: true,
    }
  );

  // Объединяем все страницы товаров
  const products = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  // Бесконечный скролл
  useEffect(() => {
    if (isHome) return; // на главной инфинити скролл не нужен

    function onScroll() {
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.offsetHeight - 600 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isHome]);

  // Подкатегории
  const submenuList = useMemo(() => {
    const cat = categories.find((c) => c.category_key === categoryKey);
    if (!cat) return [];
    return (cat.subcategories || []).map((sub) =>
      typeof sub === "string" ? sub : sub.subcategory_key || sub.label
    );
  }, [categories, categoryKey]);

  // Цена для сортировки
  const getEffectivePrice = (item) => {
    const fix = (val) => {
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

  // Сортировка товаров
  const displayedProducts = useMemo(() => {
    let arr = [...products];
    if (sort === "asc")
      arr.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    else if (sort === "desc")
      arr.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    else if (sort === "popular")
      arr.sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (sort === "discount")
      arr.sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0));
    return arr;
  }, [products, sort]);

  // Навигация при клике на товар
  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`, {
      state: { from: location.pathname + location.search },
    });
  };

  // Навигация с новыми фильтрами
  const navigateWithFilters = useCallback(
    (newFilters = {}) => {
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
    },
    [
      searchQuery,
      categoryKey,
      subcategoryKey,
      sizeFilter,
      brandFilter,
      genderFilter,
      sort,
      navigate,
    ]
  );

  // Обработчики фильтров
  const handleSearch = (query = "") => {
    navigateWithFilters({
      search: query,
      category: "",
      subcategory: "",
      brand: "",
      size: "",
      gender: "",
      sort: "",
    });
  };
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    if (catKey === "sale") {
      navigateWithFilters({
        category: "sale",
        subcategory: "",
        search: "",
        brand: "",
        size: "",
        gender: "",
        sort: "",
      });
    } else {
      navigateWithFilters({
        category: catKey,
        subcategory: subKey,
        search: "",
        brand: "",
        size: "",
        gender: "",
        sort: "",
      });
    }
  };
  const onCategoryChange = (subKey) => {
    navigateWithFilters({
      category: categoryKey,
      subcategory: subKey,
      brand: "",
      size: "",
      gender: "",
      sort: "",
    });
  };
  const onBrandChange = (brand) => navigateWithFilters({ brand });
  const onSizeChange = (size) => navigateWithFilters({ size });
  const onGenderChange = (gender) => navigateWithFilters({ gender });
  const onSortChange = (s) => navigateWithFilters({ sort: s });
  const clearFilters = () =>
    navigateWithFilters({
      search: "",
      category: "",
      subcategory: "",
      brand: "",
      size: "",
      gender: "",
      sort: "",
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

      {!isHome && <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />}

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
              {loadingProducts ? "Loading..." : "No products to display"}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
