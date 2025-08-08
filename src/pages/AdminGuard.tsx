// src/pages/AdminGuard.tsx
import React, { useEffect, useState } from "react";
import RealAdmin from "./RealAdmin";
import { login, logout, getMe } from "../api";

// Определи тип пользователя под ответ /auth/me
export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

export default function AdminGuard() {
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // Первый пинг, узнаём, залогинен ли пользователь
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const u = await getMe() as unknown as User | null; // getMe из JS — приводим тип
        if (!mounted) return;
        setMe(u);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Не удалось получить профиль");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    setErr("");
    setLoading(true);
    try {
      await login(email, password);      // 204 + Set-Cookie
      const u = await getMe() as unknown as User; // повторно тянем профиль
      setMe(u);
    } catch (e: any) {
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
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Загрузка…</div>;
  }

  // Не залогинен — показываем форму входа (cookie-based)
  if (!me) {
    return (
      <div style={{ maxWidth: 420, margin: "60px auto", padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
        <h2 style={{ marginBottom: 12 }}>Вход в админку</h2>
        <form onSubmit={handleLogin} className="space-y-3">
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: "block", marginBottom: 6 }}>Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              autoFocus
              className="w-full border px-3 py-2 rounded"
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
              className="w-full border px-3 py-2 rounded"
              style={{ width: "100%", border: "1px solid #ccc", borderRadius: 8, padding: "8px 12px" }}
            />
          </div>
          {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded text-white"
            style={{ background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 8 }}
          >
            {loading ? "Входим…" : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  // Залогинен, но прав нет
  if (!me.is_superuser) {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ marginBottom: 12 }}>
          Привет, <b>{me.email}</b>. Доступ к админке есть только у суперпользователей.
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="px-3 py-2 rounded text-white"
          style={{ background: "#111", color: "#fff", padding: "10px 14px", borderRadius: 8 }}
        >
          Выйти
        </button>
      </div>
    );
  }

  // Всё ок — рендерим твою настоящую админку
  return <RealAdmin />;
}
