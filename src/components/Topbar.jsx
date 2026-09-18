import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

const pageTitles = {
  '/':           { title: 'Dashboard',        sub: 'Welcome back' },
  '/members':    { title: 'Member List',       sub: 'Manage registered members' },
  '/register':   { title: 'Register Member',   sub: 'Add a new member to the system' },
  '/grant-loan': { title: 'Grant Loan',        sub: 'Create a new loan for a member' },
  '/loans':      { title: 'Loan Details',      sub: 'Track loans and payment schedules' },
  '/settings':   { title: 'Account Settings',  sub: 'Manage your login credentials' },
};

export default function Topbar({ onMenuToggle, user }) {
  const { pathname } = useLocation();
  const info = pageTitles[pathname] || { title: 'Loan Manager', sub: '' };

  const initial = user?.email ? user.email.charAt(0).toUpperCase() : 'A';
  const username = user?.email ? user.email.split('@')[0] : 'Admin';
  const subText = pathname === '/' ? `Welcome back, ${username}` : info.sub;

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Hamburger — visible only on mobile */}
        <button className="hamburger-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
        <div>
          <h1 className="topbar-title">{info.title}</h1>
          <span className="topbar-sub">{subText}</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-avatar" title={user?.email || 'Admin'}>{initial}</div>
      </div>
    </header>
  );
}
