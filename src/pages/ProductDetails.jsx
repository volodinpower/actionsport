import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchProductById, fetchProducts, incrementProductView } from "../api";
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
  return apiUrl(url);
}

function normalize(val) {
  return (val || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function extractSizes(product) {
  if (!product) return [];
  if (Array.isArray(product.sizes)) return product.sizes.filter(Boolean);
  if (typeof product.sizes === "string")
    return product.sizes.split(",").map(s => s.trim()).filter(Boolean);
  return [];
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
      .then(data => {
        setProduct(data);
        setError(null);
      })
      .catch(err => {
        setError(err.message || "Ошибка загрузки товара");
        setProduct(null);
      });
  }, [id]);

  useEffect(() => {
    if (id) incrementProductView(id);
  }, [id]);

  // ✅ Показываем только размеры для name + color
  useEffect(() => {
    if (!product) return;
    fetchProducts("", 1000).then(data => {
      const nameNorm = normalize(product.name);
      const colorNorm = normalize(product.color);
      const sizes = data
        .filter(
          item =>
            normalize(item.name) === nameNorm &&
            normalize(item.color) === colorNorm
        )
        .flatMap(extractSizes)
        .filter(Boolean);
      setAvailableSizes(Array.from(new Set(sizes)));
    });
  }, [product]);

  useEffect(() => {
    if (!product || !product.name) {
      setColorVariants([]);
      return;
    }
    fetchProducts("", 1000).then(data => {
      const nameNorm = normalize(product.name);
      const items = data.filter(item => normalize(item.name) === nameNorm);
      setColorVariants(items);
    });
  }, [product]);

  const rawImages = (() => {
    if (typeof product?.image_url !== "string" || !product.image_url.trim()) {
      return ["/no-image.jpg"];
    }
    const urls = product.image_url
      .split(",")
      .map(u => u.trim())
      .filter(Boolean);
    const numbered = urls.filter(u => /_\d+\./.test(u));
    if (numbered.length > 0) return numbered.map(makeImageUrl);
    const mains = urls.filter(u => /_(main|prev)\./i.test(u));
    return (mains.length ? mains : urls).map(makeImageUrl);
  })();

  useEffect(() => {
    setMainIndex(0);
  }, [id, product?.image_url]);

  const displayName = product?.sitename || product?.name || "";
  const breadcrumbs =
    location.state?.breadcrumbs?.length > 1
      ? [...location.state.breadcrumbs, { label: displayName, query: "" }]
      : [{ label: "Main", query: "" }, { label: displayName, query: "" }];

  const handleHeaderSearch = (query) => {
    navigate(query ? "/?search=" + encodeURIComponent(query) : "/");
  };

  const handleGoBack = () => {
    if (location.state?.from) {
      navigate(location.state.from, {
        state: {
          breadcrumbs: location.state.breadcrumbs,
          query: location.state.query,
        },
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

  if (error) return <div className="p-8 text-center text-red-600">Ошибка: {error}</div>;
  if (!product) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header onSearch={handleHeaderSearch} breadcrumbs={breadcrumbs} isHome={false} />
      <div className="w-full mx-auto pt-1">
        <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={() => navigate("/")} />
        <div className="bg-white shadow-md p-6 flex flex-col md:flex-row gap-8 mt-2 w-full">
          {/* Картинка */}
          <div className="flex-1 min-w-[300px] flex flex-col items-center justify-center">
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
          </div>

          {/* Инфо */}
          <div className="flex-1 flex flex-col justify-start mt-2">
            <h2 className="text-2xl font-bold mb-8">{displayName}</h2>
            <div className="mb-1 text-gray-600 text-sm">
              <b>color:</b> {product.color}
            </div>
            <div className="mb-1 text-gray-600 text-sm">
              <b>size:</b> {availableSizes.length > 0 ? availableSizes.join(", ") : "—"}
            </div>
            <div className="mt-8 mb-2">{renderPrice()}</div>
            <button className="mt-8 px-6 py-2 bg-black text-white w-max" onClick={handleGoBack}>
              Back
            </button>
          </div>
        </div>
      </div>
      {showModal && rawImages.length > 0 && (
        <div className="fixed z-50 inset-0 bg-black bg-opacity-80 flex items-center justify-center">
          <button className="absolute top-4 right-6 text-white text-4xl font-bold" onClick={() => setShowModal(false)}>
            ×
          </button>
          <img
            src={rawImages[modalIndex]}
            alt={`${displayName} фото ${modalIndex + 1}`}
            className="max-h-[80vh] max-w-[80vw] rounded-xl shadow-lg"
          />
        </div>
      )}
      <Footer />
    </div>
  );
}
