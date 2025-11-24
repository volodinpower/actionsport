import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { resetPassword } from "../api";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get("token")) {
      setToken(params.get("token"));
    }
  }, [params]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!token || !password) return;
    setLoading(true);
    setError("");
    setStatus("");
    try {
      await resetPassword(token, password);
      setStatus("Password updated. You can sign in now.");
    } catch (err) {
      setError(err?.message || "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Reset password</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Token
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </label>
          <label>
            New password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="auth-error">{error}</div>}
          {status && <div style={{ color: "#0b874b" }}>{status}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
