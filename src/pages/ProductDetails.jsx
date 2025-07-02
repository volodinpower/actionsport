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
  if (url.startsWith("/")) return apiUrl(url);
  return url;
}

function normalize(val) {
  return (val || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}

function extractSizes(product) {
  if (!product) return [];
  if (Array.isArray(product.sizes))
    return product.sizes.filter(Boolean).filter(s => s && s.toLowerCase() !== "нет");
  if (typeof product.sizes === "string")
    return product.sizes
      .split(",")
      .map((s) => s.trim())
      .filter(s => s && s.toLowerCase() !== "нет");
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

  // Размеры (только по name + color)
  useEffect(() => {
    if (!product || !product.name || !product.color) {
      setAvailableSizes([]);
      return;
    }
    fetchProducts("", 1000).then((data) => {
      const nameNorm = normalize(product.name);
      const colorNorm = normalize(product.color);
      const filtered = data.filter(
        (item) =>
          normalize(item.name) === nameNorm &&
          normalize(item.color) === colorNorm
      );
      let sizes = [];
      filtered.forEach((item) => {
        sizes.push(...extractSizes(item));
      });
      setAvailableSizes(Array.from(new Set(sizes)));
    });
  }, [product]);

  // Цветовые варианты по name
  useEffect(() => {
    if (!product || !product.name) {
      setColorVariants([]);
      return;
    }
    fetchProducts("", 1000).then((data) => {
      const nameNorm = normalize(product.name);
      const seen = new Set();
      const variants = [];
      for (const item of data) {
        if (normalize(item.name) === nameNorm) {
          const c = normalize(item.color || "");
          if (!seen.has(c)) {
            seen.add(c);
            variants.push(item);
          }
        }
      }
      setColorVariants(variants);
    });
  }, [product]);

  // Картинки
  let rawImages = [];
  if (typeof product?.image_url === "string" && product.image_url.trim()) {
    const urls = product.image_url.split(",").map(u => u.trim()).filter(Boolean);
    const numbered = urls.filter(url => /_\d+\./.test(url));
    rawImages = numbered.length > 0 ? numbered : urls.filter(u => /_(main|prev)\./i.test(u));
    if (rawImages.length === 0) rawImages = urls;
    rawImages = rawImages.map(makeImageUrl);
  }
  if (rawImages.length === 0) rawImages = ["/no-image.jpg"];

  useEffect(() => {
    setMainIndex(0);
  }, [id, product?.image_url]);

  const displayName = product?.sitename || product?.name || "";

  // Хлебные крошки с сохранением из state, если есть
  const breadcrumbs =
    (location.state && location.state.breadcrumbs?.length > 1)
      ? [...location.state.breadcrumbs, { label: displayName, query: "" }]
      : [{ label: "Main", query: "" }, { label: displayName, query: "" }];

  const handleHeaderSearch = (query) => {
    navigate(query ? "/?search=" + encodeURIComponent(query) : "/");
  };

  // Кнопка "назад" с восстановлением состояния фильтров
  const handleGoBack = () => {
    if (location.state?.from && location.state.from !== "/") {
      navigate(location.state.from, {
        state: {
          categoryKey: location.state.categoryKey || "",
          categoryLabel: location.state.categoryLabel || "",
          subcategoryKey: location.state.subcategoryKey || "",
          searchQuery: location.state.searchQuery || "",
          brandFilter: location.state.brandFilter || "",
          sizeFilter: location.state.sizeFilter || "",
          genderFilter: location.state.genderFilter || "",
          forceOpenCategory: location.state.forceOpenCategory || false,
          breadcrumbs: location.state.breadcrumbs || [],
        },
        replace: true,
      });
    } else {
      navigate("/", { replace: true });
    }
  };

  if (error) return <div className="p-8 text-center text-red-600">Ошибка: {error}</div>;
  if (!product) return <div className="p-8 text-center">Loading...</div>;

  // Цветовые варианты
  const colorBlock = colorVariants.length <= 1 ? (
    <div className="mb-1 text-gray-600 text-sm"><b>color:</b> {product.color}</div>
  ) : (
    <div className="mb-1 text-gray-600 text-sm gap-10">
      <b>color:</b> {product.color}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        marginTop: 10,
        marginBottom: 10,
        maxWidth: 6 * 70
      }}>
        {colorVariants.map((item) => {
          const mainImg = item.image_url?.split(",").map(u => u.trim()).find(u => u.toLowerCase().includes("_main"));
          const imgSrc = mainImg ? apiUrl(mainImg) : "/no-image.jpg";
          const isCurrent = String(item.id) === String(product.id);
          return (
            <div key={item.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 75 }}>
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
                  width: 65,
                  height: 65
                }}
                title={item.color || ""}
                onClick={e => {
                  e.preventDefault();
                  if (!isCurrent) navigate(`/product/${item.id}`, { state: location.state });
                }}
              >
                <img
                  src={imgSrc}
                  alt={item.color || displayName}
                  style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 10, opacity: isCurrent ? 1 : 0.82 }}
                  draggable={false}
                />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header onSearch={handleHeaderSearch} breadcrumbs={breadcrumbs} isHome={false} />
      <div className="w-full mx-auto pt-1">
        <Breadcrumbs items={breadcrumbs} onBreadcrumbClick={idx => {
          if (idx === 0) {
            handleGoBack();
          } else if (location.state?.breadcrumbs) {
            const crumb = location.state.breadcrumbs[idx];
            if (crumb?.query) {
              navigate(`/?search=${encodeURIComponent(crumb.query)}`, {
                state: {
                  breadcrumbs: location.state.breadcrumbs.slice(0, idx + 1),
                  query: crumb.query
                }
              });
            }
          }
        }} />
        {/* ... остальной JSX с отображением товара, изображений и кнопкой назад */}
        {/* ... */}
        <Footer />
      </div>
    </div>
  );
}
