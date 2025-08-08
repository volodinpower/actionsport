import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { fetchPopularBrands } from "../api";
import "./NavMenu.css";

// --- Кастомный порядок для подпунктов ---
const SUBCATEGORY_ORDERS = {
  snowboard: [
    "boards", "boots", "bindings", "jackets", "pants", "snow suits", "goggles"
  ],
  skateboard: [
    "decks", "trucks", "completes", "wheels", "bearings"
  ],
  wake: [
    "wakeboards", "wakebindings", "wetsuit", "vests", "lycra", "boardshorts", "poncho"
  ],
  sup: [
    "supboards", "paddles", "pump"
  ],
  shoes:[
    "trainers", "sneakers"
  ],
  clothes: [
    "tshirts", "hoodies", "shorts", "pants"
  ],
  accessories: [
    "sunglasses", "bags", "waist bags"
  ],
  protection:[
    "helmets","protection pack", "knee pads", "elbow pads", "wrist guards"
  ]
};
function normalizeKey(key) {
  return (key || "").trim().toLowerCase();
}
function orderSubcategories(subcategories, order) {
  if (!order) return subcategories;
  return subcategories.slice().sort((a, b) => {
    const ia = order.indexOf(normalizeKey(a.subcategory_key));
    const ib = order.indexOf(normalizeKey(b.subcategory_key));
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

const MENU_ORDER = [
  "snowboard", "skateboard", "wake", "sup",
  "shoes", "clothes", "accessories", "protection", "brands", "sale",
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

export default function NavMenu({
  navBarRef,
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
  const [dropdownTop, setDropdownTop] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPopularBrands().then(setPopularBrands).catch(() => setPopularBrands([]));
  }, []);

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
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- Динамическая позиция dropdown строго под nav-bar ---
  useEffect(() => {
    function updateDropdownTop() {
      if (navBarRef && navBarRef.current) {
        const rect = navBarRef.current.getBoundingClientRect();
        setDropdownTop(rect.bottom);
      }
    }
    updateDropdownTop();
    window.addEventListener("resize", updateDropdownTop);
    window.addEventListener("scroll", updateDropdownTop, true);
    return () => {
      window.removeEventListener("resize", updateDropdownTop);
      window.removeEventListener("scroll", updateDropdownTop, true);
    };
  }, [navBarRef]);

  useEffect(() => {
    if (!isMobile && activeMenu) {
      const closeOnScroll = () => setActiveMenu(null);
      window.addEventListener("scroll", closeOnScroll);
      return () => window.removeEventListener("scroll", closeOnScroll);
    }
  }, [isMobile, activeMenu, setActiveMenu]);

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
                  className={`mobile-menu-item ${cat.category_key === "sale" ? "nav-menu-sale" : ""}`}
                  onClick={() => {
                    if (cat.category_key === "brands") return;
                    onMainCategorySelect?.(cat.category_key, cat.label, "");
                    setMobileMenuOpen(false);
                    setOpenSubmenus([]);
                    setActiveMenu(null);
                  }}
                >
                  {cat.label}
                </button>
                {(cat.category_key === "brands" || (cat.category_key !== "sale" && cat.subcategories.length > 0)) ? (
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
                    <motion.div
                      className="mobile-submenu-list-grid"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="mobile-submenu-grid">
                        {(() => {
                          let submenuItems = cat.subcategories;
                          const order = SUBCATEGORY_ORDERS[normalizeKey(cat.category_key)];
                          submenuItems = orderSubcategories(submenuItems, order);
                          return submenuItems.map((sub) => (
                            <button
                              key={sub.subcategory_key}
                              className="mobile-menu-item mobile-submenu-item"
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
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )}
                {cat.category_key === "brands" &&
                  openSubmenus.includes("brands") && (
                    <motion.div
                      className="mobile-brands-submenu"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="mobile-brands-grid">
                        {popularBrands.slice(0, BRANDS_MENU_LIMIT).map((b) => (
                          <button
                            key={b.brand || b}
                            className="mobile-menu-item mobile-submenu-item"
                            style={{ textAlign: "left" }}
                            onClick={() => {
                              navigate(`/?category=brands&brand=${encodeURIComponent(b.brand || b)}`);
                              setMobileMenuOpen(false);
                              setOpenSubmenus([]);
                              setActiveMenu(null);
                            }}
                          >
                            {b.brand || b}
                          </button>
                        ))}
                        <button
                          className="mobile-menu-item mobile-menu-item-seeall"
                          onClick={() => {
                            navigate("/brands");
                            setMobileMenuOpen(false);
                            setOpenSubmenus([]);
                            setActiveMenu(null);
                          }}
                        >
                          See all brands →
                        </button>
                      </div>
                    </motion.div>
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
        <AnimatePresence>
          {activeMenu === "brands" && (
            <motion.div
              className="fixed left-0 right-0 z-40 desktop-menu-dropdown"
              style={{
                top: dropdownTop,
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
                {(() => {
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
          {activeMenu &&
            activeMenu !== "sale" &&
            activeMenu !== "brands" &&
            categories.find((cat) => cat.category_key === activeMenu)?.subcategories.length > 0 && (
              <motion.div
                className="fixed left-0 right-0 z-40 desktop-menu-dropdown"
                style={{
                  top: dropdownTop,
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
                    const submenuItemsRaw =
                      categories.find((cat) => cat.category_key === activeMenu)?.subcategories ||
                      [];
                    const order = SUBCATEGORY_ORDERS[normalizeKey(activeMenu)];
                    const submenuItems = orderSubcategories(submenuItemsRaw, order);
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
