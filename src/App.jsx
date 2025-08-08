// src/App.tsx или src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Home from "./pages/Home";
import ProductDetails from "./pages/ProductDetails";
import BrandsPage from "./pages/Brands";

// ⬇️ добавь этот импорт — путь проверь!
import AdminGuard from "./pages/AdminGuard";

// ⚠️ старые импорты убери, если не используешь:
// import Admin from "./pages/Admin";
import AdminPanel from "./components/AdminPanel";
import ProtectedRoute from "./components/ProtectedRoute";

import "./index.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<AdminGuard />} />
          <Route
            path="/admin/panel"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/brands" element={<BrandsPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
