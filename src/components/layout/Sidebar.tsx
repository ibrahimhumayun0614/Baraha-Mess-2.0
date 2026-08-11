// ============================================
// Sidebar Navigation Component
// ============================================
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Receipt,
  ClipboardList,
  LogOut,
  History,
  Home,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/members', icon: Users, label: 'Members' },
    { to: '/admin/months', icon: Calendar, label: 'Monthly Cycles' },
    { to: '/admin/expenses', icon: Receipt, label: 'Expense History' },
    { to: '/admin/activity', icon: ClipboardList, label: 'Activity Logs' },
  ];

  const memberLinks = [
    { to: '/member', icon: Home, label: 'Dashboard', end: true },
    { to: '/member/expenses', icon: History, label: 'My Expenses' },
  ];

  const links = isAdmin ? adminLinks : memberLinks;

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">Baraha Mess</span>
            <span className="sidebar-brand-sub">Management System</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              {isAdmin ? 'Administration' : 'Member Menu'}
            </div>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <link.icon className="sidebar-link-icon" size={18} />
                <span className="sidebar-link-text">{link.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-link" style={{ marginBottom: '0.5rem', pointerEvents: 'none' }}>
            <div className="avatar avatar-sm">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {user?.name || 'User'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>
                {user?.type}
              </div>
            </div>
          </div>
          <button className="sidebar-link" onClick={handleLogout}>
            <LogOut className="sidebar-link-icon" size={18} />
            <span className="sidebar-link-text">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
