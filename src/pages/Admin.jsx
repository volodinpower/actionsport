import React, { useState, useEffect } from "react";
import AdminPanel from "../components/AdminPanel"; // поправь путь при необходимости

// Вспомогательная функция формирования полного URL для API
function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}

export default function Admin() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  // Проверка токена при открытии страницы
  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) return;
    fetch(apiUrl("/admin/check_token"), {
      headers: { Authorization: "Bearer " + token }
    })
      .then((res) => {
        if (res.ok) setOk(true);
        else {
          localStorage.removeItem("admin_token");
          setOk(false);
        }
      })
      .catch(() => {
        localStorage.removeItem("admin_token");
        setOk(false);
      });
  }, []);

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("username", "admin");
      formData.append("password", input);

      const res = await fetch(apiUrl("/token"), {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        setError("Неверный пароль");
        setLoading(false);
        return;
      }
      const data = await res.json();
      localStorage.setItem("admin_token", data.access_token);
      setOk(true);
    } catch (e) {
      setError("Ошибка входа");
    }
    setLoading(false);
  }

  if (!ok) {
    return (
      <div style={{ padding: 50, textAlign: "center" }}>
        <h2>Вход в админку</h2>
        <input
          type="password"
          value={input}
          placeholder="Введите пароль"
          disabled={loading}
          onChange={e => setInput(e.target.value)}
          style={{ fontSize: 18, padding: 8, width: 220 }}
          onKeyDown={e => {
            if (e.key === "Enter") handleLogin();
          }}
        />
        <button
          onClick={handleLogin}
          style={{ marginLeft: 12, padding: "8px 18px", fontSize: 18 }}
          disabled={loading}
        >
          Войти
        </button>
        {error && (
          <div style={{ color: "red", marginTop: 8 }}>{error}</div>
        )}
      </div>
    );
  }

  // При успешном входе показываем админ-панель с табами
  return <AdminPanel />;
}
