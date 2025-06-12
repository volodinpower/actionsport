import { useState } from "react";
import { useNavigate } from "react-router-dom";

// Исправь путь если у тебя apiUrl в другом месте
function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}

export default function AdminLogin() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    try {
      // отправляем form-data, как требует FastAPI
      const formData = new FormData();
      formData.append("username", "admin"); // или поле, если нужен логин, или просто "admin"
      formData.append("password", input);

      const res = await fetch(apiUrl("/token"), {
        method: "POST",
        body: formData
      });
      if (!res.ok) throw new Error("Неверный пароль");
      const data = await res.json();
      if (!data.access_token) throw new Error("Нет токена в ответе");
      localStorage.setItem("admin_token", data.access_token);
      navigate("/admin/panel"); // или куда у тебя главная админка
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleLogin}>
      <input
        type="password"
        placeholder="Пароль администратора"
        value={input}
        onChange={e => setInput(e.target.value)}
        required
        autoFocus
      />
      <button type="submit">Войти</button>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </form>
  );
}
