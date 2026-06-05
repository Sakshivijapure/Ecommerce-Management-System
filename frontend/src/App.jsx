import React, { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import Signup from "./pages/Signup";
import ProductListingPage from "./pages/ProductListingPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import WishlistPage from "./pages/WishlistPage";
import SellerDashboard from "./pages/SellerDashboard";
import SellerProducts from "./pages/SellerProducts";
import SellerOrdersPage from "./pages/SellerOrdersPage";
import SellerReturnsPage from "./pages/SellerReturnsPage";
import SellerReviewsPage from "./pages/SellerReviewsPage";
import AdminDashboard from "./pages/AdminDashboard";

function App() {

  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem("user")) || null;
  });

  const role = user?.role?.trim()?.toLowerCase();
  const isAdmin = role === "admin";
  const isSeller = role === "seller";
  const isCustomer = role && role !== "seller" && role !== "admin";

  return (
    <BrowserRouter>
      <Routes>

        {/* ADMIN DASHBOARD */}
        <Route
          path="/admin"
          element={
            isAdmin ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* HOME */}
        <Route
          path="/"
          element={
            user ? (
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : isSeller ? (
                <Navigate to="/seller-dashboard" replace />
              ) : (
                <Navigate to="/products" replace />
              )
            ) : (
              <HomePage />
            )
          }
        />

        {/* LOGIN */}
        <Route
          path="/login"
          element={
            user ? (
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : isSeller ? (
                <Navigate to="/seller-dashboard" replace />
              ) : (
                <Navigate to="/products" replace />
              )
            ) : (
              <LoginPage setUser={setUser} />
            )
          }
        />

        {/* SIGNUP */}
        <Route path="/signup" element={<Signup />} />

        {/* CUSTOMER ROUTES */}
        <Route
          path="/products"
          element={
            isCustomer ? (
              <ProductListingPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/product/:id"
          element={
            isCustomer ? (
              <ProductDetailsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/cart"
          element={
            isCustomer ? (
              <CartPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/checkout"
          element={
            isCustomer ? (
              <CheckoutPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/orders"
          element={
            isCustomer ? (
              <OrdersPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/wishlist"
          element={
            isCustomer ? (
              <WishlistPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* SELLER ROUTES */}
        <Route
          path="/seller-dashboard"
          element={
            isSeller ? (
              <SellerDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/seller-products"
          element={
            isSeller ? (
              <SellerProducts />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/seller-orders"
          element={
            isSeller ? (
              <SellerOrdersPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/seller-Returns"
          element={
            isSeller ? (
              <SellerReturnsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route
          path="/seller-reviews"
          element={
            isSeller ? (
              <SellerReviewsPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;