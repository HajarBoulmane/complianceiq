import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import Analyze from "./pages/Analyze";
import Ask from "./pages/Ask";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
     <Route path="/ask" element={<ProtectedRoute><Ask /></ProtectedRoute>} />
    <Route path="/analyze" element={<ProtectedRoute><Analyze /></ProtectedRoute>} />
    </Routes>
  );
}