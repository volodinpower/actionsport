import React, { useState } from "react";
import { forgotPassword } from "../api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    setStatus("");
    try {
      await forgotPassword(email);
      setStatus("Reset link sent. Please check your inbox.");
    } catch (err) {
      setError(err?.message || "Could not send email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Forgot password?</h2>
        <p className="auth-subtitle">Enter your email and we will send you a reset link.</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <div className="auth-error">{error}</div>}
          {status && <div style={{ color: "#0b874b" }}>{status}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Sending…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
