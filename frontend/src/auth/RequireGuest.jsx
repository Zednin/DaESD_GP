import {Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";


export default function RequireGuest({ children }) {
  const { user, loading } = useAuth();
    if (loading) return null;
    if (user) {
        return <Navigate to="/" replace />;
    }
    return children;
}