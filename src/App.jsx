import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CrewList from './pages/CrewList.jsx';
import CrewDetail from './pages/CrewDetail.jsx';
import EditRequests from './pages/EditRequests.jsx';
import Users from './pages/Users.jsx';
import UserDetail from './pages/UserDetail.jsx';
import Bookings from './pages/Bookings.jsx';
import BookingDetail from './pages/BookingDetail.jsx';
import Coupons from './pages/Coupons.jsx';
import Rates from './pages/Rates.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import ActivityLogs from './pages/ActivityLogs.jsx';
import Admins from './pages/Admins.jsx';

function Protected() {
  const { admin, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <h1>Restoring session</h1>
          <p>Checking your saved login against the API…</p>
        </div>
      </div>
    );
  }
  if (!admin) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

function SuperOnly() {
  const { admin } = useAuth();
  if (admin?.role !== 'super_admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="crew" element={<CrewList />} />
          <Route path="crew/:id" element={<CrewDetail />} />
          <Route path="edit-requests" element={<EditRequests />} />
          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/:id" element={<BookingDetail />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="rates" element={<Rates />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="activity" element={<ActivityLogs />} />
          <Route element={<SuperOnly />}>
            <Route path="admins" element={<Admins />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
