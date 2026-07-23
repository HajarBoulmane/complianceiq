// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/authContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Chargement...</p>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}