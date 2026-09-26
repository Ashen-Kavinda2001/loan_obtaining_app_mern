import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import './App.css';

import Sidebar        from './components/Sidebar';
import Topbar         from './components/Topbar';
import Dashboard      from './pages/Dashboard';
import MemberList     from './pages/MemberList';
import RegisterMember from './pages/RegisterMember';
import GrantLoan      from './pages/GrantLoan';
import LoanDetails    from './pages/LoanDetails';
import Login          from './pages/Login';
import AccountSettings from './pages/AccountSettings';

function AppShell({ onLogout, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onLogout={onLogout}
        user={user}
      />

      <div className="main-content">
        <Topbar onMenuToggle={toggleSidebar} user={user} />
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/members"    element={<MemberList />} />
          <Route path="/register"   element={<RegisterMember />} />
          <Route path="/grant-loan" element={<GrantLoan />} />
          <Route path="/loans"      element={<LoanDetails />} />
          <Route path="/settings"   element={<AccountSettings />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

import client from './api/client';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return Boolean(localStorage.getItem('fgi_token') && localStorage.getItem('fgi_user'));
  });
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('fgi_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [checkingAuth, setCheckingAuth] = useState(() => {
    // If we already have a saved session, we don't block the UI with full-screen spinner
    return !localStorage.getItem('fgi_token');
  });

  // Verify session in background on app load
  useEffect(() => {
    client
      .get('/auth/me')
      .then((res) => {
        setIsLoggedIn(true);
        setUser(res.data);
        localStorage.setItem('fgi_user', JSON.stringify(res.data));
      })
      .catch((err) => {
        // Only log out if backend explicitly rejected with 401 Unauthorized
        if (err.response?.status === 401) {
          localStorage.removeItem('fgi_token');
          localStorage.removeItem('fgi_user');
          setIsLoggedIn(false);
          setUser(null);
        }
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  // ── Mobile/Tablet socket reconnect on tab resume ──────────────
  // When a tablet comes back from sleep/another app, the previous TCP socket
  // may be dead (LiteSpeed or mobile radio killed it). Hit /ping immediately
  // so the browser opens a fresh connection before the user clicks anything.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && localStorage.getItem('fgi_token')) {
        client.get('/ping').catch((err) => {
          // If session expired while app was in background, force re-login
          if (err.response?.status === 401) {
            localStorage.removeItem('fgi_token');
            localStorage.removeItem('fgi_user');
            setIsLoggedIn(false);
            setUser(null);
          }
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleLogin = (userData) => {
    setIsLoggedIn(true);
    if (userData) {
      if (userData.token) {
        localStorage.setItem('fgi_token', userData.token);
      }
      localStorage.setItem('fgi_user', JSON.stringify(userData));
      setUser(userData);
    }
  };

  const handleLogout = async () => {
    try {
      await client.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('fgi_token');
      localStorage.removeItem('fgi_user');
      setIsLoggedIn(false);
      setUser(null);
    }
  };

  if (checkingAuth) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F172A',
        color: '#94A3B8',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36,
            height: 36,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTopColor: '#38BDF8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 14px'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Securing session…</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {isLoggedIn
        ? <AppShell onLogout={handleLogout} user={user} />
        : <Routes>
            <Route path="*" element={<Login onLogin={handleLogin} />} />
          </Routes>
      }
    </BrowserRouter>
  );
}
