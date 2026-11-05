import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

export default function AssignCrewDialog({ bookingId, role, replacesAssignmentId, onClose, onAssigned }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const qs = new URLSearchParams({ role, limit: '20' });
    if (query) qs.set('search', query);
    api
      .get(`/api/v1/admin/bookings/${bookingId}/available-crew?${qs}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data || []);
        setSelectedId(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bookingId, role, query]);

  async function submit(e) {
    e.preventDefault();
    if (!selectedId) {
      setError('Choose a crew member.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = { crewId: selectedId, role };
      if (replacesAssignmentId) body.replacesAssignmentId = replacesAssignmentId;
      await api.post(`/api/v1/admin/bookings/${bookingId}/assignments`, body);
      await onAssigned();
      onClose();
    } catch (err) {
      setError(err.message || 'Assignment failed');
      setBusy(false);
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="card card-pad modal modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{replacesAssignmentId ? `Replace with a ${role}` : `Assign a ${role}`}</h3>
        <p style={{ color: 'var(--muted)' }}>
          {replacesAssignmentId
            ? 'The new crew member is marked as a replacement and accepted on their behalf.'
            : 'They are accepted on their behalf and do not need to accept the job in the app.'}
        </p>
        <div className="toolbar">
          <input
            placeholder="Search name or phone"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" className="btn btn-ghost" onClick={() => setQuery(search.trim())}>
            Search
          </button>
        </div>
        {error ? <div className="error-banner">{error}</div> : null}
        <div className="table-wrap" style={{ maxHeight: 320 }}>
          <table>
            <thead>
              <tr>
                <th />
                <th>Crew</th>
                <th>Phone</th>
                <th>City</th>
                <th>No-shows</th>
                <th>Replacements</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No available crew for this role.</td>
                </tr>
              ) : (
                rows.map((crew) => (
                  <tr key={crew.id} className="row-link" onClick={() => setSelectedId(crew.id)}>
                    <td>
                      <input
                        type="radio"
                        name="crew"
                        checked={selectedId === crew.id}
                        onChange={() => setSelectedId(crew.id)}
                      />
                    </td>
                    <td>{crew.fullName || 'Unnamed'}</td>
                    <td>{crew.phoneNumber}</td>
                    <td>{crew.city || '—'}</td>
                    <td>{crew.noShowCount}</td>
                    <td>{crew.replacementCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="btn-row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn" disabled={busy || !selectedId}>
            {busy ? 'Assigning…' : replacesAssignmentId ? 'Add replacement' : 'Assign'}
          </button>
        </div>
      </form>
    </div>
  );
}
