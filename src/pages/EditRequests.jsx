import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDateTime } from '../utils/format.js';
import FilterSelect from '../components/FilterSelect.jsx';

export default function EditRequests() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);

  const page = Number(params.get('page') || 1);
  const status = params.get('status') || 'pending';
  const crewId = params.get('crewId') || '';

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) qs.set('status', status);
    if (crewId) qs.set('crewId', crewId);
    api
      .get(`/api/v1/admin/edit-requests?${qs}`)
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta);
      })
      .catch((err) => setError(err.message));
  }, [page, status, crewId]);

  async function reload() {
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (status) qs.set('status', status);
    if (crewId) qs.set('crewId', crewId);
    const res = await api.get(`/api/v1/admin/edit-requests?${qs}`);
    setRows(res.data || []);
    setMeta(res.meta);
  }

  return (
    <>
      <PageHeader title="Edit requests" subtitle="Approved crew asked to change locked profile fields." />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="toolbar">
        <FilterSelect
          value={status}
          onChange={(v) => {
            const next = new URLSearchParams(params);
            if (v) next.set('status', v);
            else next.delete('status');
            next.set('page', '1');
            setParams(next);
          }}
          options={[
            { value: '', label: 'All' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No edit requests" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Crew</th>
                  <th>Changes</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.crew?.fullName || `Crew #${row.crewId}`}</strong>
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{row.crew?.phoneNumber}</div>
                    </td>
                    <td>
                      <code style={{ fontSize: 12 }}>{JSON.stringify(row.changedFields)}</code>
                    </td>
                    <td>
                      <StatusBadge value={row.status} />
                    </td>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>
                      {row.status === 'pending' ? (
                        <div className="btn-row">
                          <button type="button" className="btn btn-ok" onClick={() => setReview({ row, mode: 'approve' })}>
                            Approve
                          </button>
                          <button type="button" className="btn btn-danger" onClick={() => setReview({ row, mode: 'reject' })}>
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </td>
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

      {review?.mode === 'approve' ? (
        <ConfirmDialog
          title={`Approve request #${review.row.id}?`}
          message={`Apply ${JSON.stringify(review.row.changedFields)} to ${review.row.crew?.fullName || 'this crew'}.`}
          confirmLabel="Approve changes"
          onConfirm={() => api.post(`/api/v1/admin/edit-requests/${review.row.id}/approve`).then(reload)}
          onClose={() => setReview(null)}
        />
      ) : null}
      {review?.mode === 'reject' ? (
        <ConfirmDialog
          title={`Reject request #${review.row.id}?`}
          message="The requested fields will not be written to the profile."
          confirmLabel="Reject"
          danger
          requireReason
          onConfirm={(reason) => api.post(`/api/v1/admin/edit-requests/${review.row.id}/reject`, { reason }).then(reload)}
          onClose={() => setReview(null)}
        />
      ) : null}
    </>
  );
}
