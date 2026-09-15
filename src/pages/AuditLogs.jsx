import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDateTime, labelize } from '../utils/format.js';
import FilterSelect from '../components/FilterSelect.jsx';
import LogDetailModal, { EntityRef } from '../components/LogDetailModal.jsx';

export default function AuditLogs() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const page = Number(params.get('page') || 1);
  const actionType = params.get('actionType') || '';

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '30' });
    if (actionType) qs.set('actionType', actionType);
    api
      .get(`/api/v1/admin/audit-logs?${qs}`)
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta);
      })
      .catch((err) => setError(err.message));
  }, [page, actionType]);

  return (
    <>
      <PageHeader title="Audit log" subtitle="Actions taken from this console. Click a row to see what changed." />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="toolbar">
        <FilterSelect
          value={actionType}
          onChange={(v) => {
            const next = new URLSearchParams();
            if (v) next.set('actionType', v);
            setParams(next);
          }}
          options={[
            { value: '', label: 'All actions' },
            { value: 'crew_verified', label: 'Crew verified' },
            { value: 'crew_rejected', label: 'Crew rejected' },
            { value: 'profile_edit_approved', label: 'Edit approved' },
            { value: 'profile_edit_rejected', label: 'Edit rejected' },
            { value: 'rate_updated', label: 'Rate updated' },
            { value: 'supervisor_ranges_updated', label: 'Supervisor ranges' },
            { value: 'coupon_created', label: 'Coupon created' },
            { value: 'coupon_updated', label: 'Coupon updated' },
            { value: 'coupon_deleted', label: 'Coupon deleted' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No audit entries yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="row-link" onClick={() => setSelected(row)}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>{row.admin?.fullName || row.admin?.email}</td>
                    <td>{labelize(row.actionType)}</td>
                    <td>
                      {row.targetEntityType} #{row.targetEntityId}
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
      {selected ? (
        <LogDetailModal
          title={labelize(selected.actionType)}
          payload={selected.details}
          payloadLabel="Change details"
          onClose={() => setSelected(null)}
          fields={[
            { label: 'When', value: formatDateTime(selected.createdAt) },
            {
              label: 'Admin',
              value: selected.admin
                ? `${selected.admin.fullName || selected.admin.email}${selected.admin.role ? ` · ${labelize(selected.admin.role)}` : ''}`
                : `#${selected.adminId}`,
            },
            { label: 'Action', value: labelize(selected.actionType) },
            {
              label: 'Target',
              value: <EntityRef type={selected.targetEntityType} id={selected.targetEntityId} />,
            },
          ]}
        />
      ) : null}
    </>
  );
}
