import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const LINKS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/crew', label: 'Crew' },
  { to: '/edit-requests', label: 'Edit requests' },
  { to: '/users', label: 'Users' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/coupons', label: 'Coupons' },
  { to: '/rates', label: 'Rates & staffing' },
  { to: '/audit', label: 'Audit log' },
  { to: '/activity', label: 'Activity' },
];

export default function AppLayout() {
  const { admin, logout } = useAuth();
  const isSuper = admin?.role === 'super_admin';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>Crew Connect</strong>
            <small>Admin console</small>
          </div>
        </div>
        <nav className="nav">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              {link.label}
            </NavLink>
          ))}
          {isSuper ? <NavLink to="/admins">Team</NavLink> : null}
        </nav>
        <div className="sidebar-foot">
          <p>
            {admin?.fullName || admin?.email}
            <br />
            <span style={{ textTransform: 'capitalize' }}>{admin?.role?.replace('_', ' ')}</span>
          </p>
          <button type="button" className="btn btn-gold" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
