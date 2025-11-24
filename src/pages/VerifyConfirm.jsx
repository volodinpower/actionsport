import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { confirmEmail } from "../api";

export default function VerifyConfirm() {
  const [params] = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      handleConfirm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleConfirm(e) {
    if (e) e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await confirmEmail(token);
      setMessage("Email verified!");
    } catch (err) {
      setError(err?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Email verification</h2>
        <p className="auth-subtitle">If you followed the link from the email, the token field is already filled in.</p>
        <form onSubmit={handleConfirm} className="auth-form">
          <label>
            Token
            <input value={token} onChange={(e) => setToken(e.target.value)} required />
          </label>
          {error && <div className="auth-error">{error}</div>}
          {message && <div style={{ color: "#0b874b" }}>{message}</div>}
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? "Verifying…" : "Verify"}
          </button>
        </form>
      </div>
    </div>
  );
}
