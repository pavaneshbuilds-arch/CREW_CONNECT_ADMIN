import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, mediaUrl } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDate } from '../utils/format.js';

export default function UserDetail() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);

  async function load() {
    const { data } = await api.get(`/api/v1/admin/users/${id}`);
    setUser(data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  if (!user && !error) return <p>Loading…</p>;
  if (!user) return <div className="error-banner">{error}</div>;

  return (
    <>
      <PageHeader
        title={user.fullName || 'Unnamed organizer'}
        subtitle={user.phoneNumber}
        actions={
          <button type="button" className="btn btn-ghost" onClick={() => setDialog(true)}>
            {user.isActive ? 'Suspend' : 'Reactivate'}
          </button>
        }
      />
      <div className="card card-pad">
        <div className="person" style={{ marginBottom: 16 }}>
          {user.profilePhotoUrl ? <img className="avatar lg" src={mediaUrl(user.profilePhotoUrl)} alt="" /> : <div className="avatar lg" />}
          <div>
            <StatusBadge active={user.isActive} />
            <p style={{ color: 'var(--muted)', margin: '8px 0 0' }}>
              {user.email || 'No email'} · {user.authProvider?.replace('_', ' ')}
            </p>
          </div>
        </div>
        <dl className="kv">
          <dt>Bookings</dt>
          <dd>{user.bookingCount}</dd>
          <dt>Reviews</dt>
          <dd>{user.reviewCount}</dd>
          <dt>Joined</dt>
          <dd>{formatDate(user.createdAt)}</dd>
        </dl>
        <h3 style={{ marginTop: 24 }}>Addresses</h3>
        {user.addresses?.length ? (
          <ul>
            {user.addresses.map((a) => (
              <li key={a.id}>
                {[a.houseFlatNumber, a.apartmentBuilding, a.landmark, a.pincode].filter(Boolean).join(', ') || '—'}
                {a.isDefault ? ' · default' : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: 'var(--muted)' }}>No saved addresses.</p>
        )}
      </div>
      {dialog ? (
        <ConfirmDialog
          title={user.isActive ? 'Suspend this user?' : 'Reactivate this user?'}
          message={user.isActive ? 'They will not be able to log in.' : 'They will be able to log in again.'}
          confirmLabel={user.isActive ? 'Suspend' : 'Reactivate'}
          danger={user.isActive}
          onConfirm={() => api.patch(`/api/v1/admin/users/${id}/active`, { isActive: !user.isActive }).then(load)}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}
