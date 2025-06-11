// src/components/Header.jsx
import { useState } from "react";
import NavMenu from "./NavMenu";
import SearchBar from "./SearchBar";
import { submenus } from "./NavMenu"; // submenus экспортируем из NavMenu.js
import "./Header.css";

export default function Header({ onSearch, breadcrumbs, isHome }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileActiveMenu, setMobileActiveMenu] = useState(null);

  // Универсальный запуск поиска/фильтрации (можешь менять под себя)
const runSearch = (query, crumbs, exclude = "", brand = undefined, category = undefined) => {
  console.log("Header: runSearch вызван с", { query, crumbs, exclude, brand, category });
  if (onSearch) onSearch(query, crumbs, exclude, brand, category);
  setActiveMenu(null);
  setMobileActiveMenu(null);
  setMobileMenuOpen(false);
};

  return (
    <div className="header">
      <div className="w-full bg-white border-b border-gray-200">
        <div className="max-w-[1128px] mx-auto py-2 flex justify-center">
          <a href="/">
            <img src="/logo.png" alt="Logo" className="h-14 object-contain" />
          </a>
        </div>
      </div>
      <div className="w-full bg-[#222] relative z-40">
        <div className="flex items-center justify-between px-4 py-1 text-white">
          <NavMenu
            onMenuSearch={runSearch}
            activeMenu={activeMenu} setActiveMenu={setActiveMenu}
            mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen}
            mobileActiveMenu={mobileActiveMenu} setMobileActiveMenu={setMobileActiveMenu}
            breadcrumbs={breadcrumbs}
            isHome={isHome}
          />
          <SearchBar onSearch={runSearch} />
        </div>
      </div>
    </div>
  );
}
