function SortControl({ sort, setSort }) {
  const options = [
    { value: "asc", label: "Cheapest" },
    { value: "desc", label: "Top Priced" },
    { value: "popular", label: "Popular" },
    { value: "discount", label: "Discounts" }
  ];
  return (
    <div className="sort-bar">
      <span className="sort-label">Sort:</span>
      <div className="sort-buttons">
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
          className="sort-btn reset-btn"
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
export default SortControl;
