import { Link } from "react-router-dom";

export default function Breadcrumbs({ items, onBreadcrumbClick }) {
  if (!items || items.length < 2) return null;

  return (
    <nav className="flex px-4 py-2" aria-label="Breadcrumb">
      {items.map((item, idx) =>
        idx < items.length - 1 ? (
          <span key={`${item.label}-${idx}`}>
            <Link
              to="#"
              className="text-black hover:underline"
              onClick={e => {
                e.preventDefault();
                onBreadcrumbClick(idx);
              }}
              aria-current={idx === items.length - 2 ? "page" : undefined}
            >
              {item.label}
            </Link>
            <span className="mx-2 text-gray-400">/</span>
          </span>
        ) : (
          <span key={`${item.label}-${idx}`} className="text-gray-500" aria-current="page">
            {item.label}
          </span>
        )
      )}
    </nav>
  );
}
