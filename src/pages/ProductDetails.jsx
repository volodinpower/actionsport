import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import { fetchProductById, incrementProductView } from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import "./ProductDetails.css";
import "swiper/css";
import "swiper/css/pagination";

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

  useEffect(() => {
    fetchProductById(id)
      .then((data) => {
        setProduct(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Ошибка загрузки товара");
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

  if (error)
    return <div style={{ padding: 32, textAlign: "center", color: "red" }}>Ошибка: {error}</div>;
  if (!product)
    return <div style={{ padding: 32, textAlign: "center" }}>Loading...</div>;

  const displayName = product?.sitename || product?.name || "";

  const breadcrumbs = [
    { label: "Main", query: "" },
    { label: displayName, query: "" },
  ];

  const handleHeaderSearch = (query) => {
    navigate(query ? "/?search=" + encodeURIComponent(query) : "/");
  };

  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    const params = new URLSearchParams();
    if (catKey) params.set("category", catKey);
    if (subKey) params.set("subcategory", subKey);
    navigate({ pathname: "/", search: params.toString() });
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
    const price = Number(product.price);
    const discount = Number(product.discount);
    let discountPrice = Number(product.discount_price);
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
        <b>color:</b> {product.color}
      </div>
    ) : (
      <div
        style={{ marginBottom: 4, color: "#666", fontSize: 14, gap: 10 }}
      >
        <b>color:</b> {product.color}
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
      {Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes.join(", ")
        : "—"}
    </div>
  );

  function renderImages() {
    if (isMobile) {
      return (
        <div className="main-image-mobile-wrapper">
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
      );
    }

    return (
      <div className="desktop-gallery">
        <div className="thumbnail-column">
          <button
            type="button"
            className="thumbnail-arrow thumb-arrow-up"
            aria-label="Предыдущие изображения"
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
                alt={`Фото ${idx + 1}`}
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
            aria-label="Следующие изображения"
            onClick={() => scrollThumbnails("down")}
            onMouseEnter={() => canScrollDown && startHoverScroll("down")}
            onMouseLeave={stopHoverScroll}
            disabled={!canScrollDown}
          >
            ▼
          </button>
        </div>
        <div className="main-image-desktop-wrapper">
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
          alt={`${displayName} фото ${modalIndex + 1}`}
          className="modal-image"
          onClick={(e) => e.stopPropagation()}
        />
        {rawImages.length > 1 && (
          <div className="modal-thumbnails">
            {rawImages.map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={`миниатюра ${idx + 1}`}
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
      <div style={{ width: "100%", margin: "auto", paddingTop: 8 }}>
        <Breadcrumbs
          items={breadcrumbs}
          onBreadcrumbClick={(idx) => {
            if (idx === 0) handleGoBack();
          }}
        />
        <div
          style={{
            backgroundColor: "white",
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
            padding: 24,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 0 : 16,
            marginTop: 8,
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
      {!isMobile && <div className="details-grey-section" />}
      {modal}
      <Footer />
    </div>
  );
}
