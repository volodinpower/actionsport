// src/pages/AdminGuard.jsx
import React, { useEffect, useState } from "react";
import RealAdmin from "./RealAdmin";          // проверь путь, если файл в другом месте
import { login, logout, getMe } from "../api"; // из твоего api.js

export default function AdminGuard() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const u = await getMe(); // null если не залогинен, объект пользователя если залогинен
        if (!ctrl.signal.aborted) setMe(u);
      } catch (e) {
        if (!ctrl.signal.aborted) setErr(e?.message || String(e));
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    setErr("");
    setLoading(true);
    try {
      await login(email, password); // 204 + Set-Cookie
      const u = await getMe();
      setMe(u);
    } catch (e) {
      setErr(e?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await logout();
      setMe(null);
    } catch {}
    setLoading(false);
  }

  if (loading) return <div style={{ padding: 20 }}>Загрузка…</div>;

  // форма входа, если не залогинен
  if (!me) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
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
              style={{ width: "100%", border: "1px solid #ccc", borderRadius: 8, padding: "8px 12px" }}
            />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Пароль</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={{ width: "100%", border: "1px solid #ccc", borderRadius: 8, padding: "8px 12px" }}
            />
          </div>
          {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
          <button
            type="submit"
            disabled={loading}
            style={{ background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 8 }}
          >
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  // залогинен, но не суперпользователь
  if (!me.is_superuser) {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ marginBottom: 12 }}>
          Привет, <b>{me.email}</b>. Доступ к админке есть только у суперпользователей.
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          style={{ background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 8 }}
        >
          Выйти
        </button>
      </div>
    );
  }

  // всё ок — показываем реальную админку
  return <RealAdmin />;
}
