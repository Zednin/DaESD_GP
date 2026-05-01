import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import CustomerMyAccount from "./Customer/MyAccount";


// Ensures that customers and producers access their relevant account settings pages
export default function CustomerAccountRedirect() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.account_type === "producer") {
    return <Navigate to="/producer/myaccount" replace />;
  }

  if (user.account_type === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <CustomerMyAccount />;
}