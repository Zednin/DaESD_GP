import { useEffect, useState } from "react";
import { Navigate, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import TermsModal from "./components/Legal/TermsModal";

// Auth
import RequireAuth from "./auth/RequireAuth";
import RequireProducer from "./auth/RequireProducer";
import RequireAdmin from "./auth/RequireAdmin";
import AuthCallback from "./auth/AuthCallback";
import CustomerAccountRedirect from "./pages/CustomerAccountRedirect";
import RequireGuest from "./auth/RequireGuest";

// General pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import ProducerDetail from "./pages/ProducerDetail";
import SurplusDeals from "./components/Marketplace/SurplusDeals";
import About from "./pages/About";
import Login from "./pages/Login";
import Cart from "./pages/Cart";
import FAQ from "./components/Legal/FAQ";

// Signup pages
import SignupSelect from "./pages/SignupSelect";
import Signup from "./pages/Signup";

// Customer pages
import Checkout from "./pages/Checkout/Checkout";
import CheckoutSuccess from "./pages/Checkout/CheckoutSuccess";

// Producer pages
import ProducerDashboard from "./pages/Producer/ProducerDashboard";
import ProducerMyAccount from "./pages/Producer/ProducerMyAccount";

// Explore pages
import FarmStories from "./components/Marketplace/FarmStories";

// Admin pages
import AdminDashboard from "./pages/Admin/AdminDashboard";
import {
  applyColourblindMode,
  loadColourblindMode,
} from "./utils/accessibilityPreferences";

export default function App() {
  const [termsOpen, setTermsOpen] = useState(false);

  // Cyberpunk Effects ////////////////////
  useEffect(() => {
    function handleMove(e) {
      const x = `${(e.clientX / window.innerWidth) * 100}%`;
      const y = `${(e.clientY / window.innerHeight) * 100}%`;

      document.documentElement.style.setProperty("--cp-x", x);
      document.documentElement.style.setProperty("--cp-y", y);
    }

    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);
  //////////////////////////////////

  useEffect(() => {
    applyColourblindMode(loadColourblindMode());
  }, []);


  return (
    <>
      <Navbar onOpenTerms={() => setTermsOpen(true)} />

      <Routes>
        {/* General */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/producer/:producerId" element={<ProducerDetail />} />
        <Route path="/producers/:producerId" element={<ProducerDetail />} />
        <Route path="/surplus-deals" element={<SurplusDeals />} />
        <Route path="/about" element={<About />} />
        <Route path="/explore" element={<FarmStories />} />
        <Route path="/farm-stories" element={<Navigate to="/explore" replace />} />
        <Route path="/faq" element={<FAQ />} />

        <Route 
          path="/login"
          element={
            <RequireGuest>
              <Login />
            </RequireGuest>
          } 
        />

        <Route path="/cart" element={<Cart />} />

        {/* Signup flow */}
        <Route 
          path="/signup/select" 
          element={
            <RequireGuest>
              <SignupSelect />
            </RequireGuest>
          } 
        />
        <Route 
          path="/signup/:accountType" 
          element={
            <RequireGuest>
              <Signup />
            </RequireGuest>
          } 
        />

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
              <CustomerAccountRedirect />
            </RequireAuth>
          }
        />
        <Route
          path="/checkout/success"
          element={
            <RequireAuth>
              <CheckoutSuccess />
            </RequireAuth>
          }
        />

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

      <Footer onOpenTerms={() => setTermsOpen(true)} />
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}
