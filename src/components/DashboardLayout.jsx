import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, LogOut, Wallet, Coins } from 'lucide-react';
import { authService } from '../services/authService';
import './DashboardLayout.css';

export default function DashboardLayout({ user }) {
  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  // Extract initials for the avatar badge (e.g., "Tejas N" -> "TN")
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substr(0, 2);
  };

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div>
          <div className="brand-wrapper">
            <Wallet style={{ color: 'var(--primary)', width: 24, height: 24 }} />
            <span className="brand-name">AuraFinance</span>
          </div>
          
          <nav className="nav-menu">
            <NavLink 
              to="/dashboard" 
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <LayoutDashboard size={18} />
              Dashboard
            </NavLink>
            <NavLink 
              to="/currency-converter" 
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <Coins size={18} />
              Currency Converter
            </NavLink>
          </nav>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Logout
        </button>
      </aside>

      <div className="main-stage">
        <header className="top-navbar">
          <div className="avatar-placeholder" title={user?.displayName}>
            {getInitials(user?.displayName)}
          </div>
        </header>
        <main className="content-viewport">
          <Outlet />
        </main>
      </div>
    </div>
  );
}