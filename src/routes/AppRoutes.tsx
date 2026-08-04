import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import SystemHealth from "../pages/SystemHealth";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../layouts/AppLayout";
import Users from "../pages/Users";
import Categories from "../pages/Categories";
import Items from "../pages/Items";
import Rentals from "../pages/Rentals";
import Returns from "../pages/Returns";
import Payments from "../pages/Payments";
import Reports from "../pages/Reports";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/health" element={<SystemHealth />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/items" element={<Items />} />
            <Route path="/rentals" element={<Rentals />} />
            <Route path="/returns" element={<Returns />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            {/* Future protected pages: /properties, /tenants */}
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
