import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, mediaUrl } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDate } from '../utils/format.js';
import FilterSelect from '../components/FilterSelect.jsx';

export default function CrewList() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');

  const page = Number(params.get('page') || 1);
  const search = params.get('search') || '';
  // Default: verification queue only (submitted + pending). Incomplete signups stay hidden.
  const hasExplicitFilters = [...params.keys()].some((k) => k !== 'page');
  const verificationStatus = params.get('verificationStatus') ?? (hasExplicitFilters ? '' : 'pending');
  const primaryRole = params.get('primaryRole') || '';
  const ready = params.get('ready') ?? (hasExplicitFilters ? '' : 'true');

  function update(next) {
    const merged = { search, verificationStatus, primaryRole, ready, page: '1', ...next };
    const qs = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => {
      if (v) qs.set(k, String(v));
    });
    setParams(qs);
  }

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) qs.set('search', search);
    if (verificationStatus) qs.set('verificationStatus', verificationStatus);
    if (primaryRole) qs.set('primaryRole', primaryRole);
    if (ready) qs.set('ready', ready);
    api
      .get(`/api/v1/admin/crew?${qs}`)
      .then((res) => {
        setRows(res.data || []);
        setMeta(res.meta);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [page, search, verificationStatus, primaryRole, ready]);

  return (
    <>
      <PageHeader
        title="Crew"
        subtitle="Verification queue shows only crew who finished signup and submitted for review."
      />
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="toolbar">
        <input
          placeholder="Search name, phone, city"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') update({ search: e.target.value, page: 1 });
          }}
        />
        <FilterSelect
          value={verificationStatus}
          onChange={(v) => update({ verificationStatus: v })}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
        <FilterSelect
          value={primaryRole}
          onChange={(v) => update({ primaryRole: v })}
          options={[
            { value: '', label: 'All roles' },
            { value: 'waiter', label: 'Waiter' },
            { value: 'supervisor', label: 'Supervisor' },
            { value: 'bouncer', label: 'Bouncer' },
          ]}
        />
        <FilterSelect
          value={ready}
          onChange={(v) => update({ ready: v })}
          options={[
            { value: 'true', label: 'Submitted for review' },
            { value: '', label: 'Include incomplete signups' },
          ]}
        />
      </div>
      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No crew match these filters" hint="Try clearing the queue filter or search." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Crew</th>
                  <th>Role</th>
                  <th>City</th>
                  <th>Status</th>
                  <th>Account</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="row-link" onClick={() => navigate(`/crew/${row.id}`)}>
                    <td>
                      <div className="person">
                        {row.profilePhotoUrl ? (
                          <img className="avatar" src={mediaUrl(row.profilePhotoUrl)} alt="" />
                        ) : (
                          <div className="avatar" />
                        )}
                        <div>
                          <strong>{row.fullName || 'Unnamed'}</strong>
                          <div style={{ color: 'var(--muted)', fontSize: 13 }}>{row.phoneNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{row.primaryRole}</td>
                    <td>{row.city || '—'}</td>
                    <td>
                      {row.verificationStatus === 'pending' && !row.submittedAt ? (
                        <span className="pill pending">Onboarding</span>
                      ) : (
                        <StatusBadge value={row.verificationStatus} />
                      )}
                    </td>
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
        <Pagination meta={meta} onPage={(next) => update({ page: next })} />
      </div>
    </>
  );
}
