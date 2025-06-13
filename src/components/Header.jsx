import { useState, useEffect } from "react";
import NavMenu from "./NavMenu";
import SearchBar from "./SearchBar";
import "./Header.css"; // Новый файл ниже

export default function Header({ onSearch, breadcrumbs, isHome }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const runSearch = (query, crumbs, exclude = "", brand = undefined, category = undefined) => {
    if (onSearch) onSearch(query, crumbs, exclude, brand, category);
    setActiveMenu(null);
    setMobileMenuOpen(false);
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
              onClick={() => setMobileMenuOpen(v => !v)}
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
              <SearchBar onSearch={runSearch} />
            </div>
          </>
        ) : (
          <>
            <div className="nav-menu-wrap">
              <NavMenu
                onMenuSearch={runSearch}
                activeMenu={activeMenu}
                setActiveMenu={setActiveMenu}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
                breadcrumbs={breadcrumbs}
                isHome={isHome}
              />
            </div>
            <div className="search-desktop-wrap">
              <SearchBar onSearch={runSearch} />
            </div>
          </>
        )}
      </div>

      {/* --- Мобильное меню (бургер) --- */}
      {isMobile && (
        <div className={`mobile-menu${mobileMenuOpen ? " open" : ""}`}>
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
        </div>
      )}
    </header>
  );
}
