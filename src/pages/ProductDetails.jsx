import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductById, incrementProductView } from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";

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

  // Загрузка продукта по id
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

  // Увеличение счётчика просмотров
  useEffect(() => {
    if (id) incrementProductView(id);
  }, [id]);

  // Обновление цветовых вариантов и сортировка
  useEffect(() => {
    if (!product || !Array.isArray(product.all_colors)) {
      setColorVariants([]);
      return;
    }
    const variants = [...product.all_colors].sort(sortColorVariants);
    setColorVariants(variants);
  }, [product]);

  // Выставляем выбранный цвет при загрузке продукта или изменении location.state
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

  // Картинки для отображения
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

  // При смене продукта или url картинок сбрасываем выбранное главное изображение
  useEffect(() => {
    setMainIndex(0);
  }, [id, product?.image_url]);

  const displayName = product?.sitename || product?.name || "";

  // Хлебные крошки
  const breadcrumbs = [
    { label: "Main", query: "" },
    { label: displayName, query: "" },
  ];

  const handleHeaderSearch = (query) => {
    navigate(query ? "/?search=" + encodeURIComponent(query) : "/");
  };

  // --- обработчик перехода по меню (главное!)
  const handleMenuCategoryClick = (catKey, catLabel, subKey = "") => {
    const params = new URLSearchParams();
    if (catKey) params.set("category", catKey);
    if (subKey) params.set("subcategory", subKey);
    navigate({ pathname: "/", search: params.toString() });
  };

  // Возврат назад в каталог с фильтрами, если есть в location.state.from
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
          <span className="line-through text-gray-400 text-xl mr-2">
            {price.toLocaleString()} AMD
          </span>
          <span className="text-red-500 text-xl font-semibold mr-2">
            -{discount}%
          </span>
        </div>
        <div>
          <span className="text-green-700 text-2xl font-bold">
            {discountPrice.toLocaleString()} AMD
          </span>
        </div>
      </div>
    ) : (
      <span className="text-2xl font-bold">{price.toLocaleString()} AMD</span>
    );
  }

  if (error)
    return (
      <div className="p-8 text-center text-red-600">Ошибка: {error}</div>
    );
  if (!product) return <div className="p-8 text-center">Loading...</div>;

  // Цветовые варианты
  const colorBlock =
    colorVariants.length <= 1 ? (
      <div className="mb-1 text-gray-600 text-sm">
        <b>color:</b> {product.color}
      </div>
    ) : (
      <div className="mb-1 text-gray-600 text-sm gap-10">
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
                    borderRadius: 12,
                    border: isCurrent ? "3px solid #0070f3" : "2px solid #eee",
                    boxShadow: isCurrent
                      ? "0 0 0 4px #aad8ff"
                      : "0 1px 8px #0002",
                    background: isCurrent ? "#e7f3ff" : "#fafbfc",
                    outline: "none",
                    width: 65,
                    height: 65,
                  }}
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
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: "cover",
                      borderRadius: 10,
                      opacity: isCurrent ? 1 : 0.82,
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
    <div className="mb-1 text-gray-600 text-sm">
      <b>size:</b>{" "}
      {Array.isArray(product.sizes) && product.sizes.length > 0
        ? product.sizes.join(", ")
        : "—"}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header
        onSearch={handleHeaderSearch}
        onMenuCategoryClick={handleMenuCategoryClick}
        breadcrumbs={breadcrumbs}
        isHome={false}
      />
      <div className="w-full mx-auto pt-1">
        <Breadcrumbs
          items={breadcrumbs}
          onBreadcrumbClick={(idx) => {
            if (idx === 0) handleGoBack();
          }}
        />
        <div className="bg-white shadow-md p-6 flex flex-col md:flex-row gap-8 mt-2 w-full">
          <div className="flex-shrink-0 flex-1 min-w-[300px] flex flex-col items-center justify-center">
            {isMobile ? (
              <div
                className="relative w-full flex items-center justify-center"
                style={{ minHeight: 280 }}
              >
                {rawImages.length > 1 && (
                  <button
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 text-white px-2 py-1"
                    onClick={() =>
                      setMainIndex((mainIndex - 1 + rawImages.length) % rawImages.length)
                    }
                  >
                    ‹
                  </button>
                )}
                <img
                  src={rawImages[mainIndex]}
                  alt={displayName}
                  className="w-full object-contain shadow mb-3 select-none"
                  style={{ maxHeight: 340, cursor: "pointer" }}
                  onClick={() => {
                    setShowModal(true);
                    setModalIndex(mainIndex);
                  }}
                  draggable={false}
                />
                {rawImages.length > 1 && (
                  <button
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 text-white px-2 py-1"
                    onClick={() =>
                      setMainIndex((mainIndex + 1) % rawImages.length)
                    }
                  >
                    ›
                  </button>
                )}
              </div>
            ) : (
              <>
                <img
                  src={rawImages[mainIndex]}
                  alt={displayName}
                  className="w-3/4 object-contain shadow mb-3 cursor-pointer"
                  onClick={() => {
                    setShowModal(true);
                    setModalIndex(mainIndex);
                  }}
                />
                <div className="flex gap-3 mt-2 flex-wrap justify-center">
                  {rawImages.map((imgUrl, idx) => (
                    <img
                      key={idx}
                      src={imgUrl}
                      alt={`Фото ${idx + 1}`}
                      className={`w-20 h-20 object-cover rounded-lg border-2 shadow-sm cursor-pointer ${
                        idx === mainIndex ? "border-black" : "border-gray-200"
                      }`}
                      onClick={() => setMainIndex(idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-start mt-2">
            <h2 className="text-2xl font-bold mb-8">{displayName}</h2>
            {colorBlock}
            {sizeBlock}
            <div className="mt-8 mb-2">{renderPrice()}</div>
            <button
              className="mt-8 px-6 py-2 bg-black text-white w-max"
              onClick={handleGoBack}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {showModal && rawImages.length > 0 && (
        <div className="fixed z-50 inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <button
            className="absolute top-4 right-6 text-white text-4xl font-bold"
            onClick={() => setShowModal(false)}
          >
            ×
          </button>
          {rawImages.length > 1 && (
            <button
              className="absolute left-6 top-1/2 -translate-y-1/2 text-white text-4xl font-bold"
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
            className="max-h-[80vh] max-w-[80vw] rounded-xl shadow-lg"
          />
          {rawImages.length > 1 && (
            <button
              className="absolute right-6 top-1/2 -translate-y-1/2 text-white text-4xl font-bold"
              onClick={() =>
                setModalIndex((modalIndex + 1) % rawImages.length)
              }
            >
              ›
            </button>
          )}
          {!isMobile && rawImages.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {rawImages.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`миниатюра ${idx + 1}`}
                  className={`w-12 h-12 rounded border-2 ${
                    idx === modalIndex ? "border-white" : "border-transparent"
                  } cursor-pointer`}
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
