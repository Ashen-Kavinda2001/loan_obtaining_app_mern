import { useState } from 'react';
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

function AppShell({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="app-layout">
      {/* Mobile overlay — tap to close sidebar */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={closeSidebar} />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onLogout={onLogout}
      />

      <div className="main-content">
        <Topbar onMenuToggle={toggleSidebar} />
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/members"    element={<MemberList />} />
          <Route path="/register"   element={<RegisterMember />} />
          <Route path="/grant-loan" element={<GrantLoan />} />
          <Route path="/loans"      element={<LoanDetails />} />
          <Route path="*"           element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <BrowserRouter>
      {isLoggedIn
        ? <AppShell onLogout={() => setIsLoggedIn(false)} />
        : <Routes>
            <Route path="*" element={<Login onLogin={() => setIsLoggedIn(true)} />} />
          </Routes>
      }
    </BrowserRouter>
  );
}
