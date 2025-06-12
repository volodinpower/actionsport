// src/components/Header.jsx
import { useState, useEffect } from "react";
import NavMenu from "./NavMenu";
import SearchBar from "./SearchBar";
import "./Header.css";

export default function Header({ onSearch, breadcrumbs, isHome }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const runSearch = (query, crumbs, exclude = "", brand = undefined, category = undefined) => {
    if (onSearch) onSearch(query, crumbs, exclude, brand, category);
    setActiveMenu(null);
    setMobileMenuOpen(false);
  };

  return (
    <header>
      {/* Верхняя белая полоса с логотипом (скрываем на мобилках) */}
      {!isMobile && (
        <div className="w-full bg-white border-b border-gray-200">
          <div className="max-w-[1128px] mx-auto py-2 flex justify-center">
            <a href="/">
              <img src="/logo.png" alt="Logo" className="logo" />
            </a>
          </div>
        </div>
      )}

      {/* Черная полоса меню */}
      <div className="w-full bg-[#222] relative z-40 px-4 py-1 flex items-center justify-between">
        {isMobile ? (
          <>
            {/* Бургер и маленький логотип слева */}
            <div className="flex items-center space-x-2">
              <button
                aria-label="Toggle menu"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-white text-2xl focus:outline-none"
              >
                &#9776;
              </button>
              <a href="/">
                <img src="/logo.png" alt="Logo" className="h-8 object-contain" />
              </a>
            </div>

            {/* Поиск справа, с отступом */}
            <div className="flex-grow ml-4">
              <SearchBar onSearch={runSearch} />
            </div>
          </>
        ) : (
          <>
            <NavMenu
              onMenuSearch={runSearch}
              activeMenu={activeMenu}
              setActiveMenu={setActiveMenu}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              breadcrumbs={breadcrumbs}
              isHome={isHome}
            />
            <SearchBar onSearch={runSearch} />
          </>
        )}
      </div>

      {/* Мобильное меню (бургер) */}
      {isMobile && mobileMenuOpen && (
        <div className="bg-[#222] text-white px-4 py-2">
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
