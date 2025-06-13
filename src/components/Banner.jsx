import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const API_BANNERS = (import.meta.env.VITE_API_URL || "") + "/banners";

function getImageUrl(url) {
  if (!url) return "/no-image.jpg";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL || "";
  return base + (url.startsWith("/") ? url : "/" + url);
}

const Banner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_BANNERS)
      .then((res) => res.json())
      .then((data) => {
        setBanners(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setBanners([]));
  }, []);

  if (loading) {
    return (
      <div className="w-full aspect-[25/9] bg-gray-100 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!banners.length) {
    return (
      <div className="w-full aspect-[25/9] bg-gray-100 flex items-center justify-center text-gray-500">
       No banner
      </div>
    );
  }

  return (
    // Используем классы Tailwind для адаптивного aspect-ratio
    <div className="w-full overflow-hidden shadow-lg aspect-[25/9]">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        loop={true}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation={true}
        className="h-full"
      >
        {banners.map((b, idx) => (
          <SwiperSlide key={b.id || idx}>
            <a
              href={b.link || "#"}
              target={b.link ? "_blank" : "_self"}
              rel="noopener noreferrer"
            >
              <img
                src={getImageUrl(b.image_url)}
                alt={b.alt || b.title || `Banner ${idx + 1}`}
                className="w-full h-full object-cover object-center"
                draggable={false}
              />
            </a>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default Banner;
