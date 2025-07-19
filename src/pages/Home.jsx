import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Header from "../components/Header";
import ProductCard from "../components/ProductCard";
import Banner from "../components/Banner";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import FilterBar from "../components/FilterBar";
import SortControl from "../components/SortControl";
import ScrollTopButton from "../components/ScrollTopButton";
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
  return 20;
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

  // --- фильтры из URL ---
  const urlSearchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchQuery = urlSearchParams.get("search") || "";
  const categoryKey = urlSearchParams.get("category") || "";
  const subcategoryKey = urlSearchParams.get("subcategory") || "";
  const sizeFilter = urlSearchParams.get("size") || "";
  const brandFilter = urlSearchParams.get("brand") || "";
  const genderFilter = urlSearchParams.get("gender") || "";
  const sort = urlSearchParams.get("sort") || "";

  // --- режимы ---
  const isHome = useMemo(
    () => !searchQuery && !categoryKey && !brandFilter && !genderFilter && !sizeFilter,
    [searchQuery, categoryKey, brandFilter, genderFilter, sizeFilter]
  );
  const isBrandPage = categoryKey === "brands" && !!brandFilter;
  const isSale = categoryKey === "sale";

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

  // --- категории для меню/фильтра ---
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  // --- фильтры для FilterBar ---
  const [brandsInFilter, setBrandsInFilter] = useState([]);
  const [sizesInFilter, setSizesInFilter] = useState([]);
  const [gendersInFilter, setGendersInFilter] = useState([]);
  const [submenuList, setSubmenuList] = useState([]);

  // --- Фильтры: логика для sale, brands, остальных
  useEffect(() => {
    async function updateFilterOptions() {
      // --- BRANDS (при выбранном бренде) ---
      if (isBrandPage) {
        setBrandsInFilter([]);
        const products = await fetchProducts(
          searchQuery, 500, 0, "", brandFilter
        );
        const setSubs = new Set();
        products.forEach(p => {
          if (p.subcategory_key) setSubs.add(p.subcategory_key);
        });
        const subcategories = Array.from(setSubs);
        setSubmenuList(subcategories);

        const sizes = await fetchFilteredSizes({
          categoryKey: "",
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          size: sizeFilter,
          search: searchQuery,
        });
        setSizesInFilter(sizes);

        const genders = await fetchFilteredGenders({
          categoryKey: "",
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          size: sizeFilter,
          search: searchQuery,
        });
        setGendersInFilter(genders);
      }
      // --- SALE ---
      else if (isSale) {
        const saleProducts = await fetchProducts(
          searchQuery,
          500,
          0,
          "",
          brandFilter,
          "asc",
          "sale",
          subcategoryKey,
          genderFilter,
          sizeFilter
        );
        const setSubs = new Set();
        saleProducts.forEach(p => {
          if (p.subcategory_key) setSubs.add(p.subcategory_key);
        });
        const subcategories = Array.from(setSubs);
        setSubmenuList(subcategories);

        const brands = await fetchFilteredBrands({
          categoryKey: "sale",
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          size: sizeFilter,
          search: searchQuery,
        });
        setBrandsInFilter(brands);

        const sizes = await fetchFilteredSizes({
          categoryKey: "sale",
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          size: sizeFilter,
          search: searchQuery,
        });
        setSizesInFilter(sizes);

        const genders = await fetchFilteredGenders({
          categoryKey: "sale",
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          size: sizeFilter,
          search: searchQuery,
        });
        setGendersInFilter(genders);
      }
      // --- ОСТАЛЬНЫЕ ---
      else {
        const brands = await fetchFilteredBrands({
          categoryKey,
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          size: sizeFilter,
          search: searchQuery,
        });
        setBrandsInFilter(brands);

        const sizes = await fetchFilteredSizes({
          categoryKey,
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          size: sizeFilter,
          search: searchQuery,
        });
        setSizesInFilter(sizes);

        const genders = await fetchFilteredGenders({
          categoryKey,
          subcategoryKey,
          brand: brandFilter,
          gender: genderFilter,
          size: sizeFilter,
          search: searchQuery,
        });
        setGendersInFilter(genders);

        const cat = categories.find(c => c.category_key === categoryKey);
        if (cat && cat.subcategories) {
          setSubmenuList(
            cat.subcategories.map(sub =>
              typeof sub === "string" ? sub : sub.subcategory_key || sub.label
            )
          );
        } else {
          setSubmenuList([]);
        }
      }
    }
    updateFilterOptions();
  }, [
    isBrandPage,
    isSale,
    categoryKey,
    subcategoryKey,
    genderFilter,
    sizeFilter,
    searchQuery,
    brandFilter,
    categories,
  ]);

  // --- infinite query ---
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isFetching,
  } = useInfiniteQuery({
    queryKey: [
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
    queryFn: ({ pageParam = 0 }) => {
      if (isHome) {
        return fetchPopularProducts(homeLimit, 0).then(groupProducts);
      }
      if (isBrandPage) {
        return fetchProducts(
          searchQuery,
          PAGE_LIMIT,
          pageParam,
          "",
          brandFilter,
          sort || "asc",
          "",
          subcategoryKey,
          genderFilter,
          sizeFilter
        ).then(groupProducts);
      }
      if (isSale) {
        return fetchProducts(
          searchQuery,
          PAGE_LIMIT,
          pageParam,
          "",
          brandFilter,
          sort || "asc",
          "sale",
          subcategoryKey,
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
    getNextPageParam: (lastPage, allPages) => {
      if (isHome) return undefined;
      return lastPage.length === PAGE_LIMIT ? allPages.length * PAGE_LIMIT : undefined;
    },
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

  // --- анимация ---
  const prevCountRef = useRef(PAGE_LIMIT);
  useEffect(() => {
    if (!data) return;
    const flatLength = data.pages.flat().length;
    if (flatLength > prevCountRef.current) {
      prevCountRef.current = flatLength - PAGE_LIMIT;
    }
    if (isHome || (data.pages && data.pages.length === 1)) {
      prevCountRef.current = PAGE_LIMIT;
    }
  }, [data, isHome, searchQuery, categoryKey, subcategoryKey, brandFilter, genderFilter, sizeFilter, sort]);
  const products = useMemo(() => (!data ? [] : data.pages.flat()), [data]);

  // --- сортировка ---
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

  // --- клик по карточке ---
  const handleCardClick = (productId) => {
    navigate(`/product/${productId}`, {
      state: { from: location.pathname + location.search },
    });
  };

  // --- url-фильтры ---
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
  const handleSearch = (query = "") => updateUrlFilters({ search: query });

  // --- обработчик клика по меню ---
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    setCategoryLabel(catLabel || "");
    if (catKey === "brands" && subKey) {
      updateUrlFilters({
        category: "brands",
        brand: subKey,
        gender: "",
        size: "",
        sort: "",
      });
    }
    else if (catKey === "brands") {
      navigate("/brands");
    } else {
      updateUrlFilters({
        category: catKey,
        subcategory: subKey || "",
        search: "",
        brand: "",
        size: "",
        gender: "",
        sort: "",
      });
    }
  };

  const onCategoryChange = (subKey) => {
    updateUrlFilters({
      ...getCurrentFilters(),
      subcategory: subKey,
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

  // --- хлебные крошки ---
  const breadcrumbs = useMemo(() => {
    if (brandFilter && categoryKey === "brands") {
      return [
        { label: "Main", query: "" },
        { label: "Brands", query: "brands" },
        { label: brandFilter, query: "" },
      ];
    }
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
  }, [searchQuery, categoryKey, categoryLabel, brandFilter]);

  const handleBreadcrumbClick = (idx) => {
    if (idx === 0) clearFilters();
    if (idx === 1 && (brandFilter && categoryKey === "brands"))
      updateUrlFilters({ category: "brands", brand: "" });
  };

  // --- ScrollTopButton логика ---
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pageLoads, setPageLoads] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (data && data.pages && data.pages.length > 1) {
      setPageLoads(data.pages.length - 1);
    }
  }, [data]);

  useEffect(() => {
    const handleScroll = () => {
      if (isMobile) {
        if (products.length > 10 && window.scrollY > 150) {
          setShowScrollTop(true);
        } else {
          setShowScrollTop(false);
        }
      } else {
        if (window.scrollY > 400 && pageLoads > 0) {
          setShowScrollTop(true);
        } else {
          setShowScrollTop(false);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [pageLoads, products.length, isMobile]);

  // --- подгрузка ---
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
        activeCategoryKey={categoryKey}
      />

      {!isHome && (
        <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={handleBreadcrumbClick} />
      )}

      {isHome && <Banner />}

      {/* Фильтры и товары */}
      {!isHome && (
        <div>
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
            showGender={gendersInFilter.length > 1 || !!genderFilter}
            showCategory={true}
            brandsMode={isBrandPage}
            hideBrandSelect={isBrandPage}
            onCategoryChange={onCategoryChange}
            onBrandChange={onBrandChange}
            onSizeChange={onSizeChange}
            onGenderChange={onGenderChange}
          />
          <div>
            <SortControl sort={sort} setSort={onSortChange} />
          </div>
        </div>
      )}

      {/* Список товаров */}
      <div className="mx-auto px-2 pb-12">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-2">
          <AnimatePresence initial={false}>
            {displayedProducts.map((product, idx) => {
              const isAnimated = !isHome && idx >= prevCountRef.current;
              if (isAnimated) {
                return (
                  <motion.div
                    key={product.id || product.name + product.color}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.18,
                      delay: (idx - prevCountRef.current) * 0.03,
                      type: "spring",
                      stiffness: 120,
                      damping: 20,
                    }}
                    exit={false}
                  >
                    <ProductCard
                      product={product}
                      onClick={() => handleCardClick(product.id)}
                    />
                  </motion.div>
                );
              } else {
                return (
                  <div key={product.id || product.name + product.color}>
                    <ProductCard
                      product={product}
                      onClick={() => handleCardClick(product.id)}
                    />
                  </div>
                );
              }
            })}
          </AnimatePresence>
        </div>
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="w-8 h-8 border-4 border-neutral-300 border-t-neutral-900 rounded-full"
            />
          </div>
        )}
      </div>

      <ScrollTopButton show={showScrollTop} />
      <Footer />
    </>
  );
}
