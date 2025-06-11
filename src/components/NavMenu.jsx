import { useState, useEffect } from "react";
import "./Header.css";

// --- Подменю для меню ---
export const submenus = {
  snowboard: [
    { label: "Boards", query: "^сноуборд, ^СНОУБОРД" },
    { label: "Boots", query: "ботинки для сноуборда" },
    { label: "Bindings", query: "крепления для сноуборда" },
    { label: "Goggles", query: "маска,линза" },
    { label: "Snow Bag", query: "чехол" }
  ],
  skateboard: [
    { label: "Decks", query: "дека" },
    { label: "Completes", query: "комплект скейтборд" },
    { label: "Trucks", query: "подвески" },
    { label: "Wheels", query: "колеса, КОЛЕСА" },
    { label: "Bearings", query: "подшипники, ПОДШИПНИКИ" },
    { label: "Tools", query: "инструмент, ластик для шкурки, ИНСТРУМЕНТ", exclude:"BINDING MULTI TOOL,#3 SCREW DRIVER" }
  ],
  sup: [
    { label: "Boards", query: "надувная доска SUP" },
    { label: "Paddles", query: "весло" },
    { label: "Pump", query: "насос" },
    { label: "Accessories", query: "sup accessories" }
  ],
  wake: [
    { label: "Boards", query: "^вейкборд, доска для вейкборда" },
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
    { label: "Pants", query: "^штаны, полукомбинезон" },
    { label: "Suits", query: "^комбинезон" },
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
  ],
  brands: [
    { label: "Salomon", brand: "Salomon" },
    { label: "Burton", brand: "Burton" },
    { label: "Union", brand: "Union" },
    { label: "Vans", brand: "Vans" },
    { label: "Capita", brand: "Capita" },
    { label: "Deeluxe", brand: "Deeluxe" },
    { label: "DC", brand: "DC" },
    { label: "Lib Tech", brand: "Lib Tech" },
    { label: "GNU", brand: "GNU" }
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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export default function NavMenu({
  onMenuSearch,
  activeMenu, setActiveMenu,
  mobileMenuOpen, setMobileMenuOpen,
  mobileActiveMenu, setMobileActiveMenu
}) {
  const isMobile = useIsMobile();

  const handleMenuClick = (menu) => {
    if (isMobile) {
      if (submenus[menu.name]) setMobileActiveMenu(menu.name);
      else {
        onMenuSearch(
          menu.query,
          [
            { label: "Main", query: "", exclude: "" },
            { label: menu.label, query: menu.query, exclude: menu.exclude || "" }
          ],
          menu.exclude || ""
        );
      }
    } else {
      onMenuSearch(
        menu.query,
        [
          { label: "Main", query: "", exclude: "" },
          { label: menu.label, query: menu.query, exclude: menu.exclude || "" }
        ],
        menu.exclude || ""
      );
    }
  };

const handleSubmenuClick = (menuName, itemLabel, query, brand) => {
  const submenu = submenus[menuName] || [];
  const item = submenu.find(i => i.label === itemLabel && (i.query === query || i.brand === brand));

  if (menuName === "brands") {
    onMenuSearch(
      "",
      [
        { label: "Main", query: "", exclude: "", brand: "" },
        { label: itemLabel, query: "", exclude: "", brand: brand || itemLabel }
      ],
      "",
      brand || itemLabel,
      itemLabel
    );
  } else {
    const categoryQueries = (submenus[menuName] || []).map(i => i.query).join(",");
    onMenuSearch(
      categoryQueries,
      [
        { label: "Main", query: "", exclude: "" },
        { label: menuName.charAt(0).toUpperCase() + menuName.slice(1), query: query, exclude: item?.exclude || "" }
      ],
      item?.exclude || "",
      "", // бренд
      itemLabel
    );
  }
};


  // --- Подменю для десктопа ---
  const submenuItems = activeMenu ? submenus[activeMenu] || [] : [];
  const columns = [];
  const MAX_ITEMS = 6;
  for (let i = 0; i < submenuItems.length; i += MAX_ITEMS) {
    columns.push(submenuItems.slice(i, i + MAX_ITEMS));
  }

  return (
    <>
      {/* Мобильное меню */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
          <div className="flex justify-between items-center p-4">
            <button
              className="p-2"
              onClick={() => {
                setMobileMenuOpen(false);
                setMobileActiveMenu(null);
              }}
              aria-label="Закрыть меню"
            >
              <svg width="32" height="32"><line x1="10" y1="10" x2="22" y2="22" stroke="#fff" strokeWidth="2"/><line x1="22" y1="10" x2="10" y2="22" stroke="#fff" strokeWidth="2"/></svg>
            </button>
          </div>
          <div className="bg-[#222] flex-1 p-6 overflow-y-auto">
            {!mobileActiveMenu && (
              <ul className="space-y-4 text-xl mt-6">
                {menuList.map((menu) => (
                  <li key={menu.name}>
                    <button
                      className={`w-full text-left ${menu.isSale ? "text-red-500" : "text-white"}`}
                      onClick={() => handleMenuClick(menu)}
                    >
                      {menu.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {mobileActiveMenu && (
              <div>
                <ul className="space-y-4 text-xl">
                  {submenus[mobileActiveMenu].map((item) => (
                    <li key={item.label}>
                      <button
                        className="text-gray-300 hover:text-white"
                        onClick={() =>
                          handleSubmenuClick(mobileActiveMenu, item.label, item.query, item.brand)
                        }
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  className="text-gray-300 mt-12 text-lg hover:text-white"
                  onClick={() => setMobileActiveMenu(null)}
                >← BACK</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Меню (десктоп) */}
      <nav className="hidden lg:block">
        <ul className="flex gap-6 items-center text-sm font-medium">
          {menuList.map((menu) => (
            <li
              key={menu.name}
              className={`hover:text-gray-300 cursor-pointer h-10 flex items-center${menu.isSale ? " text-red-500" : ""}`}
              onMouseEnter={() =>
                submenus[menu.name]
                  ? setActiveMenu(menu.name)
                  : setActiveMenu(null)
              }
              onClick={() => handleMenuClick(menu)}
            >
              {menu.label}
            </li>
          ))}
        </ul>
      </nav>

      {/* Десктопное подменю (штора) */}
      {activeMenu && !isMobile && (
        <div
          className="absolute left-0 right-0 bg-black text-gray-400 z-40 hidden lg:block"
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
                      onClick={() =>
                        handleSubmenuClick(activeMenu, item.label, item.query, item.brand)
                      }
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

      {/* Мобильный бургер */}
      <div className="lg:hidden flex items-center">
        <button
          className="p-2"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Открыть меню"
        >
          <svg width="32" height="32" fill="none"><rect y="7" width="32" height="3" rx="1.5" fill="#fff"/><rect y="15" width="32" height="3" rx="1.5" fill="#fff"/><rect y="23" width="32" height="3" rx="1.5" fill="#fff"/></svg>
        </button>
      </div>
    </>
  );
}
