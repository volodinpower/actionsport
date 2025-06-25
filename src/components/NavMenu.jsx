import { useState, useEffect } from "react";
import "./Header.css";

export default function NavMenu({
  onMenuSearch,
  activeMenu, setActiveMenu,
  mobileMenuOpen, setMobileMenuOpen,
  setCategoryFilter,
  setForceOpenCategory,
}) {
  const [categories, setCategories] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [openSubmenus, setOpenSubmenus] = useState([]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    fetch(import.meta.env.VITE_API_URL + "/categories")
      .then(res => res.json())
      .then(data => {
        setCategories(
          (data || []).map(cat => ({
            ...cat,
            subcategories: (cat.subcategories || []).map(sub =>
              typeof sub === "string" ? { label: sub, query: sub } : sub
            )
          }))
        );
      });
  }, []);

  const toggleSubmenu = (name) => {
    setOpenSubmenus((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  // --- Мобильное меню ---
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
          {categories.map(cat => (
            <li key={cat.category_key} className="mobile-menu-li" style={{ padding: 0 }}>
              <div className="mobile-menu-row">
                <button
                  className="mobile-menu-item"
                  onClick={() => {
                    // Клик по главной категории: сбрасывает подкатегорию!
                    onMenuSearch(
                      "",
                      [
                        { label: "Main", query: "", exclude: "" },
                        { label: cat.category_key, query: cat.category_key }
                      ],
                      "",
                      "",
                      cat.category_key,
                      null // <-- subcategory = null
                    );
                    setMobileMenuOpen(false);
                    setOpenSubmenus([]);
                    setCategoryFilter?.(cat.category_key);
                  }}
                >
                  {cat.category_key}
                </button>
                {cat.subcategories.length > 0 && (
                  <button
                    className="mobile-menu-plus"
                    onClick={e => {
                      e.stopPropagation();
                      toggleSubmenu(cat.category_key);
                    }}
                    aria-label="Open submenu"
                  >
                    {openSubmenus.includes(cat.category_key) ? "−" : "+"}
                  </button>
                )}
              </div>
              {openSubmenus.includes(cat.category_key) && (
                <ul className="mobile-submenu-list" style={{ paddingLeft: 14 }}>
                  {cat.subcategories.map((sub) => (
                    <li key={sub.label}>
                      <button
                        className="mobile-menu-item"
                        style={{ fontSize: "1.05em" }}
                        onClick={() => {
                          onMenuSearch(
                            "",
                            [
                              { label: cat.category_key, query: cat.category_key },
                              { label: sub.label, query: sub.query }
                            ],
                            "",
                            "",
                            cat.category_key,
                            sub.label // <-- subcategory
                          );
                          setCategoryFilter?.(sub.label);
                          setForceOpenCategory?.(true);
                          setMobileMenuOpen?.(false);
                          setOpenSubmenus([]);
                        }}
                      >
                        {sub.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // --- Десктопное меню ---
  if (!isMobile) {
    const submenuItems = activeMenu
      ? (categories.find(cat => cat.category_key === activeMenu)?.subcategories || [])
      : [];
    const columns = [];
    const MAX_ITEMS = 6;
    for (let i = 0; i < submenuItems.length; i += MAX_ITEMS) {
      columns.push(submenuItems.slice(i, i + MAX_ITEMS));
    }

    return (
      <>
        <nav>
          <ul className="flex gap-6 items-center text-base font-medium nav-menu-wrap">
            {categories.map((cat) => (
              <li
                key={cat.category_key}
                className="cursor-pointer h-10 flex items-center"
                style={{ color: "#fff" }}
                onMouseEnter={() =>
                  cat.subcategories.length > 0
                    ? setActiveMenu(cat.category_key)
                    : setActiveMenu(null)
                }
              >
                <span
                  onClick={() => {
                    console.log("Клик по категории:", cat.category_key);
                    // Клик по главной категории: сбрасывает подкатегорию!
                    onMenuSearch(
                      "",
                      [
                        { label: "Main", query: "", exclude: "" },
                        { label: cat.category_key, query: cat.category_key }
                      ],
                      "",
                      "",
                      cat.category_key,
                      null // <-- subcategory = null
                    );
                    setCategoryFilter?.(cat.category_key);
                    setForceOpenCategory?.(false);
                  }}
                  style={{ display: "inline-block", width: "100%" }}
                >
                  {cat.category_key}
                </span>
              </li>
            ))}
          </ul>
        </nav>
        {activeMenu && (
          <div
            className="absolute left-0 right-0 bg-black text-gray-400 z-40"
            style={{
              top: "100%",
              width: "100vw",
              paddingTop: "12px",
              paddingBottom: "12px",
              height: `${Math.max(1, Math.min(submenuItems.length, MAX_ITEMS)) * 32 + 24}px`
            }}
            onMouseEnter={() => setActiveMenu(activeMenu)}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <div className="flex flex-row items-start text-sm px-[calc((100vw-1128px)/2)] pl-6">
              {submenuItems.length > 0 ? (
                columns.map((col, idx) => (
                  <div key={idx} className="flex flex-col mr-2">
                    {col.map((sub) => (
                      <button
                        key={sub.label}
                        className="text-left text-sm text-gray-400 hover:text-white h-8 leading-tight w-40"
                        onClick={() => {
                          onMenuSearch(
                            "",
                            [
                              { label: activeMenu, query: activeMenu },
                              { label: sub.label, query: sub.query }
                            ],
                            "",
                            "",
                            activeMenu,
                            sub.label // <-- subcategory
                          );
                          setCategoryFilter?.(sub.label);
                          setForceOpenCategory?.(true);
                        }}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                ))
              ) : null}
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
