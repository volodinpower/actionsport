import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { Pagination } from "swiper";

import "./ProductCard.css";

export default function ProductCard({ product, onClick }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Собираем все картинки из product.image_url
  let urls = [];
  if (typeof product.image_url === "string") {
    urls = product.image_url.split(",").map(url => url.trim()).filter(Boolean);
  } else if (Array.isArray(product.image_url)) {
    urls = product.image_url.map(url => String(url).trim()).filter(Boolean);
  }

  // Находим _main и _prev картинки
  const mainImg = urls.find(url => url.toLowerCase().includes("_main")) || urls[0];
  const prevImg = urls.find(url => url.toLowerCase().includes("_prev")) || mainImg;

  // Для мобильной версии свайп только по двум картинкам
  const mobileImgs = [mainImg, prevImg].filter(Boolean);

  function makeAbsUrl(url) {
    if (!url) return "/no-image.jpg";
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
    sizes = product.sizes.split(",").map(s => s.trim()).filter(Boolean);
  }

  if (isMobile) {
    return (
      <div className="product-card" onClick={onClick} title={product.sitename}>
        {imgError ? (
          <div className="no-image">no image</div>
        ) : (
          <Swiper
            modules={[Pagination]}
            spaceBetween={10}
            slidesPerView={1}
            pagination={{ clickable: true }}
          >
            {mobileImgs.map((url, idx) => (
              <SwiperSlide key={idx}>
                <img
                  src={makeAbsUrl(url)}
                  alt={`${product.sitename} image ${idx + 1}`}
                  className="product-image"
                  onError={() => setImgError(true)}
                  draggable={false}
                />
              </SwiperSlide>
            ))}
          </Swiper>
        )}

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

  // Десктоп - переключаем картинки при hover
  const image = isHovered ? makeAbsUrl(prevImg) : makeAbsUrl(mainImg);

  return (
    <div
      className="product-card"
      onClick={onClick}
      title={product.sitename}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {imgError ? (
        <div className="no-image">no image</div>
      ) : (
        <img
          src={image}
          alt={product.sitename}
          className="product-image"
          onError={() => setImgError(true)}
          draggable={false}
        />
      )}
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
