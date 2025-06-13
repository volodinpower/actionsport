import { useState } from "react";
import "./ProductCard.css";

/**
 * Карточка товара для каталога (адаптивная для мобильных)
 */
export default function ProductCard({ product, onClick }) {
  const [imgError, setImgError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Разделяем ссылки на картинки
  let urls = [];
  if (typeof product.image_url === "string") {
    urls = product.image_url
      .split(",")
      .map((url) => url && url.trim())
      .filter(Boolean);
  } else if (Array.isArray(product.image_url)) {
    urls = product.image_url
      .map((url) => url && String(url).trim())
      .filter(Boolean);
  }

  // Ищем изображения с суффиксом _main и _prev
  const mainImg = urls.find((url) => url.toLowerCase().includes("_main")) || urls[0];
  const prevImg = urls.find((url) => url.toLowerCase().includes("_prev")) || mainImg;

  // Формируем абсолютную ссылку
  function makeAbsUrl(url) {
    if (!url) return "/no-image.jpg";
    if (/^https?:\/\//.test(url)) return url;
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
  }

  // Итоговый src в зависимости от наведения
  const image = isHovered ? makeAbsUrl(prevImg) : makeAbsUrl(mainImg);

  // Цена и скидка
  const price = parseFloat(String(product.price ?? "").replace(/\s/g, "").replace(",", "."));
  const discount = parseFloat(String(product.discount ?? "").replace(/\s/g, "").replace(",", "."));
  const showDiscount = !isNaN(discount) && discount > 0;
  const discountedPrice = showDiscount
    ? Math.ceil((price * (1 - discount / 100)) / 100) * 100
    : null;
  // Размеры
  let sizes = [];
  if (Array.isArray(product.sizes)) {
    sizes = product.sizes;
  } else if (typeof product.sizes === "string" && product.sizes.trim()) {
    sizes = product.sizes.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return (
    <div
      className="
        product-card
        w-full
        aspect-[4/6]              /* Более высокая карточка для мобилки */
        sm:aspect-[4/5]
        md:aspect-[5/6]
        bg-white shadow-md overflow-hidden flex flex-col
        transition-all duration-200 hover:shadow-2xl cursor-pointer
        px-1 py-1
      "
      onClick={onClick}
      title={product.sitename}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {imgError ? (
        <div className="flex items-center justify-center w-full h-3/5 bg-gray-100 text-gray-400 text-xs sm:text-sm">
          no image
        </div>
      ) : (
        <img
          src={image}
          alt={product.sitename}
          className="w-full h-3/5 object-contain bg-white p-1 sm:p-3"
          onError={() => setImgError(true)}
          draggable={false}
        />
      )}

      <div className="flex flex-col flex-1 pl-1 pr-1">
        <h2 className="text-xs sm:text-sm font-bold mb-1 mt-1 leading-tight overflow-hidden break-words line-clamp-2">
          {product.sitename}
        </h2>
        <div className="flex flex-col gap-0">
          <div className="text-[9px] sm:text-[10px] text-gray-500 overflow-hidden text-ellipsis break-words">
            {product.color ? `color: ${product.color}` : ""}
          </div>
          <div className="text-[9px] sm:text-[10px] text-gray-500 overflow-hidden text-ellipsis break-words">
            {sizes.length > 0 ? `size: ${sizes.join(", ")}` : ""}
          </div>
        </div>
        <div className="mt-auto min-h-[28px] max-h-[32px] sm:min-h-[40px] sm:max-h-[40px] flex flex-col justify-end items-start">
          {showDiscount ? (
            <>
              <span className="text-[10px] sm:text-xs text-red-500 font-semibold block">{`sale: -${discount}%`}</span>
              <span className="text-xs sm:text-sm text-gray-800 font-semibold line-through block">{`${price} AMD`}</span>
              <span className="text-xs sm:text-sm text-green-600 font-bold block">{`${discountedPrice} AMD`}</span>
            </>
          ) : (
            <span className="text-xs sm:text-sm text-gray-800 font-semibold block">{`${price} AMD`}</span>
          )}
        </div>
      </div>
    </div>
  );
}
