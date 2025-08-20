import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductById, incrementProductView } from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";
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
          <span className="price-old">
            {price.toLocaleString()} AMD
          </span>
          <span className="price-discount">-{discount}%</span>
        </div>
        <div>
          <span className="price-new">
            {discountPrice.toLocaleString()} AMD
          </span>
        </div>
      </div>
    ) : (
      <span className="price-new">
        {price.toLocaleString()} AMD
      </span>
    );
  }

  // Цветовые варианты
  const colorBlock =
    colorVariants.length <= 1 ? (
      <div className="product-color">
        <b>color:</b> {product.color}
      </div>
    ) : (
      <div className="product-color">
        <b>color:</b> {product.color}
        <div className="color-variants">
          {colorVariants.map((item) => {
            const mainImg = item.image_url
              ?.split(",")
              .map((u) => u.trim())
              .find((u) => u.toLowerCase().includes("_main"));
            const imgSrc = mainImg ? apiUrl(mainImg) : "/no-image.jpg";
            const isCurrent = String(item.id) === String(selectedColorId);
            return (
              <div key={item.id} className="color-variant">
                <a
                  href={isCurrent ? undefined : `/product/${item.id}`}
                  tabIndex={isCurrent ? -1 : 0}
                  className={isCurrent ? "color-link active" : "color-link"}
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
                    className="color-image"
                    draggable={false}
                  />
                </a>
              </div>
            );
          })}
        </div>
      </div>
    );

  // Размеры
  const sizeBlock = (
    <div className="product-size">
      <b>size:</b>{" "}
      {Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes.join(", ")
        : "—"}
    </div>
  );

  // --- Свайп на мобиле (touch) ---
  let touchStartX = null;
  function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 45) {
      if (deltaX > 0)
        setMainIndex((mainIndex - 1 + rawImages.length) % rawImages.length);
      else setMainIndex((mainIndex + 1) % rawImages.length);
    }
    touchStartX = null;
  }

  // --- Картинки/галерея ---
  function renderImages() {
    if (isMobile) {
      return (
        <div className="main-image-mobile-wrapper">
          <div className="main-image-mobile">
            <img
              src={rawImages[mainIndex]}
              alt={displayName}
              className="main-image-square"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              draggable={false}
            />
            <div className="swiper-pagination-bullets">
              {rawImages.map((_, idx) => (
                <span
                  key={idx}
                  className={
                    "swiper-pagination-bullet" +
                    (idx === mainIndex ? " swiper-pagination-bullet-active" : "")
                  }
                  onClick={() => setMainIndex(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Десктоп
    return (
      <div className="main-image-mobile-wrapper">
        <div className="main-image-mobile">
          <img
            src={rawImages[mainIndex]}
            alt={displayName}
            className="main-image-square desktop"
            onClick={() => setShowModal(true)}
            draggable={false}
          />
          <div className="thumbnail-wrapper">
            {rawImages.map((imgUrl, idx) => (
              <img
                key={idx}
                src={imgUrl}
                alt={`Фото ${idx + 1}`}
                className={
                  "thumbnail-square" + (idx === mainIndex ? " selected" : "")
                }
                onClick={() => setMainIndex(idx)}
                draggable={false}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- Модалка ---
  const modal =
    !isMobile && showModal && rawImages.length > 0 ? (
      <div className="modal-overlay" onClick={() => setShowModal(false)}>
        <button className="modal-close" onClick={(e) => {
          e.stopPropagation();
          setShowModal(false);
        }}>×</button>
        {rawImages.length > 1 && (
          <>
            <button className="modal-prev" onClick={(e) => {
              e.stopPropagation();
              setModalIndex((modalIndex - 1 + rawImages.length) % rawImages.length);
            }}>‹</button>
            <button className="modal-next" onClick={(e) => {
              e.stopPropagation();
              setModalIndex((modalIndex + 1) % rawImages.length);
            }}>›</button>
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
    <div className="product-page">
      <Header
        onSearch={handleHeaderSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={false}
      />
      <div className="product-content">
        <Breadcrumbs
          items={breadcrumbs}
          onBreadcrumbClick={(idx) => {
            if (idx === 0) handleGoBack();
          }}
        />
        <div className="product-details-card">
          <div className="product-images">
            {renderImages()}
          </div>
          <div className="product-info">
            <h2 className="product-title">{displayName}</h2>
            {colorBlock}
            {sizeBlock}
            <div className="product-price">{renderPrice()}</div>
            <button className="btn-back" onClick={handleGoBack}>Back</button>
          </div>
        </div>
      </div>
      {modal}
      <Footer />
    </div>
  );
}
