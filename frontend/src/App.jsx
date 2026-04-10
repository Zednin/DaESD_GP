import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Auth
import RequireAuth from "./auth/RequireAuth";
import RequireProducer from "./auth/RequireProducer";
import RequireAdmin from "./auth/RequireAdmin";
import AuthCallback from "./auth/AuthCallback";

// General pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import SurplusDeals from "./components/Marketplace/SurplusDeals";
import About from "./pages/About";
import Login from "./pages/Login";
import Cart from "./pages/Cart";

// New signup pages
import SignupSelect from "./pages/SignupSelect";
import Signup from "./pages/Signup";

// Customer pages
import Checkout from "./pages/Checkout/Checkout";
import CustomerMyAccount from "./pages/Customer/MyAccount";
import CheckoutSuccess from "./pages/Checkout/CheckoutSuccess";

// Producer pages
import ProducerDashboard from "./pages/Producer/ProducerDashboard";
import ProducerMyAccount from "./pages/Producer/ProducerMyAccount";

// Admin pages
import AdminDashboard from "./pages/Admin/AdminDashboard";

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* General */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/surplus-deals" element={<SurplusDeals />} />
        <Route path="/about" element={<About />} />
        

        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<Cart />} />

        {/* Signup flow */}
        <Route path="/signup/select" element={<SignupSelect />} />
        <Route path="/signup/:accountType" element={<Signup />} />

        {/* Auth */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Customer */}
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <Checkout />
            </RequireAuth>
          }
        />
        <Route
          path="/my-account"
          element={
            <RequireAuth>
              <CustomerMyAccount />
            </RequireAuth>
          }
        />
        <Route path="/checkout/success" element={<CheckoutSuccess />} />

        {/* Producer */}
        <Route
          path="/producer/dashboard"
          element={
            <RequireProducer>
              <ProducerDashboard />
            </RequireProducer>
          }
        />
        <Route
          path="/producer/myaccount"
          element={
            <RequireProducer>
              <ProducerMyAccount />
            </RequireProducer>
          }
        />
        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          }
        />
      </Routes>

      <Footer />
    </>
  );
}