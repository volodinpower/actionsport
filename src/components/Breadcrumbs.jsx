import { Link } from "react-router-dom";

export default function Breadcrumbs({ items, onBreadcrumbClick }) {
  if (!items || items.length < 2) return null; // не показываем если только "Главная"

  return (
    <nav className="flex px-4 py-2" aria-label="Breadcrumb">
      {items.map((item, idx) =>
        idx < items.length - 1 ? (
          <span key={item.label}>
            <Link
              to="#"
              className="text-black hover:underline"
              onClick={e => {
                e.preventDefault();
                onBreadcrumbClick(idx);
              }}
            >
              {item.label}
            </Link>
            <span className="mx-2 text-gray-400">/</span>
          </span>
        ) : (
          <span key={item.label} className="text-gray-500">
            {item.label}
          </span>
        )
      )}
    </nav>
  );
}
