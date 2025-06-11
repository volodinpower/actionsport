import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductById, fetchProducts, incrementProductView } from "../api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Breadcrumbs from "../components/Breadcrumbs";

function makeImageUrl(url) {
  if (!url) return "/no-image.jpg";
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return "http://localhost:8000" + url;
  return url;
}
function normalize(val) {
  return (val || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}
function extractSizes(product) {
  if (!product) return [];
  if (Array.isArray(product.sizes) && product.sizes.length > 0)
    return product.sizes.filter(Boolean);
  if (typeof product.sizes === "string" && product.sizes.trim())
    return product.sizes.split(",").map(s => s.trim()).filter(Boolean);
  return [];
}

// Мобильная проверка
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
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
  const [availableSizes, setAvailableSizes] = useState([]);
  const [colorVariants, setColorVariants] = useState([]);

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
    if (!product) return;
    fetchProducts("", 1000).then((data) => {
      const nameNorm = normalize(product.name);
      const allOfColor = data.filter(
        item =>
          normalize(item.name) === nameNorm &&
          normalize(item.color) === normalize(product.color)
      );
      let allSizes = [];
      allOfColor.forEach(item => {
        allSizes.push(...extractSizes(item));
      });
      setAvailableSizes(Array.from(new Set(allSizes)));
    });
  }, [product]);

  useEffect(() => {
    if (!product || !product.name) {
      setColorVariants([]);
      return;
    }
    fetchProducts("", 1000).then((data) => {
      const nameNorm = normalize(product.name);
      const items = data.filter(item => normalize(item.name) === nameNorm);
      setColorVariants(items);
    });
  }, [product]);

  let rawImages = [];
  if (typeof product?.image_url === "string" && product.image_url.trim()) {
    rawImages = product.image_url
      .split(",")
      .map(url => url && url.trim())
      .filter(Boolean)
      .filter(url => !url.toLowerCase().includes("_main") && !url.toLowerCase().includes("_prev"))
      .map(makeImageUrl);
  }
  if (rawImages.length === 0) rawImages = ["/no-image.jpg"];

  useEffect(() => {
    setMainIndex(0);
  }, [id, product?.image_url]);

  const displayName = product?.sitename || product?.name || "";

  const breadcrumbs =
    (location.state && location.state.breadcrumbs && location.state.breadcrumbs.length > 1)
      ? [...location.state.breadcrumbs, { label: displayName, query: "" }]
      : [
          { label: "Main", query: "" },
          { label: displayName, query: "" }
        ];

  const handleHeaderSearch = (query) => {
    if (!query) {
      navigate("/");
    } else {
      navigate("/?search=" + encodeURIComponent(query));
    }
  };

  const handleGoBack = () => {
    if (location.state && location.state.from) {
      navigate(location.state.from, {
        state: {
          breadcrumbs: location.state.breadcrumbs,
          query: location.state.query
        }
      });
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  function renderPrice() {
    const price = Number(product.price);
    const discount = Number(product.discount);
    let discountPrice = Number(product.discount_price);

    if (discount > 0 && (!discountPrice || discountPrice === 0)) {
      discountPrice = Math.round(price * (1 - discount / 100));
    }

    if (discount > 0 && discountPrice > 0) {
      return (
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
      );
    }
    return <span className="text-2xl font-bold">{price.toLocaleString()} AMD</span>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">Ошибка: {error}</div>;
  }
  if (!product) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // --- БЛОК цветов: если больше 1 цвета — миниатюры, иначе просто название ---
  let colorBlock = null;
if (colorVariants.length <= 1) {
  colorBlock = (
    <div className="mb-1 text-gray-600 text-sm">
      <b>color: </b> {product.color}
    </div>
  );
} else {
  colorBlock = (
    <div className="mb-1 text-gray-600 text-sm gap-10">
      <b>color: </b> {product.color}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",         // позволяет переносить на новую строку                // увеличенный отступ между миниатюрами
          alignItems: "center",
          marginTop: 10,
          marginBottom: 10,
          maxWidth: 6 * 70,         // 6 миниатюр по 80px + gap (на десктопе)
          overflow: "visible",
        }}
      >
        {colorVariants.map((item) => {
          let mainImg = null;
          if (item.image_url) {
            mainImg = item.image_url
              .split(",")
              .map(url => url && url.trim())
              .find(url => url && url.toLowerCase().includes("_main"));
          }
          const imgSrc = mainImg
            ? (mainImg.startsWith("http") ? mainImg : "http://localhost:8000" + mainImg)
            : "/no-image.jpg";
          const isCurrent = String(item.id) === String(product.id);

          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 75,          // для выравнивания сетки, 80px миниатюра + 12px запас
                marginBottom: 1,
              }}
            >
              <a
                href={isCurrent ? undefined : `/product/${item.id}`}
                tabIndex={isCurrent ? -1 : 0}
                style={{
                  pointerEvents: isCurrent ? "none" : "auto",
                  borderRadius: 12,
                  border: isCurrent ? "3px solid #0070f3" : "2px solid #eee",
                  boxShadow: isCurrent ? "0 0 0 4px #aad8ff" : "0 1px 8px #0002",
                  background: isCurrent ? "#e7f3ff" : "#fafbfc",
                  outline: "none",
                  display: "block",
                  width: 65,
                  height: 65,
                  transition: "box-shadow 0.2s, border-color 0.2s",
                }}
                title={item.color || ""}
                onClick={e => {
                  e.preventDefault();
                  if (!isCurrent) navigate(`/product/${item.id}`);
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
                    display: "block",
                    opacity: isCurrent ? 1 : 0.82,
                  }}
                  draggable={false}
                />
              </a>
              {/* Убираем подпись под миниатюрой — либо можно сделать сбоку или tooltip */}
              {/* <div
                className="text-xs mt-1"
                style={{
                  color: "#555",
                  maxWidth: 66,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {item.color || "—"}
              </div> */}
            </div>
          );
        })}
      </div>
    </div>
  );
}

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header
        onSearch={handleHeaderSearch}
        breadcrumbs={breadcrumbs}
        isHome={false}
      />

      <div className="w-full mx-auto pt-1">
        <Breadcrumbs
          items={breadcrumbs}
          onBreadcrumbClick={idx => {
            if (idx === 0) {
              if (location.state && location.state.from) {
                navigate(location.state.from, {
                  state: {
                    breadcrumbs: location.state.breadcrumbs,
                    query: location.state.query
                  }
                });
              } else {
                navigate("/");
              }
            } else if (location.state && location.state.breadcrumbs) {
              const crumb = location.state.breadcrumbs[idx];
              if (crumb && crumb.query) {
                navigate(`/?search=${encodeURIComponent(crumb.query)}`, {
                  state: {
                    breadcrumbs: location.state.breadcrumbs.slice(0, idx + 1),
                    query: crumb.query
                  }
                });
              }
            }
          }}
        />

        <div className="bg-white shadow-md p-6 flex flex-col md:flex-row gap-8 mt-2 w-full ">
          {/* Фото товара */}
          <div className="flex-shrink-0 flex-1 min-w-[300px] flex flex-col items-center justify-center">
            {isMobile ? (
              // --- В мобильной версии — только большая картинка и стрелки (если > 1) ---
              <div className="relative w-full flex items-center justify-center" style={{ minHeight: 280 }}>
                {rawImages.length > 1 && (
                  <button
                    className="absolute left-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 text-white px-2 py-1"
                    onClick={() => setMainIndex((mainIndex - 1 + rawImages.length) % rawImages.length)}
                    style={{ zIndex: 2 }}
                  >‹</button>
                )}
                <img
                  src={rawImages[mainIndex]}
                  alt={displayName}
                  className="w-full  object-contain shadow mb-3 select-none"
                  style={{ maxHeight: 340, cursor: "pointer" }}
                  onClick={() => { setShowModal(true); setModalIndex(mainIndex); }}
                  draggable={false}
                />
                {rawImages.length > 1 && (
                  <button
                    className="absolute right-0 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 text-white px-2 py-1"
                    onClick={() => setMainIndex((mainIndex + 1) % rawImages.length)}
                    style={{ zIndex: 2 }}
                  >›</button>
                )}
              </div>
            ) : (
              <>
                <img
                  src={rawImages[mainIndex]}
                  alt={displayName}
                  className="w-3/4 object-contain shadow mb-3 cursor-pointer"
                  onClick={() => { setShowModal(true); setModalIndex(mainIndex); }}
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

          {/* Информация о товаре */}
          <div className="flex-1 flex flex-col justify-start mt-2">
            <h2 className="text-2xl font-bold mb-8">{displayName}</h2>
            {colorBlock}
            <div className="mb-1 text-gray-600 text-sm">
              <b>size:</b> {availableSizes.length > 0 ? availableSizes.join(", ") : "—"}
            </div>
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
      {/* Модальное окно галереи */}
      {showModal && rawImages.length > 0 && (
        <div className="fixed z-50 inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <button
            className="absolute top-4 right-6 text-white text-4xl font-bold"
            onClick={() => setShowModal(false)}
            aria-label="Close"
          >
            ×
          </button>
          {rawImages.length > 1 && (
            <button
              className="absolute left-6 top-1/2 -translate-y-1/2 text-white text-4xl font-bold"
              onClick={() => setModalIndex((modalIndex - 1 + rawImages.length) % rawImages.length)}
              aria-label="Prev"
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
              onClick={() => setModalIndex((modalIndex + 1) % rawImages.length)}
              aria-label="Next"
            >
              ›
            </button>
          )}
          {/* Миниатюры показывать только в десктопе если > 1 */}
          {!isMobile && rawImages.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {rawImages.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`${displayName} миниатюра ${idx + 1}`}
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
