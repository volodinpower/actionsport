import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./SearchBar.css";

export default function SearchBar({
  onSearch,
  autoFocus = false,
  onClose,
  fullWidth = false,
}) {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "";

  // Автофокус при открытии поиска
  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [autoFocus]);

  // Поиск подсказок при наборе текста
  useEffect(() => {
    const delay = setTimeout(async () => {
      const query = searchText.trim();
      if (query.length > 0) {
        setLoading(true);
        try {
          const res = await fetch(
            `${API_URL}/products?search=${encodeURIComponent(query)}&limit=15`
          );
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } catch (err) {
          setSearchResults([]);
        }
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchText, API_URL]);

  // Обработка поиска по Enter или по кнопке
const handleSearch = () => {
  const trimmed = searchText.trim();
  if (trimmed) {
    onSearch(trimmed, [
      { label: "Main", query: "", exclude: "" },
      { label: `Search: ${trimmed}`, query: trimmed, exclude: "" }
    ]);
    setSearchResults([]);
    if (onClose) onClose();
    if (searchInputRef.current) searchInputRef.current.blur();
  }
};

  // Очистить поиск
  const handleClear = () => {
    setSearchText("");
    setSearchResults([]);
    onSearch(""); // Сброс поиска (отображать все)
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  // Выбор бренда из подсказок
  const handleBrandSelect = (sitename) => {
    setSearchText(sitename);
    setSearchResults([]);
    onSearch(sitename, [{ label: "Main", query: sitename, exclude: "" }]);
    if (onClose) onClose();
    if (searchInputRef.current) searchInputRef.current.blur();
  };

  // Переход к товару из подсказок
  const handleProductSelect = (item) => {
    setSearchText(item.sitename);
    setSearchResults([]);
    if (searchInputRef.current) searchInputRef.current.blur();
    if (onClose) onClose();
    navigate(`/product/${item.id}`);
  };

  return (
    <div className={`searchbar-modal-outer${fullWidth ? " searchbar-modal-outer-full" : ""}`}>
      <div className="searchbar-modal-inner">
        {/* Ряд с инпутом и крестиком */}
        <div className="search-input-and-close-row">
          <div className="search-input-row">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              className={`search-input${fullWidth ? " search-input-full" : ""}`}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
                if (e.key === "Escape" && onClose) {
                  onClose();
                }
              }}
              style={{
                paddingRight: searchText ? 64 : 16, // место для "Clear"
              }}
            />
            {/* Кнопка очистки */}
            {searchText && (
              <button
                type="button"
                aria-label="Clear search"
                className="search-clear-btn"
                onClick={handleClear}
              >
                Clear
              </button>
            )}
          </div>
          {/* Крестик закрытия — справа от инпута */}
          {onClose && (
            <button
              className="search-close-inline"
              onClick={onClose}
              tabIndex={-1}
              aria-label="Close search"
            >
              ×
            </button>
          )}
        </div>
        {(searchText || loading) && (
          <div className="search-results-list">
            {loading ? (
              <div className="search-loading">Search...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) =>
                item.is_brand ? (
                  <div
                    key={"brand-" + item.sitename}
                    className="search-result-item brand"
                    onClick={() => handleBrandSelect(item.sitename)}
                  >
                    <span>{item.sitename} - brand</span>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="search-result-item"
                    onClick={() => handleProductSelect(item)}
                  >
                    <img
                      src={
                        item.main_img
                          ? item.main_img.startsWith("http")
                            ? item.main_img
                            : `${API_URL}${item.main_img}`
                          : "/no-image.jpg"
                      }
                      alt=""
                      className="result-img"
                    />
                    <span>{item.sitename}</span>
                  </div>
                )
              )
            ) : (
              <div className="search-no-results">No results</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
