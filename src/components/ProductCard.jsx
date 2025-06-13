import { useState } from "react";

/**
 * Карточка товара для каталога.
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
            w-full 
            aspect-[5/6]       /* по умолчанию */
            sm:aspect-[4/7]    /* чуть меньше высота на больших экранах */
            md:aspect-[5/6]    /* возвращаем обратно на средних и выше */
            bg-white shadow-md overflow-hidden flex flex-col 
            transition-all duration-200 hover:shadow-2xl cursor-pointer
          "
          onClick={onClick}
          title={product.sitename}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
      {imgError ? (
        <div className="flex items-center justify-center w-full h-3/5 bg-gray-100 text-gray-400 text-sm">
          no image
        </div>
      ) : (
        <img
          src={image}
          alt={product.sitename}
          className="w-full h-3/5 object-contain bg-white p-3"
          onError={() => setImgError(true)}
          draggable={false}
        />
      )}

      <div className="flex flex-col flex-1 pl-2">
        <h2 className="text-sm font-bold mb-1 leading-tight overflow-hidden line-clamp-2">
          {product.sitename}
        </h2>
        <div className="flex flex-col">
          <div className="text-[10px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
            {product.color ? `color:  ${product.color}` : ""}
          </div>
          <div className="text-[10px] text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
            {sizes.length > 0 ? `size: ${sizes.join(", ")}` : ""}
          </div>
        </div>
        <div className="mt-auto min-h-[40px] max-h-[40px] flex flex-col justify-end">
          {showDiscount ? (
            <>
              <span className="text-xs text-red-500 font-semibold block">{`sale: -${discount}%`}</span>
              <span className="text-sm text-gray-800 font-semibold line-through block">{`${price} AMD`}</span>
              <span className="text-sm text-green-600 font-bold block">{`${discountedPrice} AMD`}</span>
            </>
          ) : (
            <span className="text-sm text-gray-800 font-semibold block">{`${price} AMD`}</span>
          )}
        </div>
      </div>
    </div>
  );
}
