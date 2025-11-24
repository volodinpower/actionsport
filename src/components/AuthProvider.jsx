import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  getMe,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  fetchFavorites as apiFetchFavorites,
  addFavorite as apiAddFavorite,
  removeFavorite as apiRemoveFavorite,
} from "../api";

const AuthContext = createContext({
  user: null,
  loading: true,
  error: "",
  login: async () => {},
  logout: async () => {},
  register: async () => {},
  refresh: async () => {},
  favorites: [],
  isFavorite: () => false,
  addFavorite: async () => {},
  removeFavorite: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favorites, setFavorites] = useState([]);

  const normalizeFavoriteKey = useCallback((name = "", color = "") => {
    return `${String(name).trim().toLowerCase()}|${String(color).trim().toLowerCase()}`;
  }, []);

  const loadFavorites = useCallback(
    async (currentUser) => {
      if (!currentUser) {
        setFavorites([]);
        return;
      }
      try {
        const list = await apiFetchFavorites();
        setFavorites(Array.isArray(list) ? list : []);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("Failed to load favorites", err);
        setFavorites([]);
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const me = await getMe();
      setUser(me);
      setError("");
      await loadFavorites(me);
    } catch (err) {
      setUser(null);
      setError(err?.message || "Не удалось получить профиль");
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [loadFavorites]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      try {
        await apiLogin(email, password);
        await refresh();
      } catch (err) {
        setError(err?.message || "Ошибка входа");
        throw err;
      }
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
      setFavorites([]);
    }
  }, []);

  const register = useCallback(
    async (email, password) => {
      try {
        await apiRegister(email, password);
        await apiLogin(email, password);
        await refresh();
      } catch (err) {
        setError(err?.message || "Ошибка регистрации");
        throw err;
      }
    },
    [refresh],
  );

  const isFavorite = useCallback(
    (name, color) => {
      const key = normalizeFavoriteKey(name, color);
      return favorites.some(
        (fav) =>
          !fav._removed &&
          normalizeFavoriteKey(fav.product_name, fav.product_color) === key,
      );
    },
    [favorites, normalizeFavoriteKey],
  );

  const addFavorite = useCallback(
    async (product) => {
      if (!product?.id) return;
      const result = await apiAddFavorite(product.id);
      setFavorites((prev) => {
        const key = normalizeFavoriteKey(result.product_name, result.product_color);
        const filtered = prev.filter(
          (fav) => normalizeFavoriteKey(fav.product_name, fav.product_color) !== key,
        );
        return [{ ...result, _removed: false }, ...filtered];
      });
    },
    [normalizeFavoriteKey],
  );

  const removeFavorite = useCallback(
    async (product) => {
      if (!product?.id) return;
      const response = await apiRemoveFavorite(product.id);
      const key = normalizeFavoriteKey(response.product_name || product.name, response.product_color || product.color);
      setFavorites((prev) =>
        prev.map((fav) =>
          normalizeFavoriteKey(fav.product_name, fav.product_color) === key
            ? { ...fav, _removed: true }
            : fav,
        ),
      );
    },
    [normalizeFavoriteKey],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      login,
      logout,
      register,
      refresh,
      favorites,
      isFavorite,
      addFavorite,
      removeFavorite,
    }),
    [user, loading, error, login, logout, register, refresh, favorites, isFavorite, addFavorite, removeFavorite],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
