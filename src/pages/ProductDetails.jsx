import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useLayoutEffect, useRef, useState, useMemo } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import {
  fetchProductById,
  incrementProductView,
  fetchBrandInfoByName,
  fetchBrands,
} from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import { useAuth } from "../components/AuthProvider";
import { useToast } from "../components/ToastProvider";
import "./ProductDetails.css";
import "swiper/css";
import "swiper/css/pagination";

const formatBreadcrumbLabel = (value) => {
  if (!value) return "";
  return value
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const THUMB_SCROLL_STEP = 78;
const THUMB_HOVER_STEP = 8;

function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}

function makeImageUrl(url) {
  if (!url) return "/no-image.jpg";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return apiUrl(url);
  return url;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function sortColorVariants(a, b) {
  return (a.color || "").localeCompare(b.color || "", undefined, { sensitivity: "base" });
}

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user, isFavorite, addFavorite, removeFavorite } = useAuth();
  const { showToast } = useToast();

  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [mainIndex, setMainIndex] = useState(0);
  const [modalIndex, setModalIndex] = useState(0);
  const [colorVariants, setColorVariants] = useState([]);
  const [selectedColorId, setSelectedColorId] = useState(null);
  const thumbnailScrollRef = useRef(null);
  const hoverScrollFrameRef = useRef(null);
  const hoverDirectionRef = useRef(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [brandInfo, setBrandInfo] = useState(null);
  const [brandInfoLoading, setBrandInfoLoading] = useState(false);
  const brandTextRef = useRef(null);
  const [brandTextSize, setBrandTextSize] = useState(14);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    fetchProductById(id)
      .then((data) => {
        setProduct(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load product");
        setProduct(null);
      });
  }, [id]);

  useEffect(() => {
    if (id) incrementProductView(id);
  }, [id]);

  useEffect(() => {
    if (!product || !Array.isArray(product.all_colors)) {
      setColorVariants([]);
      return;
    }
    const variants = [...product.all_colors].sort(sortColorVariants);
    setColorVariants(variants);
  }, [product]);

  useEffect(() => {
    if (!product) return;
    if (location.state && location.state.color) {
      const found = product?.all_colors?.find(
        (c) =>
          c.color === location.state.color || String(c.id) === String(location.state.color)
      );
      if (found) {
        setSelectedColorId(found.id);
      } else if (product?.id) {
        setSelectedColorId(product.id);
      }
    } else if (product?.id) {
      setSelectedColorId(product.id);
    }
  }, [product, location.state]);

  let rawImages = [];
  if (product && typeof product.image_url === "string" && product.image_url.trim()) {
    const urls = product.image_url
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    const numbered = urls.filter((url) => /_\d+\./.test(url));
    rawImages =
      numbered.length > 0
        ? numbered
        : urls.filter((u) => /_(main|prev)\./i.test(u));
    if (rawImages.length === 0) rawImages = urls;
    rawImages = rawImages.map(makeImageUrl);
  }
  if (!rawImages || rawImages.length === 0) rawImages = ["/no-image.jpg"];

  useEffect(() => {
    setMainIndex(0);
  }, [id, product?.image_url]);

  useEffect(() => {
    let cancelled = false;
    async function loadBrand() {
      if (!product?.brand) {
        setBrandInfo(null);
        return;
      }
      setBrandInfoLoading(true);
      try {
        let data = await fetchBrandInfoByName(product.brand);
        if (!data) {
          const list = await fetchBrands(product.brand);
          const match = Array.isArray(list)
            ? list.find(
                (b) => b.name && b.name.toLowerCase() === product.brand.toLowerCase()
              )
            : null;
          data = match || null;
        }
        if (!cancelled) {
          setBrandInfo(data);
        }
      } catch {
        if (!cancelled) setBrandInfo(null);
      } finally {
        if (!cancelled) setBrandInfoLoading(false);
      }
    }
    loadBrand();
    return () => {
      cancelled = true;
    };
  }, [product?.brand]);

  useEffect(() => {
    const handler = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useLayoutEffect(() => {
    if (isMobile || !brandInfo?.description || !brandInfo?.name) {
      setBrandTextSize(14);
      return;
    }
    const container = brandTextRef.current;
    if (!container) return;
    const maxHeight = container.clientHeight || 0;
    if (maxHeight <= 0) return;
    let size = 16;
    const minSize = 10;
    container.style.fontSize = `${size}px`;
    while (container.scrollHeight > maxHeight && size > minSize) {
      size -= 0.5;
      container.style.fontSize = `${size}px`;
    }
    setBrandTextSize(size);
  }, [brandInfo?.description, brandInfo?.name, viewportWidth, isMobile]);

  useEffect(() => {
    return () => {
      if (hoverScrollFrameRef.current) {
        cancelAnimationFrame(hoverScrollFrameRef.current);
        hoverScrollFrameRef.current = null;
      }
      hoverDirectionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (isMobile) return;
    const container = thumbnailScrollRef.current;
    if (!container) return;
    const updateScrollState = () => {
      const tolerance = 2;
      setCanScrollUp(container.scrollTop > tolerance);
      setCanScrollDown(
        container.scrollTop + container.clientHeight <
          container.scrollHeight - tolerance
      );
    };
    updateScrollState();
    container.addEventListener("scroll", updateScrollState);
    window.addEventListener("resize", updateScrollState);
    return () => {
      container.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [isMobile, rawImages.length]);

  useEffect(() => {
    if (isMobile) return;
    const container = thumbnailScrollRef.current;
    if (!container) return;
    const target = container.querySelector(`[data-thumb-index="${mainIndex}"]`);
    if (!target) return;
    const elementTop = target.offsetTop;
    const elementBottom = elementTop + target.offsetHeight;
    const viewTop = container.scrollTop;
    const viewBottom = viewTop + container.clientHeight;
    if (elementTop < viewTop) {
      container.scrollTo({ top: elementTop, behavior: "smooth" });
    } else if (elementBottom > viewBottom) {
      container.scrollTo({
        top: elementBottom - container.clientHeight,
        behavior: "smooth",
      });
    }
  }, [mainIndex, isMobile, rawImages.length]);

  const activeVariant = useMemo(() => {
    if (!product) return null;
    if (colorVariants.length > 0 && selectedColorId) {
      const match = colorVariants.find(
        (variant) => String(variant.id) === String(selectedColorId),
      );
      if (match) {
        return {
          ...match,
          id: match.id || product.id,
          name: match.name || product.name,
          sitename: match.sitename || match.name || product.sitename || product.name,
          color: match.color || product.color,
          image_url: match.image_url || product.image_url,
          price: match.price || product.price,
          discount: match.discount ?? product.discount,
          discount_price: match.discount_price ?? product.discount_price,
          sizes: match.sizes || product.sizes,
        };
      }
    }
    return {
      id: product.id,
      name: product.name,
      sitename: product.sitename || product.name,
      color: product.color,
      image_url: product.image_url,
      price: product.price,
      discount: product.discount,
      discount_price: product.discount_price,
      sizes: product.sizes,
    };
  }, [product, colorVariants, selectedColorId]);

  const displayName = activeVariant?.sitename || product?.sitename || product?.name || "";
  const currentColor = activeVariant?.color || product?.color || "";
  const favoriteProductPayload = useMemo(() => {
    if (!activeVariant) return null;
    const normalize = (value) => {
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        return value.split(",").map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };
    return {
      ...activeVariant,
      sizes: normalize(activeVariant.sizes),
    };
  }, [activeVariant]);

  if (error)
    return <div style={{ padding: 32, textAlign: "center", color: "red" }}>Error: {error}</div>;
  if (!product)
    return <div style={{ padding: 32, textAlign: "center" }}>Loading...</div>;

  const normalizeSizes = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };
  const variantSizes = normalizeSizes(activeVariant?.sizes);
  const fallbackSizes = normalizeSizes(product?.sizes);
  const currentSizes = variantSizes.length ? variantSizes : fallbackSizes;

  const favoriteActive = Boolean(
    user &&
      activeVariant &&
      isFavorite(activeVariant.name || "", activeVariant.color || ""),
  );

  const categoryLabel = formatBreadcrumbLabel(product?.category || product?.category_key);
  const subcategoryLabel = formatBreadcrumbLabel(product?.subcategory_key);
  const breadcrumbs = [{ label: "Main", key: "home" }];
  if (subcategoryLabel) breadcrumbs.push({ label: subcategoryLabel, key: "subcategory" });
  breadcrumbs.push({ label: displayName, key: "product" });

  const handleHeaderSearch = (query) => {
    navigate(query ? "/?search=" + encodeURIComponent(query) : "/");
  };

  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    const params = new URLSearchParams();
    if (catKey) params.set("category", catKey);
    if (subKey) params.set("subcategory", subKey);
    navigate({ pathname: "/", search: params.toString() });
  };

  const handleFavoriteToggle = async () => {
    if (!favoriteProductPayload || !user) return;
    try {
      if (favoriteActive) {
        await removeFavorite(favoriteProductPayload);
        showToast("Removed from favorites");
      } else {
        await addFavorite(favoriteProductPayload);
        showToast("Added to favorites");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Favorite toggle failed", err);
    }
  };

  const handleGoBack = () => {
    if (location.state?.from && location.state.from !== "/") {
      navigate(location.state.from);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleBreadcrumbClick = (idx) => {
    const target = breadcrumbs[idx];
    if (!target) return;
    if (target.key === "home") {
      handleGoBack();
      return;
    }
  if (target.key === "category" && product?.category_key) {
    const params = new URLSearchParams();
    params.set("category", product.category_key);
    navigate({ pathname: "/", search: params.toString() });
    return;
  }
    if (target.key === "subcategory") {
      const params = new URLSearchParams();
      if (product?.category_key) params.set("category", product.category_key);
      if (product?.subcategory_key) params.set("subcategory", product.subcategory_key);
      navigate({ pathname: "/", search: params.toString() });
    }
  };

  const scrollThumbnails = (direction) => {
    stopHoverScroll();
    const container = thumbnailScrollRef.current;
    if (!container) return;
    const delta = direction === "up" ? -THUMB_SCROLL_STEP : THUMB_SCROLL_STEP;
    container.scrollBy({ top: delta, behavior: "smooth" });
  };

  const stopHoverScroll = () => {
    hoverDirectionRef.current = null;
    if (hoverScrollFrameRef.current) {
      cancelAnimationFrame(hoverScrollFrameRef.current);
      hoverScrollFrameRef.current = null;
    }
  };

  const hoverScrollStep = () => {
    const container = thumbnailScrollRef.current;
    if (!container || !hoverDirectionRef.current) {
      hoverScrollFrameRef.current = null;
      return;
    }
    const delta =
      hoverDirectionRef.current === "up" ? -THUMB_HOVER_STEP : THUMB_HOVER_STEP;
    const prevTop = container.scrollTop;
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    const nextTop = Math.max(0, Math.min(prevTop + delta, maxScroll));
    container.scrollTop = nextTop;
    if (
      prevTop === nextTop ||
      (hoverDirectionRef.current === "up" && nextTop === 0) ||
      (hoverDirectionRef.current === "down" && nextTop === maxScroll)
    ) {
      stopHoverScroll();
      return;
    }
    hoverScrollFrameRef.current = requestAnimationFrame(hoverScrollStep);
  };

  const startHoverScroll = (direction) => {
    const container = thumbnailScrollRef.current;
    if (!container) return;
    hoverDirectionRef.current = direction;
    if (!hoverScrollFrameRef.current) {
      hoverScrollFrameRef.current = requestAnimationFrame(hoverScrollStep);
    }
  };

  function renderPrice() {
    const price = Number(activeVariant?.price ?? product.price);
    const discount = Number(activeVariant?.discount ?? product.discount);
    let discountPrice = Number(
      activeVariant?.discount_price ?? product.discount_price,
    );
    if (discount > 0 && (!discountPrice || discountPrice === 0)) {
      discountPrice = Math.round(price * (1 - discount / 100));
    }
    return discount > 0 && discountPrice > 0 ? (
      <div>
        <div>
          <span
            style={{
              textDecoration: "line-through",
              color: "#888",
              fontSize: "1.25rem",
              marginRight: "0.5rem",
            }}
          >
            {price.toLocaleString()} AMD
          </span>
          <span
            style={{ color: "red", fontWeight: "600", fontSize: "1.25rem" }}
          >
            -{discount}%
          </span>
        </div>
        <div>
          <span
            style={{ color: "green", fontWeight: "700", fontSize: "1.5rem" }}
          >
            {discountPrice.toLocaleString()} AMD
          </span>
        </div>
      </div>
    ) : (
      <span style={{ fontWeight: "700", fontSize: "1.5rem" }}>
        {price.toLocaleString()} AMD
      </span>
    );
  }

  const colorBlock =
    colorVariants.length <= 1 ? (
      <div style={{ marginBottom: 4, color: "#666", fontSize: 14 }}>
        <b>color:</b> {currentColor || "—"}
      </div>
    ) : (
      <div
        style={{ marginBottom: 4, color: "#666", fontSize: 14, gap: 10 }}
      >
        <b>color:</b> {currentColor || "—"}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            marginTop: 10,
            marginBottom: 10,
            maxWidth: 6 * 70,
          }}
        >
          {colorVariants.map((item) => {
            const mainImg = item.image_url
              ?.split(",")
              .map((u) => u.trim())
              .find((u) => u.toLowerCase().includes("_main"));
            const imgSrc = mainImg ? apiUrl(mainImg) : "/no-image.jpg";
            const isCurrent = String(item.id) === String(selectedColorId);
            return (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 75,
                }}
              >
                <a
                  href={isCurrent ? undefined : `/product/${item.id}`}
                  tabIndex={isCurrent ? -1 : 0}
                  style={{
                    pointerEvents: isCurrent ? "none" : "auto",
                    borderRadius: 0,
                    border: isCurrent ? "3px solid #222" : "2px solid #ddd",
                    background: isCurrent ? "#eee" : "#fafbfc",
                    outline: "none",
                    width: 65,
                    height: 65,
                  }}
                  title={item.color || ""}
                  onClick={(e) => {
                    e.preventDefault();
                    if (isCurrent) return;
                    setSelectedColorId(item.id);
                    navigate(`/product/${item.id}`, {
                      replace: true,
                      state: {
                        from: location.state?.from || "/",
                        color: item.color,
                      },
                    });
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={item.color || displayName}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "cover",
                      opacity: isCurrent ? 1 : 0.82,
                      borderRadius: 0,
                      background: "#fff",
                    }}
                    draggable={false}
                  />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );

  const sizeBlock = (
    <div style={{ marginBottom: 4, color: "#666", fontSize: 14 }}>
      <b>size:</b>{" "}
      {Array.isArray(currentSizes) && currentSizes.length > 0
        ? currentSizes.join(", ")
        : "—"}
    </div>
  );

  function renderImages() {
    if (isMobile) {
      return (
        <div className="main-image-mobile-wrapper">
          <div style={{ position: "relative" }}>
            {user && favoriteProductPayload && (
              <button
                className={`favorite-btn ${favoriteActive ? "active" : ""}`}
                onClick={handleFavoriteToggle}
                aria-label={favoriteActive ? "Remove from favorites" : "Add to favorites"}
                title={favoriteActive ? "Remove from favorites" : "Add to favorites"}
                style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}
              >
                {favoriteActive ? "♥" : "♡"}
              </button>
            )}
            <Swiper
              modules={[Pagination]}
              pagination={{ clickable: true }}
              onSlideChange={(swiper) => setMainIndex(swiper.activeIndex)}
              initialSlide={mainIndex}
              className="main-image-mobile"
            >
              {rawImages.map((imgUrl, idx) => (
                <SwiperSlide key={`mobile-${idx}`}>
                  <img
                    src={imgUrl}
                    alt={`${displayName} ${idx + 1}`}
                    className="main-image-square"
                    draggable={false}
                    onClick={() => {
                      setModalIndex(idx);
                      setShowModal(true);
                    }}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      );
    }

    const showThumbnails = rawImages.length > 1;
    return (
      <div className="desktop-gallery">
        <div className="thumbnail-column">
          {showThumbnails ? (
            <>
              <button
                type="button"
                className="thumbnail-arrow thumb-arrow-up"
                aria-label="Previous images"
                onClick={() => scrollThumbnails("up")}
                onMouseEnter={() => canScrollUp && startHoverScroll("up")}
                onMouseLeave={stopHoverScroll}
                disabled={!canScrollUp}
              >
                ▲
              </button>
              <div className="thumbnail-scroll" ref={thumbnailScrollRef}>
                {rawImages.map((imgUrl, idx) => (
                  <img
                    key={`thumb-${idx}`}
                    src={imgUrl}
                    alt={`Photo ${idx + 1}`}
                    data-thumb-index={idx}
                    className={
                      "thumbnail-square vertical" + (idx === mainIndex ? " selected" : "")
                    }
                    draggable={false}
                    onMouseEnter={() => setMainIndex(idx)}
                    onClick={() => setMainIndex(idx)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="thumbnail-arrow thumb-arrow-down"
                aria-label="Next images"
                onClick={() => scrollThumbnails("down")}
                onMouseEnter={() => canScrollDown && startHoverScroll("down")}
                onMouseLeave={stopHoverScroll}
                disabled={!canScrollDown}
              >
                ▼
              </button>
            </>
          ) : null}
        </div>
        <div className="main-image-desktop-wrapper">
          <div className="main-image-desktop-inner" style={{ position: "relative" }}>
            {user && favoriteProductPayload && (
              <button
                className={`favorite-btn ${favoriteActive ? "active" : ""}`}
                onClick={handleFavoriteToggle}
                aria-label={favoriteActive ? "Remove from favorites" : "Add to favorites"}
                title={favoriteActive ? "Remove from favorites" : "Add to favorites"}
                style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}
              >
                {favoriteActive ? "♥" : "♡"}
              </button>
            )}
            <img
              src={rawImages[mainIndex]}
              alt={`${displayName} ${mainIndex + 1}`}
              className="main-image-square desktop"
              draggable={false}
              onClick={() => {
                setModalIndex(mainIndex);
                setShowModal(true);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const modal =
    !isMobile && showModal && rawImages.length > 0 ? (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <button
          className="modal-close"
          style={{ top: 56 }}
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(false);
          }}
          >
            ×
          </button>
        {rawImages.length > 1 && (
          <>
            <button
              className="modal-prev"
              onClick={(e) => {
                e.stopPropagation();
                setModalIndex(
                  (modalIndex - 1 + rawImages.length) % rawImages.length
                );
              }}
            >
              ‹
            </button>
            <button
              className="modal-next"
              onClick={(e) => {
                e.stopPropagation();
                setModalIndex((modalIndex + 1) % rawImages.length);
              }}
            >
              ›
            </button>
          </>
        )}
        <img
          src={rawImages[modalIndex]}
          alt={`${displayName} photo ${modalIndex + 1}`}
          className="modal-image"
          onClick={(e) => e.stopPropagation()}
        />
        {rawImages.length > 1 && (
          <div className="modal-thumbnails">
            {rawImages.map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={`thumbnail ${idx + 1}`}
                className={
                  "modal-thumbnail" + (idx === modalIndex ? " selected" : "")
                }
                onClick={(e) => {
                  e.stopPropagation();
                  setModalIndex(idx);
                }}
              />
            ))}
          </div>
        )}
      </div>
    ) : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header
        onSearch={handleHeaderSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={false}
      />
      <Breadcrumbs
        items={breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
        marginBottom={0}
      />
      <div style={{ width: "100%", margin: "auto" }}>
        <div
          style={{
            backgroundColor: "white",
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
            padding: 24,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 0 : 16,
            marginTop: 0,
            width: "100%",
            alignItems: isMobile ? "stretch" : "flex-start",
          }}
        >
          <div
            style={{
              flexShrink: 0,
              flex: isMobile ? "1 1 100%" : "0 0 auto",
              width: isMobile ? "100%" : "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: isMobile ? "stretch" : "flex-start",
              justifyContent: "flex-start",
            }}
          >
            {renderImages()}
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              width: "100%",
              textAlign: "left",
            }}
          >
            <h2
              style={{
                fontSize: isMobile
                  ? "clamp(1.4rem, 5vw, 2.1rem)"
                  : "clamp(1.6rem, calc(1.1rem + 1vw), 2.5rem)",
                fontWeight: "700",
                marginBottom: 24,
                textAlign: "left",
              }}
            >
              {displayName}
            </h2>
            {colorBlock}
            {sizeBlock}
            <div style={{ marginTop: 32, marginBottom: 8 }}>{renderPrice()}</div>
            <button
              style={{
                marginTop: 32,
                padding: "10px 20px",
                backgroundColor: "black",
                color: "white",
                maxWidth: 160,
                border: "none",
                cursor: "pointer",
              }}
              onClick={handleGoBack}
            >
              Back
            </button>
          </div>
        </div>
      </div>
      {!isMobile && brandInfo?.image_url && brandInfo?.name && brandInfo?.description ? (
        <div className="details-grey-section" style={{ background: "#dedede" }}>
          <div className="brand-info-panel">
            {brandInfo?.image_url && (
              <div className="brand-info-logo-wrapper">
                <img
                  src={makeImageUrl(brandInfo.image_url)}
                  alt={brandInfo.name}
                  className="brand-info-logo clickable"
                  loading="lazy"
                  onClick={() =>
                    navigate(
                      `/?category=brands&brand=${encodeURIComponent(brandInfo.name)}`
                    )
                  }
                />
              </div>
            )}
            <div
              className="brand-info-text"
              ref={brandTextRef}
              style={{ fontSize: `${brandTextSize}px` }}
            >
              <p className="brand-info-label">Brand spotlight</p>
              <h3
                className="brand-info-name"
                onClick={() =>
                  navigate(
                    `/?category=brands&brand=${encodeURIComponent(brandInfo.name)}`
                  )
                }
              >
                {brandInfo.name}
              </h3>
              <p className="brand-info-description">
                {brandInfo.description}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#dedede", height: 42 }} />
      )}
      {modal}
      <Footer />
    </div>
  );
}
