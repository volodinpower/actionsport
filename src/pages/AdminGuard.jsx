import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import AuthPage from "./Auth";

export default function AdminGuard({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && !user.is_superuser) {
      navigate("/");
    }
  }, [loading, user, navigate]);

  if (loading) return <div style={{ padding: 20 }}>Loading…</div>;

  if (!user) {
    return <AuthPage />;
  }

  if (!user.is_superuser) {
    return null;
  }

  return <>{children}</>;
}
