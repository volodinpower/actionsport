import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children, requireSuperuser = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireSuperuser && !user.is_superuser) {
    return <Navigate to="/" replace />;
  }

  return children;
}
