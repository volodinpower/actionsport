import { useEffect, useState } from "react";
import './SortControl.css'

function SortControl({ sort, setSort }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const options = [
    { value: "asc", label: "Cheapest" },
    { value: "desc", label: "Top Priced" },
    { value: "popular", label: "Popular" },
    { value: "discount", label: "Discounts" }
  ];

  if (isMobile) {
    return (
      <div className="sort-bar-mobile">
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="sort-select"
        >
          <option value="">Sort</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="sort-bar">
      <span className="sort-label">Sort:</span>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => setSort(opt.value)}
          className={`sort-btn${sort === opt.value ? " active" : ""}`}
        >
          {opt.label}
        </button>
      ))}
      <button
        onClick={() => setSort("")}
        className="sort-btn"
        style={{ minWidth: 110 }}
      >
        Reset All
      </button>
    </div>
  );
}
export default SortControl;
