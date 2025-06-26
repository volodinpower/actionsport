import React from "react";
import { Link } from "react-router-dom";
import "./Breadcrumbs.css";

function BreadcrumbsComponent({ items, onBreadcrumbClick }) {
  if (!items || items.length < 2) return null;

  return (
    <nav className="breadcrumbs-nav" aria-label="Breadcrumb">
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

export default React.memo(BreadcrumbsComponent);
