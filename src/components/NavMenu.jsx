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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900); // 900px = твой порог
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 900);
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
  const [mobileOpenSubmenu, setMobileOpenSubmenu] = useState(null);

  // --- Мобильное меню ---
  if (isMobile && mobileMenuOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col">
        <div className="flex justify-between items-center p-4">
          <a href="/">
            <img src="/logo.png" alt="Logo" className="h-10 object-contain" />
          </a>
          <button
            className="p-2"
            onClick={() => {
              setMobileMenuOpen(false);
              setMobileActiveMenu?.(null);
              setMobileOpenSubmenu(null);
            }}
            aria-label="Закрыть меню"
          >
            <svg width="32" height="32"><line x1="10" y1="10" x2="22" y2="22" stroke="#fff" strokeWidth="2"/><line x1="22" y1="10" x2="10" y2="22" stroke="#fff" strokeWidth="2"/></svg>
          </button>
        </div>
        <div className="bg-[#222] flex-1 p-6 overflow-y-auto">
          <ul className="space-y-4 text-xl mt-6">
            {menuList.map((menu) => (
              <li key={menu.name} className="flex items-center">
                <button
                  className={`flex-1 text-left ${menu.isSale ? "text-red-500" : "text-white"}`}
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
                    setMobileOpenSubmenu(null);
                  }}
                >
                  {menu.label}
                </button>
                {submenus[menu.name] && submenus[menu.name].length > 0 && (
                  <button
                    className="ml-2 px-2 text-xl text-gray-400"
                    onClick={e => {
                      e.stopPropagation();
                      setMobileOpenSubmenu(
                        mobileOpenSubmenu === menu.name ? null : menu.name
                      );
                    }}
                    aria-label="Открыть подпункты"
                  >
                    {mobileOpenSubmenu === menu.name ? "−" : "+"}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {mobileOpenSubmenu && (
            <div className="pl-4 mt-2">
              <ul className="space-y-3 text-lg">
                {submenus[mobileOpenSubmenu].map((item) => (
                  <li key={item.label}>
                    <button
                      className="text-gray-300 hover:text-white"
                      onClick={() => {
                        onMenuSearch(
                          item.query,
                          [
                            { label: menuList.find(m => m.name === mobileOpenSubmenu).label, query: menuList.find(m => m.name === mobileOpenSubmenu).query },
                            { label: item.label, query: item.query }
                          ],
                          item.exclude || ""
                        );
                        setMobileMenuOpen(false);
                        setMobileActiveMenu?.(null);
                        setMobileOpenSubmenu(null);
                      }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    className="text-gray-400 text-sm mt-4"
                    onClick={() => setMobileOpenSubmenu(null)}
                  >
                    ← Назад
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
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
                onClick={() => {
                  onMenuSearch(
                    menu.query,
                    [
                      { label: "Main", query: "", exclude: "" },
                      { label: menu.label, query: menu.query, exclude: menu.exclude || "" }
                    ],
                    menu.exclude || ""
                  );
                }}
              >
                {menu.label}
              </li>
            ))}
          </ul>
        </nav>

        {/* Десктопное подменю (штора) */}
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
                        onClick={() =>
                          onMenuSearch(
                            item.query,
                            [
                              { label: menuList.find(m => m.name === activeMenu).label, query: menuList.find(m => m.name === activeMenu).query },
                              { label: item.label, query: item.query }
                            ],
                            item.exclude || ""
                          )
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
      </>
    );
  }

  // По дефолту рендерим null если не мобилка и не десктоп (теоретически не случается)
  return null;
}