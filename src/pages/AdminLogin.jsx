import React, { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { login, getMe } from "../api";

export default function AdminLogin() {
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = (loc.state && loc.state.from) || "/admin";
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // если уже залогинен — сразу на /admin
  // (страховка, в основном гард это делает)
  const [me, setMe] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    setErr("");
    setLoading(true);
    try {
      await login(email, password); // server sets cookie
      const u = await getMe();
      setMe(u);
      nav(redirectTo, { replace: true });
    } catch (e2) {
      setErr(e2?.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  }

  if (me) return <Navigate to="/admin" replace />;

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 20, border: "1px solid #ddd", borderRadius: 12 }}>
      <h2 style={{ marginBottom: 12 }}>Вход в админку</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>Email</label>
          <input name="email" type="email" required className="w-full border px-3 py-2 rounded" />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Пароль</label>
          <input name="password" type="password" required className="w-full border px-3 py-2 rounded" />
        </div>
        {err && <div style={{ color: "crimson", marginBottom: 10 }}>{err}</div>}
        <button disabled={loading} className="px-4 py-2 rounded text-white" style={{ background:"#111" }}>
          {loading ? "Вхожу..." : "Войти"}
        </button>
      </form>
    </div>
  );
}
