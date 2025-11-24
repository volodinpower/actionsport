import { useRef, useState, useEffect } from "react";
import NavMenu from "./NavMenu";
import SearchBar from "./SearchBar";
import { useAuth } from "./AuthProvider";
import "./Header.css";

export default function Header({
  onSearch,
  onMenuCategoryClick,
  breadcrumbs,
  isHome,
  setCategoryFilter,
  setForceOpenCategory,
  navigate,
}) {
  const { user, loading, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [showSearch, setShowSearch] = useState(false);
  const [desktopUserMenuOpen, setDesktopUserMenuOpen] = useState(false);
  const [mobileUserMenuOpen, setMobileUserMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navBarRef = useRef();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const runSearch = (
    query = "",
    crumbs = [{ label: "Main", query: query, exclude: "" }],
    exclude = "",
    brand = "",
    category = "",
    subcategory = "",
    gender = "",
    size = ""
  ) => {
    if (onSearch)
      onSearch(query, crumbs, exclude, brand, category, subcategory, gender, size);
    if (navigate) {
      if (query) {
        navigate(`/?search=${encodeURIComponent(query)}`);
      } else {
        navigate(`/`);
      }
    }
  };

  if (isMobile) {
    return (
      <header className="main-header">
        <div className="nav-bar">
          <button
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
            className="burger-btn"
          >
            &#9776;
          </button>
        <div className="mobile-logo-center">
          <a href="/">
            <img src="/logo.png" alt="Logo" className="logo-mobile" />
          </a>
        </div>
        {user ? (
          <div className={`user-menu mobile-user-menu${mobileUserMenuOpen ? " open" : ""}`}>
            <button
              className="user-menu-trigger"
              aria-haspopup="true"
              onClick={() => setMobileUserMenuOpen((prev) => !prev)}
            >
              <span className="user-trigger-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Z" />
                  <path d="M5 21v-1a6.99 6.99 0 0 1 7-7 6.99 6.99 0 0 1 7 7v1" />
                </svg>
              </span>
              <span className="user-trigger-arrow" aria-hidden="true">▾</span>
            </button>
            <div className="user-menu-dropdown" style={{ display: mobileUserMenuOpen ? "block" : "none" }}>
              <div className="user-menu-panel">
                <div className="user-menu-header">
                  <div className="user-menu-name">{[user.name, user.surname].filter(Boolean).join(" ") || user.email}</div>
                  <div className="user-menu-email">{user.email}</div>
                </div>
                <a onClick={() => setMobileUserMenuOpen(false)} href="/account" className="user-menu-link">Account</a>
                <a onClick={() => setMobileUserMenuOpen(false)} href="/favorites" className="user-menu-link">Favorites</a>
                <button type="button" className="user-menu-link logout-link" onClick={() => setShowLogoutConfirm(true)}>Log out</button>
              </div>
            </div>
          </div>
        ) : (
          <a className="auth-link-mobile" href="/auth">Sign in</a>
        )}
          <button
            className="search-btn search-btn-mobile"
            aria-label="Toggle search"
            onClick={() => setShowSearch((prev) => !prev)}
          >
            <svg width="24" height="24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2" />
              <line
                x1="16"
                y1="16"
                x2="22"
                y2="22"
                stroke="#fff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        {mobileMenuOpen && (
          <NavMenu
            onMainCategorySelect={onMenuCategoryClick}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
        )}
        {showSearch && (
          <div className="search-flyout search-flyout-mobile">
            <SearchBar
              onSearch={runSearch}
              autoFocus
              onClose={() => setShowSearch(false)}
              fullWidth={true}
            />
          </div>
        )}
        {showLogoutConfirm && (
          <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
            <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
              <h3 style={{ marginBottom: 12 }}>Sign out?</h3>
              <p style={{ color: "#555", marginBottom: 20 }}>Do you really want to log out of your account?</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  className="auth-link-button"
                  onClick={() => setShowLogoutConfirm(false)}
                  style={{ minWidth: 120 }}
                >
                  Cancel
                </button>
                <button
                  className="auth-button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  style={{ minWidth: 120 }}
                >
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    );
  }

  // --- Desktop ---
  return (
    <header className="main-header">
      <div className="logo-bar">
        <div className="logo-bar-inner">
          <a href="/">
            <img src="/logo.png" alt="Logo" className="logo-desktop" />
          </a>
        </div>
      </div>
      <div className="nav-bar" ref={navBarRef} style={{ position: "relative" }}>
        <div className="nav-menu-wrap">
          <NavMenu
            navBarRef={navBarRef} // keep ref for positioning
            onMainCategorySelect={onMenuCategoryClick}
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
          />
        </div>
        <div className="search-desktop-spacer"></div>
        {!user && (
          <a className="auth-link-desktop" href="/auth">
            Sign in
          </a>
        )}
        {user && (
          <div
            className={`user-menu${!isMobile && desktopUserMenuOpen ? " open" : ""}`}
            onMouseEnter={() => !isMobile && setDesktopUserMenuOpen(true)}
            onMouseLeave={() => !isMobile && setDesktopUserMenuOpen(false)}
          >
            <button className="user-menu-trigger" aria-haspopup="true">
              <span className="user-trigger-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Z" />
                  <path d="M5 21v-1a6.99 6.99 0 0 1 7-7 6.99 6.99 0 0 1 7 7v1" />
                </svg>
              </span>
              <span className="user-trigger-arrow" aria-hidden="true">▾</span>
            </button>
            <div className="user-menu-dropdown">
              <div className="user-menu-panel">
                <div className="user-menu-header">
                  <div className="user-menu-name">{[user.name, user.surname].filter(Boolean).join(" ") || user.email}</div>
                  <div className="user-menu-email">{user.email}</div>
                </div>
                <a href="/account" className="user-menu-link">
                  Account
                </a>
                <a href="/account/orders" className="user-menu-link user-menu-link-disabled">
                  Orders (coming soon)
                </a>
                <a href="/favorites" className="user-menu-link">
                  Favorites
                </a>
                <button type="button" className="user-menu-link logout-link" onClick={() => setShowLogoutConfirm(true)}>
                  Log out
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          className="search-btn search-btn-desktop"
          aria-label="Toggle search"
          onClick={() => setShowSearch((prev) => !prev)}
        >
          <svg width="24" height="24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2" />
            <line
              x1="16"
              y1="16"
              x2="22"
              y2="22"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {showSearch && (
          <div className="search-flyout searchbar-modal-outer-full">
            <SearchBar
              onSearch={runSearch}
              autoFocus
              onClose={() => setShowSearch(false)}
              fullWidth={true}
            />
          </div>
        )}
      </div>
      {showLogoutConfirm && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 12, maxWidth: 360, width: "90%", textAlign: "center", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
            <h3 style={{ marginBottom: 12 }}>Sign out?</h3>
            <p style={{ color: "#555", marginBottom: 20 }}>Do you really want to log out of your account?</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                className="auth-link-button"
                onClick={() => setShowLogoutConfirm(false)}
                style={{ minWidth: 120 }}
              >
                Cancel
              </button>
              <button
                className="auth-button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                style={{ minWidth: 120 }}
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
