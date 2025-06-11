function SortControl({ sort, setSort }) {
  const options = [
    { value: "asc", label: "Cheapest" },
    { value: "desc", label: "Top Priced" },
    { value: "popular", label: "Popular" },
    { value: "discount", label: "Discounts" }
  ];
  return (
    <div className="sort-bar">
      <span style={{ color: "#888", fontSize: 13, fontWeight: 500, marginRight: 6 }}>Sort:</span>
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
