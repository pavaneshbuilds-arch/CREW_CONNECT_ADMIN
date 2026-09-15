import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, mediaUrl } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDate } from '../utils/format.js';

export default function Users() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const page = Number(params.get('page') || 1);
  const search = params.get('search') || '';

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) qs.set('search', search);
    api
      .get(`/api/v1/admin/users?${qs}`)
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta);
      })
      .catch((err) => setError(err.message));
  }, [page, search]);

  return (
    <>
      <PageHeader title="Users" subtitle="Event organizers who book crew." />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="toolbar">
        <input
          placeholder="Search name, phone, email"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const next = new URLSearchParams();
              if (e.target.value) next.set('search', e.target.value);
              setParams(next);
            }
          }}
        />
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No organizers yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Bookings</th>
                  <th>Status</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="row-link" onClick={() => navigate(`/users/${row.id}`)}>
                    <td>
                      <div className="person">
                        {row.profilePhotoUrl ? <img className="avatar" src={mediaUrl(row.profilePhotoUrl)} alt="" /> : <div className="avatar" />}
                        <strong>{row.fullName || 'Unnamed'}</strong>
                      </div>
                    </td>
                    <td>
                      {row.phoneNumber}
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{row.email || '—'}</div>
                    </td>
                    <td>{row.bookingCount}</td>
                    <td>
                      <StatusBadge active={row.isActive} />
                    </td>
                    <td>{formatDate(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          meta={meta}
          onPage={(next) => {
            const q = new URLSearchParams(params);
            q.set('page', String(next));
            setParams(q);
          }}
        />
      </div>
    </>
  );
}
