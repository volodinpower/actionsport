import { Link } from "react-router-dom";
import "./Breadcrumbs.css";

export default function Breadcrumbs({ items, onBreadcrumbClick, marginBottom = 10 }) {
  if (!items || items.length < 2) return null;

  return (
    <nav
      className="breadcrumbs-nav"
      aria-label="Breadcrumb"
      style={{ marginBottom }}
    >
      {items.map((item, idx) =>
        idx < items.length - 1 ? (
          <span key={`${item.label}-${idx}`}>
            <Link
              to="#"
              className="breadcrumb-link"
              onClick={e => {
                e.preventDefault();
                onBreadcrumbClick(idx);
              }}
              aria-current={idx === items.length - 2 ? "page" : undefined}
            >
              {item.label}
            </Link>
            <span className="breadcrumb-divider">/</span>
          </span>
        ) : (
          <span key={`${item.label}-${idx}`} className="breadcrumb-current" aria-current="page">
            {item.label}
          </span>
        )
      )}
    </nav>
  );
}
