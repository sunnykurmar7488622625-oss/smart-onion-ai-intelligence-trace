import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/States";

export const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) return <Loader full label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};

export const FarmerOnly = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== "farmer") return <Navigate to="/dashboard" replace />;
  return children;
};
