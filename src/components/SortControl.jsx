import "./SortControl.css";

const options = [
  { value: "asc", label: "Сначала дешёвые" },
  { value: "desc", label: "Сначала дорогие" },
  { value: "popular", label: "Популярные" },
  { value: "discount", label: "Сначала скидки" }
];

export default function SortControl({ sort, setSort }) {
  return (
    <div className="sort-bar">
      <div className="sort-btn-group">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSort(opt.value)}
            className={`sort-btn${sort === opt.value ? " active" : ""}`}
            aria-pressed={sort === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="sort-reset-row">
        <span
          className="sort-reset-link"
          onClick={() => setSort("")}
          tabIndex={0}
          role="button"
        >
          reset sort
        </span>
      </div>
    </div>
  );
}
