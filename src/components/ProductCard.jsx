import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "./ProductCard.css";

export default function ProductCard({ product, onClick }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Составляем массив изображений
  let urls = [];
  if (typeof product.image_url === "string") {
    urls = product.image_url
      .split(",")
      .map((url) => url && url.trim())
      .filter(Boolean);
  } else if (Array.isArray(product.image_url)) {
    urls = product.image_url.map((url) => url && String(url).trim()).filter(Boolean);
  }

  // Для мобильного свайпера — показываем сначала _main, потом _prev
  const mobileSwipeUrls = [
    ...urls.filter((url) => url.toLowerCase().includes("_main")),
    ...urls.filter((url) => url.toLowerCase().includes("_prev")),
  ];

  // Основное и превью изображение для десктопа
  const mainImg = urls.find((url) => url.toLowerCase().includes("_main")) || urls[0];
  const prevImg = urls.find((url) => url.toLowerCase().includes("_prev")) || mainImg;

  // Формируем абсолютный URL
  function makeAbsUrl(url) {
    if (!url) return null;
    if (/^https?:\/\//.test(url)) return url;
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  const price = parseFloat(String(product.price ?? "").replace(/\s/g, "").replace(",", "."));
  const discount = parseFloat(String(product.discount ?? "").replace(/\s/g, "").replace(",", "."));
  const showDiscount = !isNaN(discount) && discount > 0;
  const discountedPrice = showDiscount
    ? Math.ceil((price * (1 - discount / 100)) / 100) * 100
    : null;

  let sizes = [];
  if (Array.isArray(product.sizes)) {
    sizes = product.sizes;
  } else if (typeof product.sizes === "string" && product.sizes.trim()) {
    sizes = product.sizes.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const noImages = mobileSwipeUrls.length === 0;

  return (
    <div
      className="product-card"
      onClick={onClick}
      title={product.sitename}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
    >
      {/* Картинка или no-image */}
      <div className={isMobile ? "swiper-container" : ""} style={{ height: "70%" }}>
        {imgError || noImages ? (
          <div className="no-image">no image</div>
        ) : isMobile ? (
          <Swiper spaceBetween={10} slidesPerView={1} pagination={{ clickable: true }}>
            {mobileSwipeUrls.map((url, idx) => (
              <SwiperSlide key={idx}>
                <img
                  src={makeAbsUrl(url)}
                  alt={product.sitename}
                  className="product-image"
                  onError={() => setImgError(true)}
                  draggable={false}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <img
            src={makeAbsUrl(isHovered ? prevImg : mainImg)}
            alt={product.sitename}
            className="product-image"
            onError={() => setImgError(true)}
            draggable={false}
          />
        )}
      </div>

      {/* Контент с названием, цветом, размером, ценой — всегда показываем */}
      <div className="product-content">
        <h2 className="product-card-title">{product.sitename}</h2>
        <div className="desc-group">
          {product.color && <div className="desc-row">{`color: ${product.color}`}</div>}
          <div className="desc-row">{`size: ${sizes.length > 0 ? sizes.join(", ") : "—"}`}</div>
        </div>
        <div className="price-block">
          {showDiscount ? (
            <>
              <span className="sale-badge">{`sale: -${discount}%`}</span>
              <span className="old-price">{`${price} AMD`}</span>
              <span className="new-price">{`${discountedPrice} AMD`}</span>
            </>
          ) : (
            <span className="cur-price">{`${price} AMD`}</span>
          )}
        </div>
      </div>
    </div>
  );
}
