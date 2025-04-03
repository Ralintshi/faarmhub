import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext"; // Import AuthProvider
import HomePage from "./components/HomePage";
import Dashboard from "./components/Dashboard";
import CropCalendar from "./components/CropCalendar";
import Register from "./components/Register";
import Login from "./components/Login";
import Forum from "./components/Forum";
import MarketUpdate from "./components/MarketUpdate";
import ExplorePage from "./components/ExplorePage";
import ProtectedRoute from "./ProtectedRoute"; // Import Protected Route
import Settings, { SettingsProvider } from './components/Settings';
import Logout from "./components/Logout";

const App = () => {
  return (
    <SettingsProvider>
          <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/explore" element={<ExplorePage />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/crop-calendar" element={<ProtectedRoute><CropCalendar /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
          <Route path="/marketUpdate" element={<ProtectedRoute><MarketUpdate /></ProtectedRoute>} />
          <Route path="/logout" element={< Logout/>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </SettingsProvider>

  );
};

export default App;