import { useState } from "react";
import { useNavigate } from "react-router-dom";

function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL || "";
  return `${base}${path.startsWith("/") ? path : "/" + path}`;
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    try {
      const formData = new FormData();
      formData.append("username", "admin");
      formData.append("password", password);

      const res = await fetch(apiUrl("/token"), {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Неверный пароль");
      const data = await res.json();
      if (!data.access_token) throw new Error("Нет токена в ответе");
      localStorage.setItem("admin_token", data.access_token);
      navigate("/admin/panel");  // <-- вот здесь правильный путь!
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleLogin} style={{ margin: 40, maxWidth: 320 }}>
      <h2>Вход в админку</h2>
      <input
        type="password"
        placeholder="Пароль администратора"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
        style={{ width: "100%", marginBottom: 12 }}
      />
      <button type="submit" style={{ width: "100%" }}>Войти</button>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}
    </form>
  );
}
