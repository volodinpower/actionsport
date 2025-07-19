import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "./ProductCard";
import "./SearchBar.css";

export default function SearchBar({
  onSearch,
  autoFocus = false,
  onClose,
  fullWidth = true,
}) {
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
          const res = await fetch(
            `${API_URL}/products?search=${encodeURIComponent(query)}&limit=30`
          );
          const data = await res.json();
          setSearchResults(Array.isArray(data) ? data : []);
        } catch {
          setSearchResults([]);
        }
        setLoading(false);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchText, API_URL]);

  const handleSearch = () => {
    const trimmed = searchText.trim();
    if (trimmed) {
      onSearch(trimmed, [
        { label: "Main", query: "", exclude: "" },
        { label: `Search: ${trimmed}`, query: trimmed, exclude: "" },
      ]);
      setSearchResults([]);
      if (onClose) onClose();
      if (searchInputRef.current) searchInputRef.current.blur();
    }
  };

  const handleClear = () => {
    setSearchText("");
    setSearchResults([]);
    onSearch("");
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleBrandSelect = (sitename) => {
    setSearchText(sitename);
    setSearchResults([]);
    onSearch(sitename, [{ label: "Main", query: sitename, exclude: "" }]);
    if (onClose) onClose();
    if (searchInputRef.current) searchInputRef.current.blur();
  };

  const handleProductSelect = (item) => {
    setSearchText(item.sitename);
    setSearchResults([]);
    if (searchInputRef.current) searchInputRef.current.blur();
    if (onClose) onClose();
    navigate(`/product/${item.id}`);
  };

  const brands = searchResults.filter((r) => r.is_brand);
  const products = searchResults.filter((r) => !r.is_brand);

  const hasResults = products.length > 0 || brands.length > 0;

  return (
    <div className={`searchbar-modal-outer${fullWidth ? " searchbar-modal-outer-full" : ""}`}>
      <div className={`searchbar-modal-inner${hasResults ? " full-height" : ""}`}>
        {/* Input + clear + close */}
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
              style={{ paddingRight: searchText ? 64 : 16 }}
            />
            {searchText && (
              <button
                type="button"
                aria-label="Clear search"
                className="search-clear-btn"
                onClick={handleClear}
              >
                clear
              </button>
            )}
          </div>
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
          <div className={`search-results-list${hasResults ? " expanded" : ""}`}>
            {loading ? (
              <div className="search-loading">Search...</div>
            ) : (
              <>
                {/* Brands */}
                {brands.length > 0 && (
                  <div className="search-brands-block">
                    {brands.map((brand) => (
                      <div
                        key={"brand-" + brand.sitename}
                        className="search-result-item brand"
                        onClick={() => handleBrandSelect(brand.sitename)}
                      >
                        <span>{brand.sitename} - brand</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Results header */}
                <div className="search-results-header" style={{ padding: "10px 0", fontWeight: "600" }}>
                  Search result{products.length !== 1 ? "s" : ""}: {products.length} item{products.length !== 1 ? "s" : ""}
                </div>

                {/* Product cards - главная сетка, как на Home */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 py-2">
                  {products.length > 0 ? (
                    products.map((item) => (
                      <ProductCard
                        key={item.id}
                        product={item}
                        onClick={() => handleProductSelect(item)}
                      />
                    ))
                  ) : (
                    <div className="search-no-results">No results</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
