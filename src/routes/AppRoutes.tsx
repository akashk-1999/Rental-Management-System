import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import SystemHealth from "../pages/SystemHealth";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/health" element={<SystemHealth />} />
      </Routes>
    </BrowserRouter>
  );
}