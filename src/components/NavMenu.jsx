import { useState, useEffect } from "react";
import "./Header.css";

// --- Подменю для меню ---
export const submenus = {
  snowboard: [
    { label: "Boards", query: "сноуборд" },
    { label: "Boots", query: "ботинки для сноуборда" },
    { label: "Bindings", query: "крепления для сноуборда" },
    { label: "Goggles", query: "маска,линза" },
    { label: "Snow Bag", query: "чехол" }
  ],
  skateboard: [
    { label: "Decks", query: "дека" },
    { label: "Completes", query: "комплект скейтборд" },
    { label: "Trucks", query: "подвески" },
    { label: "Wheels", query: "колеса" },
    { label: "Bearings", query: "подшипники" },
    { label: "Tools", query: "инструмент, ластик для шкурки, ИНСТРУМЕНТ", exclude:"BINDING MULTI TOOL,#3 SCREW DRIVER" }
  ],
  sup: [
    { label: "Boards", query: "надувная доска SUP" },
    { label: "Paddles", query: "весло" },
    { label: "Pump", query: "насос" },
    { label: "Accessories", query: "sup accessories" }
  ],
  wake: [
    { label: "Boards", query: "вейкборд, доска для вейкборда" },
    { label: "Bindings", query: "крепления для вейкборда" },
    { label: "Wetsuit", query: "гидрокостюм" },
    { label: "Lycra", query: "лайкра" }
  ],
  shoes: [
    { label: "Sneakers", query: "кеды" },
    { label: "Trainers", query: "кроссовки, КРОССОВКИ, Кроссовки" },
    { label: "Boots", query: "^ботинки, ^Ботинки", exclude: "ботинки для сноуборда"}
  ],
  clothes: [
    { label: "Jackets", query: "куртка" },
    { label: "Pants", query: "штаны, полукомбинезон" },
    { label: "Suits", query: "комбинезон" },
    { label: "Thermal underwear", query: "термо" },
    { label: "T-shirts", query: "футболка" },
    { label: "Longsleeves", query: "лонгслив" },
    { label: "Hoodies", query: "толстовка" },
    { label: "Trousers & Jeans", query: "брюки,джинсы" },
    { label: "Shorts", query: "шорты" },
    { label: "Caps & Bucket hats", query: "кепка,панама" },
    { label: "Hats", query: "шапка" },
    { label: "Balaclavas & Gaiters", query: "балаклава,гейтор" },
    { label: "Gloves & Mittens", query: "перчатки,варежки" }
  ],
  accessories: [
    { label: "Bags", query: "рюкзак,сумка" },
    { label: "Cases", query: "чехол" }
  ]
};

const menuList = [
  ...Object.keys(submenus).map(key => ({
    label: key.charAt(0).toUpperCase() + key.slice(1),
    name: key,
    query: (submenus[key] || []).map(item => item.query).join(","),
    exclude: (submenus[key] || []).map(item => item.exclude).filter(Boolean).join(","),
    isSale: false
  })),
  { label: "Sale", name: "sale", query: "sale", isSale: true }
];

export default function NavMenu({
  onMenuSearch,
  activeMenu, setActiveMenu,
  mobileMenuOpen, setMobileMenuOpen,
  mobileActiveMenu, setMobileActiveMenu,
  breadcrumbs, isHome, mobileView,
  setCategoryFilter
}) {
  // Мобильный детектор
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const [openSubmenus, setOpenSubmenus] = useState([]);
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
            setMobileActiveMenu?.(null);
            setOpenSubmenus([]);
          }}
          aria-label="Close menu"
        >
          &times;
        </button>
        <ul className="mobile-menu-list">
          {menuList.map(menu => (
            <li key={menu.name} className="mobile-menu-li" style={{padding: 0}}>
              <div className="mobile-menu-row">
                <button
                  className={"mobile-menu-item" + (menu.isSale ? " sale" : "")}
                  onClick={() => {
                    onMenuSearch(
                      menu.query,
                      [
                        { label: "Main", query: "", exclude: "" },
                        { label: menu.label, query: menu.query, exclude: menu.exclude || "" }
                      ],
                      menu.exclude || ""
                    );
                    setMobileMenuOpen(false);
                    setMobileActiveMenu?.(null);
                    setOpenSubmenus([]);
                    if (setCategoryFilter) setCategoryFilter(""); // сбрасываем категорию при выборе раздела
                  }}
                >
                  {menu.label}
                </button>
                {submenus[menu.name] && (
                  <button
                    className="mobile-menu-plus"
                    onClick={e => {
                      e.stopPropagation();
                      toggleSubmenu(menu.name);
                    }}
                    aria-label="Open submenu"
                  >
                    {openSubmenus.includes(menu.name) ? "−" : "+"}
                  </button>
                )}
              </div>
              {openSubmenus.includes(menu.name) && (
                <ul className="mobile-submenu-list" style={{paddingLeft: 14, marginTop: 0, marginBottom: 0}}>
                  {submenus[menu.name].map((item) => (
                    <li key={item.label}>
                      <button
                        className="mobile-menu-item"
                        style={{fontSize: "1.05em"}}
                        onClick={() => {
                          onMenuSearch(
                            item.query,
                            [
                              { label: menu.label, query: menu.query },
                              { label: item.label, query: item.query }
                            ],
                            item.exclude || ""
                          );
                          if (setCategoryFilter) setCategoryFilter({ label: item.label, query: item.query });
                          setMobileMenuOpen(false);
                          setMobileActiveMenu?.(null);
                          setOpenSubmenus([]);
                        }}
                      >
                        {item.label}
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
    const submenuItems = activeMenu ? submenus[activeMenu] || [] : [];
    const columns = [];
    const MAX_ITEMS = 6;
    for (let i = 0; i < submenuItems.length; i += MAX_ITEMS) {
      columns.push(submenuItems.slice(i, i + MAX_ITEMS));
    }

    return (
      <>
        <nav>
          <ul className="flex gap-6 items-center text-base font-medium nav-menu-wrap">
            {menuList.map((menu) => (
              <li
                key={menu.name}
                className={
                  menu.isSale
                    ? "nav-menu-sale cursor-pointer h-10 flex items-center"
                    : "cursor-pointer h-10 flex items-center"
                }
                style={!menu.isSale ? { color: "#fff" } : {}}
                onMouseEnter={() =>
                  submenus[menu.name]
                    ? setActiveMenu(menu.name)
                    : setActiveMenu(null)
                }
                onClick={() => {
                  onMenuSearch(
                    menu.query,
                    [
                      { label: "Main", query: "", exclude: "" },
                      { label: menu.label, query: menu.query, exclude: menu.exclude || "" }
                    ],
                    menu.exclude || ""
                  );
                  if (setCategoryFilter) setCategoryFilter(""); // сбрасываем категорию при выборе раздела
                }}
              >
                {menu.label}
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
                    {col.map((item) => (
                      <button
                        key={item.label}
                        className="text-left text-sm text-gray-400 hover:text-white h-8 leading-tight w-40"
                        onClick={() => {
                          onMenuSearch(
                            item.query,
                            [
                              { label: menuList.find(m => m.name === activeMenu).label, query: menuList.find(m => m.name === activeMenu).query },
                              { label: item.label, query: item.query }
                            ],
                            item.exclude || ""
                          );
                          if (setCategoryFilter) setCategoryFilter({ label: item.label, query: item.query });
                        }}
                      >
                        {item.label}
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
