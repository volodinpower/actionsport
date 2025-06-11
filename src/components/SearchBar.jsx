// src/components/SearchBar.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchBar({ onSearch }) {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const delay = setTimeout(async () => {
      const query = searchText.trim();
      if (query.length > 0) {
        setLoading(true);
        try {
          const res = await fetch(`/search_smart?q=${encodeURIComponent(query)}`);
          const data = await res.json();
          setSearchResults(data);
        } catch {
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
    <div className="
      relative 
      ml-auto
      w-52
      sm:w-[200px]
      lg:w-[300px]
      xl:w-[300px]
      text-xs z-50
      transition-all
    ">
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search..."
        className="px-3 py-1 rounded text-black w-full text-xs pr-7"
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
        }}
      />
      {searchText && (
        <button
          type="button"
          aria-label="Очистить поиск"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-400 text-lg cursor-pointer"
          style={{ padding: 0, background: "none", border: "none", lineHeight: 1 }}
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
      {searchText && searchResults.length > 0 && (
        <div className="absolute left-0 top-full mt-1 bg-white border rounded shadow w-full max-h-64 overflow-auto text-black z-50">
          {searchResults.map((item, idx) =>
            item.is_brand ? (
              <div
                key={"brand-" + item.sitename}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 border-b cursor-pointer text-black"
                onMouseDown={() => {
                  setSearchText(item.sitename);
                  setSearchResults([]);
                  onSearch("", [{ label: "Бренд", query: "", brand: item.sitename }], "", item.sitename);
                }}
              >
                <span className="text-sm">{item.sitename} - brand</span>
              </div>
            ) : (
              <div
                key={item.id}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 border-b cursor-pointer"
                onMouseDown={() => {
                  setSearchText(item.sitename);
                  setSearchResults([]);
                  if (searchInputRef.current) searchInputRef.current.blur();
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
          )}
        </div>
      )}
      {searchText && !loading && searchResults.length === 0 && (
        <div className="absolute left-0 top-full mt-1 bg-white border rounded shadow w-full text-black px-3 py-2 italic z-50">
          No results found
        </div>
      )}
    </div>
  );
}
