import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { useToast } from "../components/ToastProvider";

export default function AuthPage() {
  const { user, login, register, logout } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const toggleMode = () => {
    setError("");
    setMode((prev) => (prev === "login" ? "register" : "login"));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/");
      } else {
        await register(email, password);
        showToast("Account registered", 3500);
        navigate("/");
      }
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (user) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h2>Hello, {user.email}</h2>
          <p>You are already signed in.</p>
          <div className="auth-actions">
            <Link to="/" className="auth-link-button">Go to home</Link>
            <button className="auth-button" onClick={logout}>Log out</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <a href="/" style={{ display: "inline-flex", justifyContent: "center" }}>
            <img src="/logo.png" alt="ActionSport" style={{ height: 48, objectFit: "contain" }} />
          </a>
        </div>
        <h2>{mode === "login" ? "Sign in" : "Sign up"}</h2>
        <p className="auth-subtitle">
          {mode === "login" ? "Access your account" : "Create a new account"}
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input name="email" type="email" required autoComplete="username" />
          </label>
          <label>
            Password
            <input name="password" type="password" required autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </label>
          {error && <div className="auth-error">{error}</div>}
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? "…" : mode === "login" ? "Sign in" : "Register"}
        </button>
        </form>
        <div className="auth-links">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <button className="auth-switch" onClick={toggleMode}>
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
