// src/pages/AdminGuard.jsx
import React, { useEffect, useState } from "react";
import RealAdmin from "./RealAdmin";             // проверь путь, если файл в другом месте
import { login, logout, getMe } from "../api";   // функции из твоего api.js

export default function AdminGuard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [lastPing, setLastPing] = useState({ ok: false, status: 0, url: "", when: null });

  // --- Мини-панель диагностики (показывается только в dev) ---
  const Debug = () => {
    if (!import.meta.env.DEV) return null;
    return (
      <div style={{
        fontSize: 12, color: "#555", padding: "10px 12px",
        border: "1px dashed #bbb", borderRadius: 10, margin: "0 0 16px 0"
      }}>
        <div><b>API:</b> {import.meta.env.VITE_API_URL || "(не задан)"}</div>
        <div><b>Последний /auth/me:</b> {lastPing.status} {lastPing.ok ? "OK" : "Unauthorized"} ({lastPing.when || "-"})</div>
        <div>
          Открой DevTools → Network и проверь, что запросы идут на <code>api.actionsport.pro</code>,<br />
          а в ответе логина есть <code>Set-Cookie</code> с <code>Domain=.actionsport.pro; SameSite=None; Secure; HttpOnly</code>.
        </div>
      </div>
    );
  };

  // 1) Первый пинг: пробуем восстановить сессию из куки
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const u = await getMe(); // вернёт null при 401
        if (!cancelled) {
          setMe(u);
          setLastPing({
            ok: !!u,
            status: u ? 200 : 401,
            url: import.meta.env.VITE_API_URL,
            when: new Date().toLocaleTimeString(),
          });
        }
        if (import.meta.env.DEV) {
          // лёгкий лог в консоль
          // eslint-disable-next-line no-console
          console.log("[AdminGuard] VITE_API_URL =", import.meta.env.VITE_API_URL, "getMe() ->", u);
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // 2) Вход
  async function handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    setErr("");
    setLoading(true);
    try {
      await login(email, password); // /auth/jwt/login -> 204 + Set-Cookie
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log("[AdminGuard] login() done, trying getMe()…");
      }
      const u = await getMe();
      setMe(u);
      setLastPing({
        ok: !!u,
        status: u ? 200 : 401,
        url: import.meta.env.VITE_API_URL,
        when: new Date().toLocaleTimeString(),
      });
      if (!u) {
        throw new Error("Не удалось получить профиль после входа");
      }
    } catch (e) {
      setErr(e?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  // 3) Выход
  async function handleLogout() {
    setLoading(true);
    try {
      await logout(); // /auth/jwt/logout
      setMe(null);
      setLastPing({
        ok: false,
        status: 401,
        url: import.meta.env.VITE_API_URL,
        when: new Date().toLocaleTimeString(),
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, textAlign: "center" }}>Загрузка…</div>;
  }

  // --- Не залогинен — форма входа ---
  if (!me) {
    return (
      <div style={{ maxWidth: 460, margin: "60px auto", padding: 20, border: "1px solid #e5e5e5", borderRadius: 14 }}>
        <Debug />
        <h2 style={{ marginBottom: 12 }}>Вход в админку</h2>
        <form onSubmit={handleLogin} autoComplete="on">
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              autoFocus
              style={{ width: "100%", border: "1px solid #ccc", borderRadius: 10, padding: "10px 12px" }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Пароль</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{ width: "100%", border: "1px solid #ccc", borderRadius: 10, padding: "10px 12px" }}
            />
          </div>
          {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
          >
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  // --- Залогинен, но не суперюзер ---
  if (!me.is_superuser) {
    return (
      <div style={{ maxWidth: 540, margin: "60px auto", padding: 20, border: "1px solid #e5e5e5", borderRadius: 14 }}>
        <Debug />
        <div style={{ marginBottom: 12 }}>
          Привет, <b>{me.email}</b>. Доступ к админке есть только у суперпользователей.
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          style={{ background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 10, cursor: "pointer" }}
        >
          Выйти
        </button>
      </div>
    );
  }

  // --- Всё ок — показываем админку ---
  return (
    <div>
      <Debug />
      <RealAdmin onLogout={handleLogout} />
    </div>
  );
}
