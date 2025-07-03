import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

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

const PAGE_LIMIT = 20;

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

  // --- Загрузка категорий (однократно) ---
  const { data: categories = [] } = useQuery(
    ["categories"],
    fetchCategories,
    { staleTime: 5 * 60 * 1000 } // 5 минут кэш
  );

  // --- Загрузка фильтров (бренды, размеры, пол) ---
  const { data: brandsInFilter = [] } = useQuery(
    ["brandsFiltered", categoryKey, subcategoryKey, genderFilter, sizeFilter, searchQuery],
    () =>
      fetchFilteredBrands({
        categoryKey: categoryKey === "sale" ? "sale" : categoryKey,
        subcategoryKey,
        gender: genderFilter,
        size: sizeFilter,
        search: searchQuery,
      }),
    { staleTime: 2 * 60 * 1000 }
  );

  const { data: sizesInFilter = [] } = useQuery(
    ["sizesFiltered", categoryKey, subcategoryKey, brandFilter, genderFilter, searchQuery],
    () =>
      fetchFilteredSizes({
        categoryKey: categoryKey === "sale" ? "sale" : categoryKey,
        subcategoryKey,
        brand: brandFilter,
        gender: genderFilter,
        search: searchQuery,
      }),
    { staleTime: 2 * 60 * 1000 }
  );

  const { data: gendersInFilter = [] } = useQuery(
    ["gendersFiltered", categoryKey, subcategoryKey, brandFilter, sizeFilter, searchQuery],
    () =>
      fetchFilteredGenders({
        categoryKey: categoryKey === "sale" ? "sale" : categoryKey,
        subcategoryKey,
        brand: brandFilter,
        size: sizeFilter,
        search: searchQuery,
      }),
    { staleTime: 2 * 60 * 1000 }
  );

  // --- Подкатегории ---
  const submenuList = useMemo(() => {
    const cat = categories.find(c => c.category_key === categoryKey);
    if (!cat) return [];
    return (cat.subcategories || []).map(sub => (typeof sub === "string" ? sub : sub.subcategory_key || sub.label));
  }, [categories, categoryKey]);

  // --- Инфинити скролл с React Query ---
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch,
  } = useInfiniteQuery(
    ["products", searchQuery, categoryKey, subcategoryKey, brandFilter, genderFilter, sizeFilter, sort],
    async ({ pageParam = 0 }) => {
      if (isHome) {
        // Для главной страницы подгружаем популярные
        const popular = await fetchPopularProducts(PAGE_LIMIT, pageParam);
        return { products: groupProducts(popular), nextOffset: null };
      }
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
      return { products: groupProducts(raw), nextOffset: raw.length === PAGE_LIMIT ? pageParam + PAGE_LIMIT : null };
    },
    {
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 2 * 60 * 1000,
      keepPreviousData: true,
      refetchOnWindowFocus: false,
    }
  );

  // --- Объединяем страницы ---
  const allProducts = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap(page => page.products);
  }, [data]);

  // --- Сортировка локальная (если нужно) ---
  const getEffectivePrice = item => {
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
    let arr = [...allProducts];
    if (sort === "asc") arr.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    else if (sort === "desc") arr.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    else if (sort === "popular") arr.sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (sort === "discount") arr.sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0));
    return arr;
  }, [allProducts, sort]);

  // --- Хендлеры для фильтров и поиска ---
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
    updateUrlFilters({ search: query, category: "", subcategory: "", brand: "", size: "", gender: "", sort: "" });
  };

  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    setCategoryLabel(catLabel || "");
    updateUrlFilters({ category: catKey, subcategory: subKey || "", search: "", brand: "", size: "", gender: "", sort: "" });
  };

  const onCategoryChange = (subKey) => {
    updateUrlFilters({ category: categoryKey, subcategory: subKey, brand: "", size: "", gender: "", sort: "" });
  };
  const onBrandChange = (brand) => {
    updateUrlFilters({ category: categoryKey, subcategory: subcategoryKey, brand, size: sizeFilter, gender: genderFilter, sort });
  };
  const onSizeChange = (size) => {
    updateUrlFilters({ category: categoryKey, subcategory: subcategoryKey, brand: brandFilter, size, gender: genderFilter, sort });
  };
  const onGenderChange = (gender) => {
    updateUrlFilters({ category: categoryKey, subcategory: subcategoryKey, brand: brandFilter, size: sizeFilter, gender, sort });
  };
  const onSortChange = (s) => {
    updateUrlFilters({ category: categoryKey, subcategory: subcategoryKey, brand: brandFilter, size: sizeFilter, gender: genderFilter, sort: s });
  };

  function clearFilters() {
    updateUrlFilters({ search: "", category: "", subcategory: "", size: "", brand: "", gender: "", sort: "" });
  }

  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`, { state: { from: location.pathname + location.search } });
  };

  // --- Обработка скролла для загрузки следующей страницы ---
  // Можно использовать Intersection Observer, но для простоты:
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    function onScroll() {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 600
      ) {
        fetchNextPage();
      }
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // --- Рендер ---
  return (
    <>
      <Header
        onSearch={handleSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={[
          { label: "Main", query: "" },
          ...(searchQuery
            ? [{ label: `Search: ${searchQuery}`, query: searchQuery }]
            : categoryKey
            ? [{ label: categoryKey, query: categoryKey }]
            : []),
        ]}
        isHome={isHome}
        setCategoryFilter={() => {}}
        setForceOpenCategory={() => {}}
        navigate={navigate}
      />

      {!isHome && (
        <Breadcrumbs
          items={[
            { label: "Main", query: "" },
            { label: categoryKey || "Category", query: categoryKey },
          ]}
          onBreadcrumbClick={idx => {
            if (idx === 0) clearFilters();
          }}
        />
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
          {status === "loading" ? (
            <div className="col-span-5 text-center py-12">Loading...</div>
          ) : displayedProducts.length > 0 ? (
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
        {isFetchingNextPage && <div className="text-center py-4">Loading more...</div>}
      </div>

      <Footer />
    </>
  );
}
