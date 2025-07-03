import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductById, incrementProductView } from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper";

import "swiper/css";
import "swiper/css/pagination";

import "./ProductDetails.css";

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
  if (typeof product?.image_url === "string" && product.image_url.trim()) {
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
  if (rawImages.length === 0) rawImages = ["/no-image.jpg"];

  useEffect(() => {
    setMainIndex(0);
  }, [id, product?.image_url]);

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

  function renderPrice() {
    const price = Number(product.price);
    const discount = Number(product.discount);
    let discountPrice = Number(product.discount_price);
    if (discount > 0 && (!discountPrice || discountPrice === 0)) {
      discountPrice = Math.round(price * (1 - discount / 100));
    }
    return discount > 0 && discountPrice > 0 ? (
      <div>
        <div className="price-old-discount">
          <span className="price-old">{price.toLocaleString()} AMD</span>
          <span className="price-discount">-{discount}%</span>
        </div>
        <div>
          <span className="price-current">{discountPrice.toLocaleString()} AMD</span>
        </div>
      </div>
    ) : (
      <span className="price-current-no-discount">{price.toLocaleString()} AMD</span>
    );
  }

  const colorBlock =
    colorVariants.length <= 1 ? (
      <div className="color-block single-color">
        <b>color:</b> {product.color}
      </div>
    ) : (
      <div className="color-block multi-color">
        <b>color:</b> {product.color}
        <div className="color-variants-container">
          {colorVariants.map((item) => {
            const mainImg = item.image_url
              ?.split(",")
              .map((u) => u.trim())
              .find((u) => u.toLowerCase().includes("_main"));
            const imgSrc = mainImg ? apiUrl(mainImg) : "/no-image.jpg";
            const isCurrent = String(item.id) === String(selectedColorId);
            return (
              <div className="color-variant" key={item.id}>
                <a
                  href={isCurrent ? undefined : `/product/${item.id}`}
                  tabIndex={isCurrent ? -1 : 0}
                  className={isCurrent ? "color-current" : ""}
                  title={item.color || ""}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!isCurrent) {
                      setSelectedColorId(item.id);
                      navigate(`/product/${item.id}`, {
                        replace: true,
                        state: {
                          from: location.state?.from || "/",
                          color: item.color,
                        },
                      });
                    }
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={item.color || displayName}
                    className="color-variant-image"
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
    <div className="size-block">
      <b>size:</b>{" "}
      {Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes.join(", ")
        : "—"}
    </div>
  );

  return (
    <div className="product-details-wrapper">
      <Header
        onSearch={handleHeaderSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={false}
      />
      <div className="product-details-content">
        <Breadcrumbs
          items={breadcrumbs}
          onBreadcrumbClick={(idx) => {
            if (idx === 0) handleGoBack();
          }}
        />
        <div className="product-main">
          <div className="product-images">
            {isMobile ? (
              <Swiper
                modules={[Pagination]}
                pagination={{ clickable: true }}
                spaceBetween={10}
                slidesPerView={1}
                onSlideChange={(swiper) => setMainIndex(swiper.activeIndex)}
                onSwiper={(swiper) => setMainIndex(swiper.activeIndex)}
              >
                {rawImages.map((imgUrl, idx) => (
                  <SwiperSlide key={idx}>
                    <img
                      src={imgUrl}
                      alt={`Фото ${idx + 1}`}
                      className="main-image"
                      draggable={false}
                    />
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              <>
                <img
                  src={rawImages[mainIndex]}
                  alt={displayName}
                  className="main-image desktop"
                  onClick={() => {
                    setShowModal(true);
                    setModalIndex(mainIndex);
                  }}
                  draggable={false}
                />
                <div className="thumbnails-container">
                  {rawImages.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`Фото ${idx + 1}`}
                      className={`thumbnail-image ${idx === mainIndex ? "selected" : ""}`}
                      onClick={() => setMainIndex(idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="product-info">
            <h2 className="product-title">{displayName}</h2>
            {colorBlock}
            {sizeBlock}
            <div className="price-container">{renderPrice()}</div>
            <button className="back-button" onClick={handleGoBack}>
              Back
            </button>
          </div>
        </div>
      </div>

      {/* Модалка открывается только на десктопе */}
      {!isMobile && showModal && rawImages.length > 0 && (
        <div className="modal-overlay">
          <button className="modal-close" onClick={() => setShowModal(false)}>
            ×
          </button>
          {rawImages.length > 1 && (
            <button
              className="modal-prev"
              onClick={() =>
                setModalIndex((modalIndex - 1 + rawImages.length) % rawImages.length)
              }
            >
              ‹
            </button>
          )}
          <img
            src={rawImages[modalIndex]}
            alt={`${displayName} фото ${modalIndex + 1}`}
            className="modal-image"
          />
          {rawImages.length > 1 && (
            <button
              className="modal-next"
              onClick={() =>
                setModalIndex((modalIndex + 1) % rawImages.length)
              }
            >
              ›
            </button>
          )}
          {!isMobile && rawImages.length > 1 && (
            <div className="modal-thumbnails">
              {rawImages.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`миниатюра ${idx + 1}`}
                  className={`modal-thumbnail ${idx === modalIndex ? "selected" : ""}`}
                  onClick={() => setModalIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
}
