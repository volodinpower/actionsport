import { useState, useEffect } from "react";
import "./SortControl.css";

const options = [
  { value: "", label: "Без сортировки" },
  { value: "asc", label: "Сначала дешёвые" },
  { value: "desc", label: "Сначала дорогие" },
  { value: "popular", label: "Популярные" },
  { value: "discount", label: "Сначала скидки" },
];

function useIsMobile(breakpoint = 600) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= breakpoint);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function SortControl({ sort, setSort }) {
  const isMobile = useIsMobile(600);

  if (isMobile) {
    // --- Мобильная версия: выпадающий select и reset справа ---
    return (
      <div className="sort-bar-mobile">
        <select
          className="sort-select"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          {options.map(opt => (
            <option value={opt.value} key={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          className="reset-link-mobile"
          onClick={() => setSort("")}
          disabled={!sort}
          type="button"
        >
          Reset
        </button>
      </div>
    );
  }

  // --- Десктопная версия: кнопки как у тебя ---
  return (
    <div className="sort-bar">
      <div className="sort-buttons">
        {options.slice(1).map(opt => (
          <button
            key={opt.value}
            type="button"
            className={`sort-btn${sort === opt.value ? " active" : ""}`}
            onClick={() => setSort(opt.value)}
            aria-pressed={sort === opt.value}
          >
            {opt.label}
          </button>
        ))}
        <button
          className="reset-link"
          onClick={() => setSort("")}
          disabled={!sort}
          type="button"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
