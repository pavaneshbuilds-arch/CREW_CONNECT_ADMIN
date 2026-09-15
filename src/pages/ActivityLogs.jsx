import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDateTime, labelize } from '../utils/format.js';
import FilterSelect from '../components/FilterSelect.jsx';
import LogDetailModal, { EntityRef } from '../components/LogDetailModal.jsx';

export default function ActivityLogs() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const page = Number(params.get('page') || 1);
  const category = params.get('category') || '';

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '30' });
    if (category) qs.set('category', category);
    api
      .get(`/api/v1/admin/activity-logs?${qs}`)
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta);
      })
      .catch((err) => setError(err.message));
  }, [page, category]);

  return (
    <>
      <PageHeader title="Activity" subtitle="System-wide event stream. Click a row to see metadata for that event." />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="toolbar">
        <FilterSelect
          value={category}
          onChange={(v) => {
            const next = new URLSearchParams();
            if (v) next.set('category', v);
            setParams(next);
          }}
          options={[
            { value: '', label: 'All categories' },
            { value: 'login', label: 'Login' },
            { value: 'admin_action', label: 'Admin action' },
            { value: 'payment', label: 'Payment' },
            { value: 'crew_earning', label: 'Crew earning' },
            { value: 'crew_redemption', label: 'Crew redemption' },
            { value: 'penalty', label: 'Penalty' },
          ]}
        />
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No activity recorded" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Category</th>
                  <th>Actor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="row-link" onClick={() => setSelected(row)}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>{labelize(row.category)}</td>
                    <td>
                      {row.actorType} {row.actorId ?? ''}
                    </td>
                    <td>{labelize(row.action)}</td>
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
      {selected ? (
        <LogDetailModal
          title={labelize(selected.action)}
          payload={selected.metadata}
          payloadLabel="Event metadata"
          onClose={() => setSelected(null)}
          fields={[
            { label: 'When', value: formatDateTime(selected.createdAt) },
            { label: 'Category', value: labelize(selected.category) },
            {
              label: 'Actor',
              value: `${labelize(selected.actorType)}${selected.actorId != null ? ` #${selected.actorId}` : ''}`,
            },
            { label: 'Action', value: labelize(selected.action) },
            {
              label: 'Reference',
              value: <EntityRef type={selected.referenceEntityType} id={selected.referenceEntityId} />,
            },
            { label: 'Month', value: selected.monthBucket || '—' },
          ]}
        />
      ) : null}
    </>
  );
}
