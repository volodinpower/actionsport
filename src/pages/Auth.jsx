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
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
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
    const passwordConfirm = String(form.get("password_confirm") || "");
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }
    if (mode === "register" && password !== passwordConfirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/");
      } else {
        await register(email, password, passwordConfirm);
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
          <label style={{ position: "relative" }}>
            <span>Password</span>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              className={`auth-eye${showPassword ? " active" : ""}`}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5c-5 0-9 6-9 7s4 7 9 7 9-6 9-7-4-7-9-7z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </label>
          {mode === "register" && (
            <label style={{ position: "relative" }}>
              <span>Confirm password</span>
              <input
                name="password_confirm"
                type={showPasswordConfirm ? "text" : "password"}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                className={`auth-eye${showPasswordConfirm ? " active" : ""}`}
                onClick={() => setShowPasswordConfirm((v) => !v)}
                aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5c-5 0-9 6-9 7s4 7 9 7 9-6 9-7-4-7-9-7z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </label>
          )}
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
