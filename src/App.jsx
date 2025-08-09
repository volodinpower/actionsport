// src/App.jsx (или .tsx)
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import BrandsPage from "./pages/Brands";

import AdminGuard from "./pages/AdminGuard";
import AdminPanel from "./admin/AdminPanel"; // <-- проверь путь!

import "./index.css";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Страница логина/гард */}
          <Route path="/admin" element={<AdminGuard />} />
          {/* Панель: та же защита, но с children */}
          <Route
            path="/admin/panel"
            element={
              <AdminGuard>
                <AdminPanel />
              </AdminGuard>
            }
          />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/brands" element={<BrandsPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
