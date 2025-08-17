// src/components/Banner.jsx
import "./Banner.css";
import { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const API_BANNERS = (import.meta.env.VITE_API_URL || "") + "/banners";

function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  if (!path) return "/no-image.jpg";
  if (path.startsWith("http")) return path;
  return base + (path.startsWith("/") ? path : "/" + path);
}

function withVersion(url, ver) {
  if (!url) return url;
  if (!ver) return url;
  return url + (url.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(String(ver));
}

async function preloadWithRetry(src, attempts = 3) {
  let delay = 250;
  for (let i = 0; i < attempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = src;
      });
      return true;
    } catch (_) {
      if (i === attempts - 1) return false;
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2; // 250 → 500 → 1000 мс
    }
  }
  return false;
}

export default function Banner() {
  const [banners, setBanners] = useState([]);
  const [ready, setReady] = useState([]); // поиндексно: true/false
  const [loading, setLoading] = useState(true);

  // 1) тянем список баннеров
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(API_BANNERS, { credentials: "include" });
        const data = await res.json();
        if (!cancelled) {
          const arr = Array.isArray(data) ? data : [];
          setBanners(arr);
          setReady(arr.map(() => false));
        }
      } catch {
        if (!cancelled) {
          setBanners([]);
          setReady([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2) нормализуем ссылки и добавляем ?v=
  const slides = useMemo(() => {
    return banners.map((b) => {
      const raw = apiUrl(b.image_url);
      const ver = b.version || b.updated_at || b.etag || "";
      const finalUrl = withVersion(raw, ver);
      // если у тебя есть webp копии — автоматически подставим
      const webpUrl = finalUrl.replace(/(\.(jpe?g|png))(\?.*)?$/i, ".webp$3");
      return { ...b, finalUrl, webpUrl };
    });
  }, [banners]);

  // 3) прелоадим 1-й и 2-й слайды сразу; остальные — фоном
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!slides.length) {
        setLoading(false);
        return;
      }

      // Сначала — текущий (0) и следующий (1)
      const primeIdx = [0, 1].filter((i) => i < slides.length);
      const primeResults = await Promise.all(
        primeIdx.map((i) => preloadWithRetry(slides[i].finalUrl, 3))
      );

      if (!cancelled) {
        setReady((prev) => {
          const arr = slides.map((_, i) => prev[i] || false);
          primeIdx.forEach((i, k) => (arr[i] = primeResults[k]));
          return arr;
        });
        // как только хотя бы один прогрузился — убираем общий лоадер
        if (primeResults.some(Boolean)) setLoading(false);
      }

      // Остальные — фоном
      for (let i = 2; i < slides.length && !cancelled; i++) {
        const ok = await preloadWithRetry(slides[i].finalUrl, 3);
        if (!cancelled) {
          setReady((prev) => {
            const arr = [...prev];
            arr[i] = ok;
            return arr;
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [slides]);

  // UI: общий скелетон на первый рендер
  if (loading) {
    return (
      <div className="banner-aspect w-full relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #f3f3f3 0%, #e9e9e9 50%, #f3f3f3 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s infinite",
            borderRadius: 12
          }}
        />
      </div>
    );
  }

  if (!slides.length) {
    return (
      <div className="banner-aspect w-full bg-gray-100 flex items-center justify-center text-gray-500">
        No banner
      </div>
    );
  }

  // не запускаем autoplay, если ни один слайд не подтянулся
  const hasAnyReady = ready.some(Boolean);

  return (
    <div className="banner-aspect w-full overflow-hidden shadow-lg">
      <Swiper
        key={slides.length} // переинициализировать при смене набора
        modules={[Navigation, Pagination, Autoplay]}
        loop={true}
        autoplay={hasAnyReady ? { delay: 5000, disableOnInteraction: false } : false}
        pagination={{ clickable: true }}
        navigation={true}
        className="h-full"
      >
        {slides.map((b, idx) => {
          const show = ready[idx];
          return (
            <SwiperSlide key={b.id || idx}>
              <a
                href={b.link || "#"}
                target={b.link ? "_blank" : "_self"}
                rel="noopener noreferrer"
              >
                <div className="relative w-full h-full">
                  {/* Локальный скелетон слайда, пока конкретная картинка не готова */}
                  {!show && (
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(90deg, #f3f3f3 0%, #e9e9e9 50%, #f3f3f3 100%)",
                        backgroundSize: "200% 100%",
                        animation: "shimmer 1.6s infinite",
                        borderRadius: 12
                      }}
                    />
                  )}

                  <picture>
                    {/* Если webp существует — браузер возьмёт его; если нет — просто 404 проигнорируется */}
                    <source srcSet={b.webpUrl} type="image/webp" />
                    <img
                      src={b.finalUrl}
                      alt={b.alt || b.title || `Banner ${idx + 1}`}
                      className="w-full h-full object-cover object-center"
                      draggable={false}
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      style={{
                        opacity: show ? 1 : 0,
                        transition: "opacity 240ms ease"
                      }}
                      onError={(e) => {
                        e.currentTarget.src = "/no-image.jpg";
                        e.currentTarget.style.opacity = 1;
                      }}
                    />
                  </picture>
                </div>
              </a>
            </SwiperSlide>
          );
        })}
      </Swiper>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200px 0; }
          100% { background-position: calc(200px + 100%) 0; }
        }
      `}</style>
    </div>
  );
}
