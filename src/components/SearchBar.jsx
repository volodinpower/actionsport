import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar({ onSearch, autoFocus = false, onClose, fullWidth = false }) {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    if (autoFocus && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      const query = searchText.trim();
      if (query.length > 0) {
        setLoading(true);
        try {
          const res = await fetch(`/search_smart?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (Array.isArray(data)) {
            setSearchResults(data);
          } else if (data && Array.isArray(data.results)) {
            setSearchResults(data.results);
          } else {
            setSearchResults([]);
          }
        } catch (err) {
          setSearchResults([]);
        }
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchText]);

  return (
    <div className={`searchbar-modal-outer${fullWidth ? " searchbar-modal-outer-full" : ""}`}>
      <div className="searchbar-modal-inner">
        <div className="search-input-row">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Поиск..."
            className={`search-input${fullWidth ? " search-input-full" : ""}`}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch(
                  searchText.trim(),
                  [{ label: "Home", query: "", exclude: "" }],
                  ""
                );
                if (searchInputRef.current) searchInputRef.current.blur();
              }
              if (e.key === "Escape" && onClose) {
                onClose();
              }
            }}
          />
          {onClose && (
            <button
              className="search-close"
              onClick={onClose}
              tabIndex={-1}
              aria-label="Закрыть поиск"
            >
              ×
            </button>
          )}
          {searchText && (
            <button
              type="button"
              aria-label="Очистить поиск"
              className="search-clear"
              onClick={() => {
                setSearchText("");
                setSearchResults([]);
                onSearch("", [{ label: "Главная", query: "", exclude: "" }], "");
                if (searchInputRef.current) searchInputRef.current.focus();
              }}
            >
              ×
            </button>
          )}
        </div>
        {(searchText || loading) && (
          <div className="search-results-list">
            {loading ? (
              <div className="search-loading">Поиск...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) =>
                item.is_brand ? (
                  <div
                    key={"brand-" + item.sitename}
                    className="search-result-item brand"
                    onPointerDown={() => {
                      setSearchText(item.sitename);
                      setSearchResults([]);
                      onSearch("", [{ label: "Бренд", query: "", brand: item.sitename }], "", item.sitename);
                      if (onClose) onClose();
                    }}
                  >
                    <span>{item.sitename} — бренд</span>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="search-result-item"
                    onPointerDown={() => {
                      setSearchText(item.sitename);
                      setSearchResults([]);
                      if (searchInputRef.current) searchInputRef.current.blur();
                      if (onClose) onClose();
                      navigate(`/product/${item.id}`);
                    }}
                  >
                    <img
                      src={
                        item.main_img
                          ? (item.main_img.startsWith("http")
                              ? item.main_img
                              : `http://localhost:8000${item.main_img}`)
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
              <div className="search-no-results">
                Нет результатов
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
