import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPopularBrands } from "../api";

const MENU_ORDER = [
  "snowboard",
  "skateboard",
  "wake",
  "sup",
  "shoes",
  "clothes",
  "accessories",
  "brands",
  "sale",
];

const SALE_CATEGORY = {
  category_key: "sale",
  label: "Sale",
  subcategories: [],
};

const BRANDS_CATEGORY = {
  category_key: "brands",
  label: "Brands",
  subcategories: [],
};

const BRANDS_MENU_LIMIT = 17;
const HEADER_HEIGHT = 124; // Измени под свой header, если нужно

export default function NavMenu({
  onMainCategorySelect,
  activeMenu,
  setActiveMenu,
  mobileMenuOpen,
  setMobileMenuOpen,
}) {
  const [categories, setCategories] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [openSubmenus, setOpenSubmenus] = useState([]);
  const [popularBrands, setPopularBrands] = useState([]);
  const navigate = useNavigate();

  // --- Загрузка популярных брендов ---
  useEffect(() => {
    fetchPopularBrands().then(setPopularBrands).catch(() => setPopularBrands([]));
  }, []);

  // --- Категории ---
  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + "/categories")
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setCategories([SALE_CATEGORY]);
          return;
        }
        const dict = Object.fromEntries(
          data.map((cat) => [
            (cat.category_key || cat.key || cat.name).toLowerCase(),
            {
              ...cat,
              label:
                cat.label ||
                cat.name ||
                cat.title ||
                cat.category_title ||
                cat.category_key,
              subcategories: (cat.subcategories || []).map((sub) =>
                typeof sub === "string"
                  ? { label: sub, subcategory_key: sub }
                  : {
                      ...sub,
                      subcategory_key: sub.subcategory_key || sub.query,
                    }
              ),
            },
          ])
        );
        dict["sale"] = SALE_CATEGORY;
        dict["brands"] = BRANDS_CATEGORY;
        const ordered = MENU_ORDER.map((key) => dict[key]).filter(Boolean);
        setCategories(ordered.length ? ordered : [SALE_CATEGORY]);
      })
      .catch(() => {
        setCategories([SALE_CATEGORY]);
      });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --------- MOBILE MENU ---------
  if (isMobile && mobileMenuOpen) {
    return (
      <div className="mobile-menu-modal">
        <button
          className="mobile-menu-close"
          onClick={() => {
            setMobileMenuOpen(false);
            setOpenSubmenus([]);
          }}
          aria-label="Close menu"
        >
          &times;
        </button>
        <ul className="mobile-menu-list">
          {categories.map((cat) => (
            <li key={cat.category_key} className="mobile-menu-li" style={{ padding: 0 }}>
              <div className="mobile-menu-row">
                <button
                  className={`mobile-menu-item ${
                    cat.category_key === "sale" ? "nav-menu-sale" : ""
                  }`}
                  onClick={() => {
                    if (cat.category_key === "brands") {
                      navigate("/brands");
                      setMobileMenuOpen(false);
                      setOpenSubmenus([]);
                      setActiveMenu(null);
                    } else {
                      onMainCategorySelect?.(cat.category_key, cat.label, "");
                      setMobileMenuOpen(false);
                      setOpenSubmenus([]);
                      setActiveMenu(null);
                    }
                  }}
                >
                  {cat.label}
                </button>
                {(cat.category_key !== "sale" && cat.subcategories.length > 0) && cat.category_key !== "brands" ? (
                  <button
                    className="mobile-menu-plus"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenSubmenus((prev) =>
                        prev.includes(cat.category_key)
                          ? prev.filter((n) => n !== cat.category_key)
                          : [...prev, cat.category_key]
                      );
                    }}
                    aria-label="Open submenu"
                  >
                    {openSubmenus.includes(cat.category_key) ? "−" : "+"}
                  </button>
                ) : null}
              </div>
              <AnimatePresence initial={false}>
                {cat.category_key !== "sale" &&
                  openSubmenus.includes(cat.category_key) &&
                  cat.category_key !== "brands" && (
                    <motion.ul
                      className="mobile-submenu-list"
                      style={{ paddingLeft: 14 }}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {cat.subcategories.map((sub) => (
                        <li key={sub.subcategory_key}>
                          <button
                            className="mobile-menu-item"
                            style={{ fontSize: "1.05em" }}
                            onClick={() => {
                              onMainCategorySelect?.(
                                cat.category_key,
                                cat.label,
                                sub.subcategory_key
                              );
                              setMobileMenuOpen(false);
                              setOpenSubmenus([]);
                              setActiveMenu(null);
                            }}
                          >
                            {sub.label}
                          </button>
                        </li>
                      ))}
                    </motion.ul>
                  )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // --------- DESKTOP MENU ---------
  if (!isMobile) {
    return (
      <div style={{ position: "relative", zIndex: 50 }}>
        <nav>
          <ul className="flex gap-6 items-center text-base font-medium nav-menu-wrap">
            {categories.map((cat) => (
              <li
                key={cat.category_key}
                className="cursor-pointer h-10 flex items-center relative"
                style={{ color: "#fff" }}
                onMouseEnter={() =>
                  cat.category_key === "sale"
                    ? setActiveMenu(null)
                    : setActiveMenu(cat.category_key)
                }
                onMouseLeave={() => setActiveMenu(null)}
              >
                <span
                  className={cat.category_key === "sale" ? "nav-menu-sale" : ""}
                  onClick={() => {
                    if (cat.category_key === "brands") {
                      navigate("/brands");
                      setActiveMenu(null);
                    } else {
                      onMainCategorySelect?.(cat.category_key, cat.label, "");
                      setActiveMenu(null);
                    }
                  }}
                  style={{ display: "inline-block", width: "100%" }}
                >
                  {cat.label}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        {/* --------- DROPDOWNS (fixed по всей ширине!) --------- */}
        <AnimatePresence>
          {/* --- Brands Dropdown (колонки по 6 + "See all brands" в позиции 18) --- */}
          {activeMenu === "brands" && (
            <motion.div
              className="fixed left-0 right-0 z-40"
              style={{
                top: HEADER_HEIGHT,
                width: "100vw",
                backgroundColor: "#16181a",
                padding: "16px 0",
                zIndex: 9999,
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.23 }}
              onMouseEnter={() => setActiveMenu("brands")}
              onMouseLeave={() => setActiveMenu(null)}
            >
              <div className="flex flex-row items-start text-sm px-[calc((100vw-1128px)/2)] pl-6">
                {/* Колонки по 6, See all brands — в позиции 18 */}
                {(() => {
                  // 17 брендов + See all brands как 18-й элемент
                  const items = [
                    ...popularBrands.slice(0, BRANDS_MENU_LIMIT),
                    { isSeeAll: true },
                  ];
                  const columns = [];
                  const MAX_ITEMS = 6;
                  for (let i = 0; i < items.length; i += MAX_ITEMS) {
                    columns.push(items.slice(i, i + MAX_ITEMS));
                  }
                  return columns.map((col, idx) => (
                    <div key={idx} className="flex flex-col mr-2">
                      {col.map((b, i) =>
                        b.isSeeAll ? (
                          <button
                            key="see-all-brands"
                            className="text-left text-sm text-cyan-400 hover:text-white h-8 leading-tight w-40 font-semibold"
                            onClick={() => {
                              navigate("/brands");
                              setActiveMenu(null);
                            }}
                          >
                            See all brands →
                          </button>
                        ) : (
                          <button
                            key={b.brand || b}
                            className="text-left text-sm text-gray-400 hover:text-white h-8 leading-tight w-40"
                            onClick={() => {
                              navigate(`/?category=brands&brand=${encodeURIComponent(b.brand || b)}`);
                              setActiveMenu(null);
                            }}
                          >
                            {b.brand || b}
                          </button>
                        )
                      )}
                    </div>
                  ));
                })()}
              </div>
            </motion.div>
          )}
          {/* --- Category Dropdowns --- */}
          {activeMenu &&
            activeMenu !== "sale" &&
            activeMenu !== "brands" &&
            categories.find((cat) => cat.category_key === activeMenu)?.subcategories.length > 0 && (
              <motion.div
                className="fixed left-0 right-0 z-40"
                style={{
                  top: HEADER_HEIGHT,
                  width: "100vw",
                  backgroundColor: "#16181a",
                  paddingTop: "12px",
                  paddingBottom: "12px",
                  height: "auto",
                  zIndex: 9999,
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                onMouseEnter={() => setActiveMenu(activeMenu)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <div className="flex flex-row items-start text-sm px-[calc((100vw-1128px)/2)] pl-6">
                  {(() => {
                    const submenuItems =
                      categories.find((cat) => cat.category_key === activeMenu)?.subcategories ||
                      [];
                    const columns = [];
                    const MAX_ITEMS = 6;
                    for (let i = 0; i < submenuItems.length; i += MAX_ITEMS) {
                      columns.push(submenuItems.slice(i, i + MAX_ITEMS));
                    }
                    return submenuItems.length > 0
                      ? columns.map((col, idx) => (
                          <div key={idx} className="flex flex-col mr-2">
                            {col.map((sub) => (
                              <button
                                key={sub.subcategory_key}
                                className="text-left text-sm text-gray-400 hover:text-white h-8 leading-tight w-40"
                                onClick={() => {
                                  const parent = categories.find(
                                    (c) => c.category_key === activeMenu
                                  );
                                  onMainCategorySelect?.(
                                    parent?.category_key,
                                    parent?.label,
                                    sub.subcategory_key
                                  );
                                  setActiveMenu(null);
                                }}
                              >
                                {sub.label}
                              </button>
                            ))}
                          </div>
                        ))
                      : null;
                  })()}
                </div>
              </motion.div>
            )}
        </AnimatePresence>
      </div>
    );
  }

  return null;
}
