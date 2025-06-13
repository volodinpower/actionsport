import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar({ onSearch, autoFocus = false, onClose }) {
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
          // ---- DEBUG API ----
          // console.log("API DATA:", data);
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
    <div className="relative w-full max-w-lg z-50">
      <div className="flex items-center gap-2">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Поиск..."
          className="px-3 py-2 rounded text-black w-full text-base border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="text-gray-400 hover:text-red-400 ml-2"
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
            className="text-gray-400 hover:text-red-400 ml-2"
            style={{ background: "none", border: "none", lineHeight: 1 }}
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
        <div className="absolute left-0 top-full mt-2 bg-white border rounded shadow w-full max-h-64 overflow-auto text-black z-50">
          {loading ? (
            <div className="px-4 py-3 text-gray-500">Поиск...</div>
          ) : searchResults.length > 0 ? (
            searchResults.map((item, idx) =>
              item.is_brand ? (
                <div
                  key={"brand-" + item.sitename}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b cursor-pointer text-black"
                  onPointerDown={() => {
                    setSearchText(item.sitename);
                    setSearchResults([]);
                    onSearch("", [{ label: "Бренд", query: "", brand: item.sitename }], "", item.sitename);
                    if (onClose) onClose();
                  }}
                >
                  <span className="text-sm">{item.sitename} — бренд</span>
                </div>
              ) : (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 border-b cursor-pointer"
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
                    className="w-8 h-8 object-cover rounded border"
                  />
                  <span className="text-sm">{item.sitename}</span>
                </div>
              )
            )
          ) : (
            <div className="px-4 py-3 italic text-gray-400">
              Нет результатов
            </div>
          )}
        </div>
      )}
    </div>
  );
}
