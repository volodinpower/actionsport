import { useState, useEffect } from "react";
import NavMenu from "./NavMenu";
import SearchBar from "./SearchBar";
import "./Header.css";

export default function Header({ onSearch, breadcrumbs, isHome }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const runSearch = (query, crumbs, exclude = "", brand = undefined, category = undefined) => {
    if (onSearch) onSearch(query, crumbs, exclude, brand, category);
    setActiveMenu(null);
    setMobileMenuOpen(false);
    setShowSearch(false); // Закрываем поиск при поиске
  };

  return (
    <header className="main-header">
      {/* --- Десктоп: Белая полоса с лого --- */}
      {!isMobile && (
        <div className="logo-bar">
          <div className="logo-bar-inner">
            <a href="/">
              <img src="/logo.png" alt="Logo" className="logo-desktop" />
            </a>
          </div>
        </div>
      )}

      {/* --- Верхняя полоса (черная) --- */}
      <div className="nav-bar">
        {isMobile ? (
          <>
            <button
              aria-label="Открыть меню"
              onClick={() => setMobileMenuOpen(true)}
              className={`burger-btn${mobileMenuOpen ? " active" : ""}`}
            >
              &#9776;
            </button>
            <a href="/" className="mobile-logo-link">
              <img
                src="/logo.png"
                alt="Logo"
                className="logo-mobile"
              />
            </a>
            <div className="search-mobile-wrap">
              <button
                className="search-btn"
                aria-label="Открыть поиск"
                onClick={() => setShowSearch(true)}
              >
                {/* SVG-лупа */}
                <svg width="24" height="24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/>
                  <line x1="16" y1="16" x2="22" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="nav-menu-wrap">
              <NavMenu
                onMenuSearch={runSearch}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                breadcrumbs={breadcrumbs}
                isHome={isHome}
              />
            </div>
            <div className="search-desktop-wrap">
              <button
                className="search-btn"
                aria-label="Открыть поиск"
                onClick={() => setShowSearch(true)}
              >
                <svg width="24" height="24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/>
                  <line x1="16" y1="16" x2="22" y2="22" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </div>

      {/* --- ВЫПАДАЮЩАЯ ПАНЕЛЬ ПОИСКА (МОДАЛЬНО) --- */}
      {showSearch && (
        <div className="search-flyout">
          <SearchBar
            onSearch={runSearch}
            autoFocus={true}
            onClose={() => setShowSearch(false)}
          />
        </div>
      )}

      {/* --- Мобильное меню --- */}
      {isMobile && mobileMenuOpen && (
        <NavMenu
          onMenuSearch={runSearch}
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          breadcrumbs={breadcrumbs}
          isHome={isHome}
          mobileView={true}
        />
      )}
    </header>
  );
}
