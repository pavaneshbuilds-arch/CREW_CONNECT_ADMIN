import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FilterSelect from '../components/FilterSelect.jsx';
import { formatDateTime, money } from '../utils/format.js';

const ROLES = [
  { key: 'waiter', label: 'Waiter' },
  { key: 'supervisor', label: 'Supervisor' },
  { key: 'bouncer', label: 'Bouncer' },
];

const emptyForm = {
  waiter: '',
  supervisor: '',
  bouncer: '',
  waiterPercent: '',
  supervisorPercent: '',
  bouncerPercent: '',
  note: '',
};

function percentKey(role) {
  return `${role}Percent`;
}

function crewAmountFor(rate, percent) {
  const amount = Number(rate);
  const share = Number(percent);
  if (!Number.isFinite(amount) || !Number.isFinite(share)) return null;
  return Math.round(((amount * share) / 100) * 100) / 100;
}

function roleLabel(role) {
  return ROLES.find((r) => r.key === role)?.label || role;
}

function newRangeRow(overrides = {}) {
  return {
    key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    minWaiters: '',
    maxWaiters: '',
    supervisorCount: '',
    ...overrides,
  };
}

function toRangePayload(rows) {
  return rows.map((row) => ({
    minWaiters: Number(row.minWaiters),
    maxWaiters: row.maxWaiters === '' || row.maxWaiters == null ? null : Number(row.maxWaiters),
    supervisorCount: Number(row.supervisorCount),
  }));
}

function validateRanges(rows) {
  const payload = toRangePayload(rows);
  for (const row of payload) {
    if (!Number.isInteger(row.minWaiters) || row.minWaiters < 1) {
      return 'Each range needs a min waiter count of 1 or more.';
    }
    if (!Number.isInteger(row.supervisorCount) || row.supervisorCount < 0) {
      return 'Each range needs a supervisor count of 0 or more.';
    }
    if (row.maxWaiters != null && (!Number.isInteger(row.maxWaiters) || row.maxWaiters < row.minWaiters)) {
      return 'Max waiters must be empty (and above) or at least the min.';
    }
  }
  const sorted = [...payload].sort((a, b) => a.minWaiters - b.minWaiters);
  for (let i = 0; i < sorted.length; i += 1) {
    const row = sorted[i];
    if (row.maxWaiters == null && i !== sorted.length - 1) {
      return 'Only the last range can leave max waiters blank (meaning that count and above).';
    }
    const prev = sorted[i - 1];
    if (prev && prev.maxWaiters == null) return 'An open-ended range cannot be followed by another range.';
    if (prev && row.minWaiters <= prev.maxWaiters) return 'Waiter ranges must not overlap.';
  }
  return null;
}

function rangeLabel(row) {
  const max = row.maxWaiters == null || row.maxWaiters === '' ? '+' : `–${row.maxWaiters}`;
  const count = row.supervisorCount === '' ? '—' : row.supervisorCount;
  return `${row.minWaiters || '?'}${max} waiters → ${count} supervisor${Number(row.supervisorCount) === 1 ? '' : 's'}`;
}

export default function Rates() {
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(null);
  const [gstPercent, setGstPercent] = useState(null);
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(null);
  const [ranges, setRanges] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [rangeBusy, setRangeBusy] = useState(false);
  const page = Number(params.get('page') || 1);
  const role = params.get('role') || '';

  async function loadRates() {
    const res = await api.get('/api/v1/admin/rates');
    const rates = res.data?.rates || {};
    const percents = res.data?.crewSharePercents || {};
    setSaved(res.data);
    setGstPercent(res.data?.gstPercent ?? null);
    setForm({
      waiter: rates.waiter ?? '',
      supervisor: rates.supervisor ?? '',
      bouncer: rates.bouncer ?? '',
      waiterPercent: percents.waiter ?? '',
      supervisorPercent: percents.supervisor ?? '',
      bouncerPercent: percents.bouncer ?? '',
      note: '',
    });
  }

  async function loadLogs() {
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (role) qs.set('role', role);
    const res = await api.get(`/api/v1/admin/rates/logs?${qs}`);
    setLogs(res.data || []);
    setMeta(res.meta);
  }

  async function loadRanges() {
    const res = await api.get('/api/v1/admin/supervisor-ranges');
    const rows = res.data || [];
    setRanges(
      rows.length
        ? rows.map((row) =>
            newRangeRow({
              minWaiters: String(row.minWaiters),
              maxWaiters: row.maxWaiters == null ? '' : String(row.maxWaiters),
              supervisorCount: String(row.supervisorCount),
            })
          )
        : [newRangeRow()]
    );
  }

  useEffect(() => {
    Promise.all([loadRates(), loadRanges()]).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    loadLogs().catch((err) => setError(err.message));
  }, [page, role]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = {};
      const crewSharePercent = {};
      for (const { key } of ROLES) {
        const next = Number(form[key]);
        const current = Number(saved?.rates?.[key]);
        if (!Number.isFinite(next) || next < 1) {
          setError(`${roleLabel(key)} price must be at least 1.`);
          return;
        }
        if (next !== current) body[key] = next;

        const nextPercent = Number(form[percentKey(key)]);
        const currentPercent = Number(saved?.crewSharePercents?.[key]);
        if (!Number.isFinite(nextPercent) || nextPercent < 0 || nextPercent > 100) {
          setError(`${roleLabel(key)} crew share must be between 0 and 100.`);
          return;
        }
        if (nextPercent !== currentPercent) crewSharePercent[key] = nextPercent;
      }
      if (Object.keys(crewSharePercent).length) body.crewSharePercent = crewSharePercent;
      if (form.note.trim()) body.note = form.note.trim();
      if (!ROLES.some(({ key }) => body[key] != null) && !Object.keys(crewSharePercent).length) {
        setNotice('No rate changes to save.');
        return;
      }
      await api.patch('/api/v1/admin/rates', body);
      setNotice('Saved. New bookings will charge these prices and store the crew share.');
      await loadRates();
      await loadLogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function updateRange(key, field, value) {
    setRanges((rows) => rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  }

  async function saveRanges(e) {
    e.preventDefault();
    setRangeBusy(true);
    setError('');
    setNotice('');
    const invalid = validateRanges(ranges);
    if (invalid) {
      setError(invalid);
      setRangeBusy(false);
      return;
    }
    try {
      await api.put('/api/v1/admin/supervisor-ranges', { ranges: toRangePayload(ranges) });
      setNotice('Supervisor ranges updated. New booking suggestions will use these counts.');
      await loadRanges();
    } catch (err) {
      setError(err.message);
    } finally {
      setRangeBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Crew rates"
        subtitle="The price is what the organizer is charged per person for the event. Crew share is the percentage of that price paid to the crew member. Hours are the shift length only. Changes apply to new bookings and do not rewrite amounts already stored."
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {notice ? (
        <div className="error-banner" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
          {notice}
        </div>
      ) : null}

      <form className="card card-pad" onSubmit={save} style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {ROLES.map(({ key, label }) => {
            const crewAmount = crewAmountFor(form[key], form[percentKey(key)]);
            return (
              <div key={key} style={{ display: 'grid', gap: 10 }}>
                <strong>{label}</strong>
                <div className="field">
                  <label htmlFor={`rate-${key}`}>Charged to organizer (₹ / event)</label>
                  <input
                    id={`rate-${key}`}
                    type="number"
                    min="1"
                    step="1"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`share-${key}`}>Crew share %</label>
                  <input
                    id={`share-${key}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form[percentKey(key)]}
                    onChange={(e) => setForm({ ...form, [percentKey(key)]: e.target.value })}
                    required
                  />
                </div>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>
                  Crew receives {crewAmount != null ? money(crewAmount) : '—'} per person
                </span>
              </div>
            );
          })}
        </div>
        <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
          <div className="field">
            <label>GST</label>
            <input value={gstPercent != null ? `${gstPercent}%` : '—'} disabled />
          </div>
          <input
            placeholder="Note (optional) — e.g. Q3 rate card"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            style={{ flex: 1, minWidth: 240, alignSelf: 'end' }}
          />
          <button className="btn btn-gold" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save rates'}
          </button>
        </div>
      </form>

      <PageHeader
        title="Supervisor staffing"
        subtitle="For N waiters, recommend X supervisors. Waiters come from guest count (÷ 20); supervisors are added on top. Bouncers are not in these ranges — organizers pick any number they want. Leave max blank on the last row for “that waiter count and above”."
      />
      <form className="card" onSubmit={saveRanges} style={{ marginBottom: 16 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Min waiters</th>
                <th>Max waiters</th>
                <th>Supervisors</th>
                <th>Preview</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ranges.map((row, index) => (
                <tr key={row.key}>
                  <td>
                    <input
                      className="cell-input"
                      type="number"
                      min="1"
                      required
                      value={row.minWaiters}
                      onChange={(e) => updateRange(row.key, 'minWaiters', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      type="number"
                      min="1"
                      placeholder={index === ranges.length - 1 ? 'and above' : ''}
                      value={row.maxWaiters}
                      onChange={(e) => updateRange(row.key, 'maxWaiters', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="cell-input"
                      type="number"
                      min="0"
                      required
                      value={row.supervisorCount}
                      onChange={(e) => updateRange(row.key, 'supervisorCount', e.target.value)}
                    />
                  </td>
                  <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{rangeLabel(row)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        setRanges((rows) => (rows.length <= 1 ? [newRangeRow()] : rows.filter((item) => item.key !== row.key)))
                      }
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="toolbar" style={{ margin: '12px 20px 18px' }}>
          <button type="button" className="btn btn-ghost" onClick={() => setRanges((rows) => [...rows, newRangeRow()])}>
            Add range
          </button>
          <button className="btn btn-gold" type="submit" disabled={rangeBusy}>
            {rangeBusy ? 'Saving…' : 'Save ranges'}
          </button>
        </div>
      </form>

      <PageHeader title="Change log" subtitle="Who changed a price or crew share, from what, to what." />
      <div className="toolbar">
        <FilterSelect
          value={role}
          onChange={(v) => {
            const next = new URLSearchParams();
            if (v) next.set('role', v);
            setParams(next);
          }}
          options={[
            { value: '', label: 'All roles' },
            ...ROLES.map((r) => ({ value: r.key, label: r.label })),
          ]}
        />
      </div>
      <div className="card">
        {logs.length === 0 ? (
          <EmptyState title="No rate changes yet" hint="Edits from this page appear here." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Role</th>
                  <th>Previous price</th>
                  <th>New price</th>
                  <th>Previous share</th>
                  <th>New share</th>
                  <th>Note</th>
                  <th>Changed by</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDateTime(row.createdAt)}</td>
                    <td>{roleLabel(row.role)}</td>
                    <td>{money(row.previousRate)}</td>
                    <td>{money(row.newRate)}</td>
                    <td>{row.previousCrewSharePercent != null ? `${row.previousCrewSharePercent}%` : '—'}</td>
                    <td>{row.newCrewSharePercent != null ? `${row.newCrewSharePercent}%` : '—'}</td>
                    <td>{row.note || '—'}</td>
                    <td>{row.changedBy?.fullName || row.changedBy?.email || '—'}</td>
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
