import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("admin_token");
  if (!token) {
    // Нет токена — редирект на логин
    return <Navigate to="/admin" replace />;
  }
  return children;
}
