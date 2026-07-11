import { useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';

const pageTitles = {
  '/':           { title: 'Dashboard',       sub: 'Welcome back, Admin' },
  '/members':    { title: 'Member List',      sub: 'Manage registered members' },
  '/register':   { title: 'Register Member',  sub: 'Add a new member to the system' },
  '/grant-loan': { title: 'Grant Loan',       sub: 'Create a new loan for a member' },
  '/loans':      { title: 'Loan Details',     sub: 'Track loans and payment schedules' },
};

export default function Topbar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const info = pageTitles[pathname] || { title: 'Loan Manager', sub: '' };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* Hamburger — visible only on mobile */}
        <button className="hamburger-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
        <div>
          <h1 className="topbar-title">{info.title}</h1>
          <span className="topbar-sub">{info.sub}</span>
        </div>
      </div>
      <div className="topbar-right">
        
        <div className="topbar-avatar">A</div>
      </div>
    </header>
  );
}
