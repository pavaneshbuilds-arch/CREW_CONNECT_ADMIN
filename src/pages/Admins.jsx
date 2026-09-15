import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import { formatDate, labelize } from '../utils/format.js';

export default function Admins() {
  const { admin: me } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'ops_admin' });
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await api.get('/api/v1/admin/admins');
    setRows(res.data || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/v1/admin/admins', form);
      setForm({ email: '', password: '', fullName: '', role: 'ops_admin' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(row) {
    try {
      await api.patch(`/api/v1/admin/admins/${row.id}`, { isActive: !row.isActive });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader title="Team" subtitle="Super admins can invite ops staff and deactivate accounts." />
      {error ? <div className="error-banner">{error}</div> : null}

      <form className="card card-pad" onSubmit={create} style={{ marginBottom: 16 }}>
        <h3>Add admin</h3>
        <div className="toolbar" style={{ marginTop: 12 }}>
          <input
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password (8+ chars)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
          />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="ops_admin">Ops admin</option>
            <option value="super_admin">Super admin</option>
          </select>
          <button className="btn btn-gold" type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>

      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No admins" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.fullName}</td>
                    <td>{row.email}</td>
                    <td>{labelize(row.role)}</td>
                    <td>
                      <StatusBadge active={row.isActive} />
                    </td>
                    <td>{formatDate(row.createdAt)}</td>
                    <td>
                      {row.id !== me?.id ? (
                        <button type="button" className="btn btn-ghost" onClick={() => toggle(row)}>
                          {row.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>You</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
