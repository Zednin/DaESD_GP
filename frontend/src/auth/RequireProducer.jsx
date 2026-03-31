import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireProducer({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  console.log("RequireProducer user:", user);

  if (loading) return null;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (user.account_type !== "producer") {
    return <Navigate to="/" replace />;
  }

  return children;
}