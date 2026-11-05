import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDate, money } from '../utils/format.js';
import FilterSelect from '../components/FilterSelect.jsx';

export default function Bookings() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const page = Number(params.get('page') || 1);
  const search = params.get('search') || '';
  const status = params.get('status') || '';

  function update(next) {
    const merged = { search, status, page: '1', ...next };
    const qs = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) qs.set(k, String(v));
    });
    setParams(qs);
  }

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) qs.set('search', search);
    if (status) qs.set('status', status);
    api
      .get(`/api/v1/admin/bookings?${qs}`)
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta);
      })
      .catch((err) => setError(err.message));
  }, [page, search, status]);

  return (
    <>
      <PageHeader title="Bookings" subtitle="Events placed by organizers. Open a booking to mark a no-show or fill an open slot." />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="toolbar">
        <input
          placeholder="Search reference, venue, organizer"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') update({ search: e.target.value });
          }}
        />
        <FilterSelect
          value={status}
          onChange={(v) => update({ status: v })}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'pending_payment', label: 'Pending payment' },
            { value: 'confirmed', label: 'Confirmed' },
            { value: 'crew_assigned', label: 'Crew assigned' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'expired', label: 'Expired' },
          ]}
        />
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No bookings yet" hint="They will appear here once organizers start booking from the user app." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Organizer</th>
                  <th>Event</th>
                  <th>Crew</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="row-link" onClick={() => navigate(`/bookings/${row.id}`)}>
                    <td>
                      <strong>{row.bookingReference}</strong>
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{formatDate(row.eventDate)}</div>
                    </td>
                    <td>{row.user?.fullName || row.user?.phoneNumber || '—'}</td>
                    <td>
                      {row.eventType || 'Event'}
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{row.venueName || '—'}</div>
                    </td>
                    <td>
                      {row.crewAssigned}/{row.crewRequired}
                    </td>
                    <td>{money(row.estimatedTotal)}</td>
                    <td>
                      <StatusBadge value={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(next) => update({ page: next, search, status })} />
      </div>
    </>
  );
}
