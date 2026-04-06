// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './utils/auth';
import { ThemeProvider } from './context/ThemeContext';

import Login    from './pages/Login';
import Register from './pages/Register';
import Home     from './pages/Home';
import Dashboard              from './pages/Dashboard';
import ClubRepDashboard       from './pages/ClubRepDashboard';
import VarsityAdminDashboard  from './pages/VarsityAdminDashboard';
import SuperAdminDashboard    from './pages/SuperAdminDashboard';

import Feed     from './pages/Feed';
import Notices  from './pages/Notices';
import Profile  from './pages/Profile';
import Users    from './pages/Users';
import UserFeed from './pages/UserFeed';
import ClubFeed from './pages/ClubFeed';

function PrivateRoute({ children }) {
  const user = getUser();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/"     element={<Home />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/feed"     element={<PrivateRoute><Feed /></PrivateRoute>} />
          <Route path="/notices"  element={<PrivateRoute><Notices /></PrivateRoute>} />
          <Route path="/profile"  element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/users"    element={<PrivateRoute><Users /></PrivateRoute>} />
          <Route path="/users/:userId" element={<PrivateRoute><UserFeed /></PrivateRoute>} />
          <Route path="/dashboard"     element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/club-rep"      element={<PrivateRoute><ClubRepDashboard /></PrivateRoute>} />
          <Route path="/varsity-admin" element={<PrivateRoute><VarsityAdminDashboard /></PrivateRoute>} />
          <Route path="/super-admin"   element={<PrivateRoute><SuperAdminDashboard /></PrivateRoute>} />
          
          <Route path="/club/:clubId" element={<PrivateRoute><ClubFeed /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}