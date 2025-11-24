// src/components/Banner.jsx
import "./Banner.css";
import { useEffect, useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const API_BANNERS = (import.meta.env.VITE_API_URL || "") + "/banners";
const MAX_RETRIES = import.meta.env.DEV ? 0 : 3;
const RETRY_DELAY_MS = import.meta.env.DEV ? 0 : 4000;

// 1x1 PNG серого цвета — на крайний случай, если даже /no-image.jpg 404
const DATA_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGD4DwABpQG9Gbq7kgAAAABJRU5ErkJggg==";

function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  if (!path) return "/no-image.jpg";
  if (path.startsWith("http")) return path;
  return base + (path.startsWith("/") ? path : "/" + path);
}
function withVersion(url, ver) {
  if (!url || !ver) return url;
  return url + (url.includes("?") ? "&" : "?") + "v=" + encodeURIComponent(String(ver));
}

export default function Banner() {
  const [banners, setBanners] = useState([]);
  const [fail, setFail] = useState([]);   // по индексу: true, если ошибка
  const [loadingList, setLoadingList] = useState(true);
  const [retryAttempt, setRetryAttempt] = useState(0);

  useEffect(() => {
    let c = false;
    let retryTimer = null;

    async function loadBanners() {
      if (!c) setLoadingList(true);
      try {
        const res = await fetch(API_BANNERS, { credentials: "include" });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        if (!c) {
          setBanners(arr);
          setFail(arr.map(() => false));
          setLoadingList(false);
        }
      } catch (e) {
        if (c) return;
        console.error("Failed to fetch /banners:", e);
        setBanners([]);
        setFail([]);
        if (retryAttempt < MAX_RETRIES) {
          retryTimer = setTimeout(() => setRetryAttempt((prev) => prev + 1), RETRY_DELAY_MS);
        } else {
          setLoadingList(false);
        }
      }
    }

    loadBanners();
    return () => {
      c = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [retryAttempt]);

  const slides = useMemo(() => {
    return banners.map((b) => {
      const url = apiUrl(b.image_url);
      const finalUrl = withVersion(url, b.version || b.updated_at || b.etag || null);
      return { ...b, finalUrl };
    });
  }, [banners]);

  if (loadingList) {
    return <div className="banner-aspect" />; // серый фон из CSS
  }
  if (!slides.length) {
    return (
      <div className="banner-aspect flex items-center justify-center text-gray-500">
        No banner
      </div>
    );
  }

  return (
    <div className="banner-aspect overflow-hidden">
      <Swiper
        key={slides.length}
        modules={[Navigation, Pagination, Autoplay]}
        loop={true}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation={true}
        className="h-full"
      >
        {slides.map((b, idx) => {
          const errored = fail[idx];

          return (
            <SwiperSlide key={b.id || idx}>
              <a href={b.link || "#"} target={b.link ? "_blank" : "_self"} rel="noopener noreferrer">
                <div className="w-full h-full" style={{ background: "#f3f3f3" }}>
                  <img
                    src={errored ? "/no-image.jpg" : b.finalUrl}
                    alt={b.alt || b.title || `Banner ${idx + 1}`}
                    draggable={false}
                    loading={idx === 0 ? "eager" : "lazy"}
                    decoding="async"
                    onError={(e) => {
                      console.error("Image failed:", b.finalUrl);
                      // Пробуем локальный фолбек, если и он не существует — уйдём на data URI
                      e.currentTarget.onerror = null; // чтобы не зациклиться
                      e.currentTarget.src = "/no-image.jpg";
                      setFail((prev) => {
                        const n = [...prev];
                        n[idx] = true;
                        return n;
                      });
                      e.currentTarget.addEventListener("error", () => {
                        e.currentTarget.src = DATA_FALLBACK;
                      }, { once: true });
                    }}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              </a>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
}
