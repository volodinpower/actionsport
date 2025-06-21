import "./SortControl.css"

// SortControl.jsx
const sortOptions = [
  { value: "asc", label: "Cheaper" },
  { value: "desc", label: "Top Priced" },
  { value: "discount", label: "Discount" },
  { value: "popular", label: "Popular" }
];

export default function SortControl({ sort, setSort }) {
  return (
    <div className="sort-bar">
      <div className="sort-buttons">
        {sortOptions.map(opt => (
          <button
            key={opt.value}
            className={`sort-btn${sort === opt.value ? " active" : ""}`}
            onClick={() => setSort(sort === opt.value ? "" : opt.value)}
            type="button"
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
