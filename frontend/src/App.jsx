import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import RequireAuth from "./auth/RequireAuth";

// General pages
import Home from "./pages/Home";
import Products from "./pages/Products";
import About from "./pages/About";
import Login from "./pages/Login";
import Cart from "./pages/Cart";

// Customer pages
import Checkout from "./pages/Customer/Checkout";
import CustomerMyAccount from "./pages/Customer/MyAccount";
import OrderCompletion from "./pages/Customer/OrderCompletion";

// Producer pages
import ProducerDashboard from "./pages/Producer/ProducerDashboard";
import ProducerMyAccount from "./pages/Producer/ProducerMyAccount";

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* General */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cart" element={<Cart />} />

        {/* Customer */}
        <Route path="/checkout" element={
        <RequireAuth>
          <Checkout />
        </RequireAuth>} />
        <Route path="/my-account" element={<CustomerMyAccount />} />
        <Route path="/order-completion" element={<OrderCompletion />} />

        {/* Producer */}
        <Route path="/producer/dashboard" element={<ProducerDashboard />} />
        <Route path="/producer/myaccount" element={<ProducerMyAccount />} />
      </Routes>

      <Footer />
    </>
  );
}