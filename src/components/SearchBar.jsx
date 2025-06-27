import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar({ onSearch, autoFocus = false, onClose, fullWidth = false }) {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef();
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "";

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
          const res = await fetch(`${API_URL}/search_smart?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } catch (err) {
          setSearchResults([]);
          console.error("Search error:", err);
        }
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchText]);

  const handleSearch = () => {
    // ВАЖНО: пробрасываем поиск только как query (в label можно 'Main' или 'Главная')
    const trimmed = searchText.trim();
    onSearch(
      trimmed,
      [{ label: "Main", query: trimmed, exclude: "" }],
      ""
    );
    if (searchInputRef.current) searchInputRef.current.blur();
    if (onClose) onClose();
  };

  return (
    <div className={`searchbar-modal-outer${fullWidth ? " searchbar-modal-outer-full" : ""}`}>
      <div className="searchbar-modal-inner">
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
          />
          {onClose && (
            <button
              className="search-close"
              onClick={onClose}
              tabIndex={-1}
              aria-label="Close search"
            >
              ×
            </button>
          )}
          {searchText && (
            <button
              type="button"
              aria-label="Clear search"
              className="search-clear"
              onClick={() => {
                setSearchText("");
                setSearchResults([]);
                onSearch("", [{ label: "Main", query: "", exclude: "" }], "");
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
              <div className="search-loading">Search...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) =>
                item.is_brand ? (
                  <div
                    key={"brand-" + item.sitename}
                    className="search-result-item brand"
                    onClick={() => {
                      setSearchText(item.sitename);
                      setSearchResults([]);
                      onSearch(
                        "",
                        [{ label: "Brand", query: "", brand: item.sitename }],
                        "",
                        item.sitename
                      );
                      if (onClose) onClose();
                    }}
                  >
                    <span>{item.sitename} - brand</span>
                  </div>
                ) : (
                  <div
                    key={item.id}
                    className="search-result-item"
                    onClick={() => {
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
                              : `${API_URL}${item.main_img}`)
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
                No results
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
