import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, CreditCard, FileText,
  PlusCircle, LogOut, Landmark, ChevronRight, X, Settings
} from 'lucide-react';

const navItems = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/members',    icon: Users,           label: 'Members'          },
  { to: '/loans',      icon: CreditCard,      label: 'Loan Details'     },
  { to: '/grant-loan', icon: PlusCircle,      label: 'Grant Loan'       },
  { to: '/register',   icon: FileText,        label: 'Register Member'  },
  { to: '/settings',   icon: Settings,        label: 'Account Settings' },
];

export default function Sidebar({ isOpen, onClose, onLogout }) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo + mobile close button */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Landmark size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="sidebar-logo-title">LoanManager</div>
          <div className="sidebar-logo-sub">Admin Portal</div>
        </div>
        {/* Close button — visible only on mobile */}
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">MAIN MENU</div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}   /* close sidebar on mobile when navigating */
          >
            <Icon size={17} />
            <span>{label}</span>
            <ChevronRight size={14} className="sidebar-arrow" />
          </NavLink>
        ))}
      </nav>

      {/* Bottom user + logout */}
      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-avatar">A</div>
          <div>
            <div className="sidebar-user-name">Admin</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout}>
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
