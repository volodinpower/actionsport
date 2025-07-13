import { useRef, useState, useEffect } from "react";
import NavMenu from "./NavMenu";
import SearchBar from "./SearchBar";
import "./Header.css";

export default function Header({
  onSearch,
  onMenuCategoryClick,
  breadcrumbs,
  isHome,
  setCategoryFilter,
  setForceOpenCategory,
  navigate,
}) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [showSearch, setShowSearch] = useState(false);

  const navBarRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const runSearch = (
    query = "",
    crumbs = [{ label: "Main", query: query, exclude: "" }],
    exclude = "",
    brand = "",
    category = "",
    subcategory = "",
    gender = "",
    size = ""
  ) => {
    if (onSearch)
      onSearch(query, crumbs, exclude, brand, category, subcategory, gender, size);
    if (navigate) {
      if (query) {
        navigate(`/?search=${encodeURIComponent(query)}`);
      } else {
        navigate(`/`);
      }
    }
  };

  if (isMobile) {
    return (
      <header className="main-header">
        <div className="nav-bar">
          <button
            aria-label="Открыть меню"
            onClick={() => setMobileMenuOpen(true)}
            className="burger-btn"
          >
            &#9776;
          </button>
          <div className="mobile-logo-center">
            <a href="/">
              <img src="/logo.png" alt="Logo" className="logo-mobile" />
            </a>
          </div>
          <button
            className="search-btn search-btn-mobile"
            aria-label="Открыть поиск"
            onClick={() => setShowSearch(true)}
          >
            <svg width="24" height="24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2" />
              <line
                x1="16"
                y1="16"
                x2="22"
                y2="22"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <NavMenu
            onMainCategorySelect={onMenuCategoryClick}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
        {showSearch && (
          <div className="search-flyout search-flyout-mobile">
            <SearchBar
              onSearch={runSearch}
              autoFocus
              onClose={() => setShowSearch(false)}
              fullWidth={true}
            />
          </div>
        )}
      </header>
    );
  }

  // --- Десктоп ---
  return (
    <header className="main-header">
      <div className="logo-bar">
        <div className="logo-bar-inner">
          <a href="/">
            <img src="/logo.png" alt="Logo" className="logo-desktop" />
          </a>
        </div>
      </div>
      <div className="nav-bar" ref={navBarRef} style={{ position: "relative" }}>
        <div className="nav-menu-wrap">
          <NavMenu
            navBarRef={navBarRef} // <-- Передаем ref сюда!
            onMainCategorySelect={onMenuCategoryClick}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />
        </div>
        <div className="search-desktop-spacer"></div>
        <button
          className="search-btn search-btn-desktop"
          aria-label="Открыть поиск"
          onClick={() => setShowSearch(true)}
        >
          <svg width="24" height="24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2" />
            <line
              x1="16"
              y1="16"
              x2="22"
              y2="22"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {showSearch && (
          <div className="search-flyout searchbar-modal-outer-full">
            <SearchBar
              onSearch={runSearch}
              autoFocus
              onClose={() => setShowSearch(false)}
              fullWidth={true}
            />
          </div>
        )}
      </div>
    </header>
  );
}
