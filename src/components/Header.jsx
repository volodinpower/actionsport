import { useState, useEffect } from "react";
import NavMenu from "./NavMenu";
import SearchBar from "./SearchBar";
import "./Header.css";

export default function Header({ onSearch, breadcrumbs, isHome, setCategoryFilter, setForceOpenCategory }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const runSearch = (query, crumbs, exclude = "", brand, category) => {
    if (onSearch) onSearch(query, crumbs, exclude, brand, category);
    setActiveMenu(null);
    setMobileMenuOpen(false);
    setShowSearch(false);
  };

  if (isMobile) {
    // --- МОБИЛЬНАЯ ВЕРСИЯ ---
    return (
      <header className="main-header">
        <div className="nav-bar">
          {/* Бургер слева */}
          <button
            aria-label="Открыть меню"
            onClick={() => setMobileMenuOpen(true)}
            className="burger-btn"
          >
            &#9776;
          </button>
          {/* Лого по центру */}
          <div className="mobile-logo-center">
            <a href="/">
              <img src="/logo.png" alt="Logo" className="logo-mobile" />
            </a>
          </div>
          {/* Лупа справа */}
          <button
            className="search-btn search-btn-mobile"
            aria-label="Открыть поиск"
            onClick={() => setShowSearch(true)}
          >
            <svg width="24" height="24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/>
              <line x1="16" y1="16" x2="22" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        {/* Меню (может быть открыто) */}
        {mobileMenuOpen && (
          <NavMenu
            onMenuSearch={runSearch}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            breadcrumbs={breadcrumbs}
            isHome={isHome}
            mobileView={true}
            setCategoryFilter={setCategoryFilter}
            setForceOpenCategory={setForceOpenCategory}
          />
        )}
        {/* Поиск поверх меню */}
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

  // --- ДЕСКТОПНАЯ ВЕРСИЯ ---
  return (
    <header className="main-header">
      {/* Белая полоса с лого */}
      <div className="logo-bar">
        <div className="logo-bar-inner">
          <a href="/">
            <img src="/logo.png" alt="Logo" className="logo-desktop" />
          </a>
        </div>
      </div>
      {/* Черная полоса — меню и лупа */}
      <div className="nav-bar">
        <div className="nav-menu-wrap">
          <NavMenu
            onMenuSearch={runSearch}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            breadcrumbs={breadcrumbs}
            isHome={isHome}
            setCategoryFilter={setCategoryFilter}
            setForceOpenCategory={setForceOpenCategory}
          />
        </div>
        <div className="search-desktop-spacer"></div>
        <button
          className="search-btn search-btn-desktop"
          aria-label="Открыть поиск"
          onClick={() => setShowSearch(true)}
        >
          <svg width="24" height="24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/>
            <line x1="16" y1="16" x2="22" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        {/* Модалка поиска на всю ширину */}
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
