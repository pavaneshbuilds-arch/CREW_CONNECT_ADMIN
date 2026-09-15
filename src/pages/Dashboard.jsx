import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/v1/admin/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" subtitle="A snapshot of the marketplace right now." />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="stats">
        <div className="stat">
          <span>Pending review</span>
          <strong>{data?.crew.pending ?? '—'}</strong>
        </div>
        <div className="stat">
          <span>Still onboarding</span>
          <strong>{data?.crew.onboarding ?? '—'}</strong>
        </div>
        <div className="stat">
          <span>Approved crew</span>
          <strong>{data?.crew.approved ?? '—'}</strong>
        </div>
        <div className="stat">
          <span>Online now</span>
          <strong>{data?.crew.online ?? '—'}</strong>
        </div>
        <div className="stat">
          <span>Edit requests</span>
          <strong>{data?.editRequests.pending ?? '—'}</strong>
        </div>
      </div>
      <div className="stats">
        <div className="stat">
          <span>Organizers</span>
          <strong>{data?.users.total ?? '—'}</strong>
        </div>
        <div className="stat">
          <span>All bookings</span>
          <strong>{data?.bookings.total ?? '—'}</strong>
        </div>
        <div className="stat">
          <span>Confirmed</span>
          <strong>{data?.bookings.byStatus?.confirmed ?? 0}</strong>
        </div>
        <div className="stat">
          <span>In progress</span>
          <strong>{data?.bookings.byStatus?.in_progress ?? 0}</strong>
        </div>
      </div>
      <div className="btn-row">
        <Link className="btn btn-gold" to="/crew?verificationStatus=pending&ready=true">
          Open verification queue
        </Link>
        <Link className="btn btn-ghost" to="/edit-requests?status=pending">
          Review profile edits
        </Link>
      </div>
    </>
  );
}
