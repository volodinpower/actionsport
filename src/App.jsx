// src/App.jsx (или .tsx)
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import BrandsPage from "./pages/Brands";
import FavoritesPage from "./pages/Favorites";

import AdminGuard from "./pages/AdminGuard";
import AdminPanel from "./components/AdminPanel"; // <-- проверь путь!
import RealAdminTabs from "./pages/RealAdminTabs";
import AuthPage from "./pages/Auth";
import VerifyRequest from "./pages/VerifyRequest";
import VerifyConfirm from "./pages/VerifyConfirm";
import ForgotPasswordPage from "./pages/ForgotPassword";
import ResetPasswordPage from "./pages/ResetPassword";
import AccountPage from "./pages/Account";
import { AuthProvider } from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";

import "./index.css";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            {/* Страница логина/гард */}
            <Route
              path="/admin"
              element={
                <AdminGuard>
                  <RealAdminTabs />
                </AdminGuard>
              } />
            {/* Панель: та же защита, но с children */}
            <Route
              path="/admin/panel"
              element={
                <AdminGuard>
                  <RealAdminTabs />
                </AdminGuard>
              }
            />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/brands" element={<BrandsPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/favorites"
              element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              }
            />
            <Route path="/verify/request" element={<VerifyRequest />} />
            <Route path="/verify" element={<VerifyConfirm />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}
