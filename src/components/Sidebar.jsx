import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, FileText,
  PlusCircle, LogOut, ChevronRight, X, Settings, ShieldCheck
} from 'lucide-react';
import fgiLogo from '../assets/logo.jpeg';
import PrivacyPolicyModal from './PrivacyPolicyModal';

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/members',    icon: Users,           label: 'Members'          },
  { to: '/loans',      icon: CreditCard,      label: 'Loan Details'     },
  { to: '/grant-loan', icon: PlusCircle,      label: 'Grant Loan'       },
  { to: '/register',   icon: FileText,        label: 'Register Member'  },
  { to: '/settings',   icon: Settings,        label: 'Account Settings' },
];

export default function Sidebar({ isOpen, onClose, onLogout, user }) {
  const [showPrivacy, setShowPrivacy] = useState(false);

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : 'A';
  const username = user?.email ? user.email.split('@')[0] : 'Admin';

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo + mobile close button */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" style={{ overflow: 'hidden', padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <img src={fgiLogo} alt="FGI Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="sidebar-logo-title">FGI Loan Services</div>
          <div className="sidebar-logo-sub">Admin Portal</div>
        </div>
        {/* Close button — visible only on mobile */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <Icon size={18} />
            <span>{label}</span>
            <ChevronRight size={14} className="sidebar-arrow" />
          </NavLink>
        ))}
      </nav>

      {/* Footer / User info */}
      <div className="sidebar-footer">
        {/* Privacy Policy & Terms Link */}
        <div style={{ padding: '0 8px 12px 8px', borderBottom: '1px solid var(--color-border)', marginBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setShowPrivacy(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 8px',
              background: 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: 'var(--color-text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#4F46E5'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
          >
            <ShieldCheck size={14} />
            <span>Privacy & Terms</span>
          </button>
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initial}</div>
          <div>
            <div className="sidebar-user-name" title={user?.email || 'Admin'}>{username}</div>
            <div className="sidebar-user-role">{user?.role || 'Administrator'}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
  </>
  );
}
