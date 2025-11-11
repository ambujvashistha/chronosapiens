// src/App.jsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navigation from "./components/Navigation";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import ConnectionsPage from "./pages/ConnectionsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import AdminPanel from "./pages/AdminPanel";
import SettingsPage from "./pages/SettingsPage";
import Loader from "./components/Loader";
import "./App.css";

function App() {
  const location = useLocation();
  const onLanding = location.pathname === "/";
  if (onLanding) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
      </Routes>
    );
  }

  return (
    <>
      <Navigation />
      <main className="main-container">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/connections" element={<ConnectionsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
