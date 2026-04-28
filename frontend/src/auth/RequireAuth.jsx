import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  // role based redirect
  if (user.account_type === "producer") {
    return <Navigate to="/producer/myaccount" replace />;
  }

  if (user.account_type === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
}