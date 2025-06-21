// SortControl.jsx
const sortOptions = [
  { value: "asc", label: "Cheaper" },
  { value: "desc", label: "Top Priced" },
  { value: "discount", label: "Biggest Discount" },
  { value: "popular", label: "Most Popular" }
];

export default function SortControl({ sort, setSort }) {
  return (
    <div className="sort-bar">
      <span className="sort-label">Sort by:</span>
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
