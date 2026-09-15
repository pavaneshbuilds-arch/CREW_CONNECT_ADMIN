import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import PageHeader from '../components/PageHeader.jsx';
import Pagination from '../components/Pagination.jsx';
import EmptyState from '../components/EmptyState.jsx';
import FilterSelect from '../components/FilterSelect.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { formatDateTime, money } from '../utils/format.js';

const emptyForm = {
  code: '',
  description: '',
  discountType: 'flat',
  discountValue: '',
  minSpend: '',
  maxDiscountAmount: '',
  maxUses: '',
  maxUsesPerUser: '',
  validFrom: '',
  validUntil: '',
  isActive: true,
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function numOrNull(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function fromCoupon(coupon) {
  return {
    code: coupon.code || '',
    description: coupon.description || '',
    discountType: coupon.discountType || 'flat',
    discountValue: coupon.discountValue ?? '',
    minSpend: coupon.minSpend ?? '',
    maxDiscountAmount: coupon.maxDiscountAmount ?? '',
    maxUses: coupon.maxUses ?? '',
    maxUsesPerUser: coupon.maxUsesPerUser ?? '',
    validFrom: toLocalInput(coupon.validFrom),
    validUntil: toLocalInput(coupon.validUntil),
    isActive: coupon.isActive !== false,
  };
}

function toPayload(form) {
  return {
    code: String(form.code || '').trim().toUpperCase(),
    description: String(form.description || '').trim() || null,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minSpend: numOrNull(form.minSpend),
    maxDiscountAmount: numOrNull(form.maxDiscountAmount),
    maxUses: numOrNull(form.maxUses),
    maxUsesPerUser: numOrNull(form.maxUsesPerUser),
    validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
    validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
    isActive: Boolean(form.isActive),
  };
}

function discountLabel(row) {
  if (row.discountType === 'percentage') {
    const cap = row.maxDiscountAmount != null ? ` upto ${money(row.maxDiscountAmount)}` : '';
    return `${row.discountValue}% off${cap}`;
  }
  return `${money(row.discountValue)} off`;
}

function usesLabel(row) {
  const used = row.usedCount ?? 0;
  const global = row.maxUses == null ? `${used} used` : `${used} / ${row.maxUses}`;
  if (row.maxUsesPerUser === 1) return `${global} · once per user`;
  if (row.maxUsesPerUser != null) return `${global} · ${row.maxUsesPerUser}/user`;
  return global;
}

export default function Coupons() {
  const [params, setParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const page = Number(params.get('page') || 1);
  const search = params.get('search') || '';
  const isActive = params.get('isActive') || '';
  const discountType = params.get('discountType') || '';

  async function load() {
    const qs = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) qs.set('search', search);
    if (isActive) qs.set('isActive', isActive);
    if (discountType) qs.set('discountType', discountType);
    const res = await api.get(`/api/v1/admin/coupons?${qs}`);
    setRows(res.data || []);
    setMeta(res.meta);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [page, search, isActive, discountType]);

  function openCreate() {
    setEditing('new');
    setForm(emptyForm);
    setError('');
  }

  function openEdit(row) {
    setEditing(row);
    setForm(fromCoupon(row));
    setError('');
  }

  function closeForm() {
    setEditing(null);
    setForm(emptyForm);
  }

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    next.delete('page');
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const body = toPayload(form);
      if (!body.code || !Number.isFinite(body.discountValue) || body.discountValue <= 0) {
        throw new Error('Code and a positive discount value are required.');
      }
      if (body.discountType === 'percentage' && body.discountValue > 100) {
        throw new Error('Percentage discount cannot exceed 100.');
      }
      if (editing === 'new') {
        await api.post('/api/v1/admin/coupons', body);
        setNotice(`Coupon ${body.code} created.`);
      } else {
        await api.patch(`/api/v1/admin/coupons/${editing.id}`, body);
        setNotice(`Coupon ${body.code} updated.`);
      }
      closeForm();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(row) {
    setError('');
    setNotice('');
    try {
      await api.patch(`/api/v1/admin/coupons/${row.id}`, { isActive: !row.isActive });
      setNotice(`${row.code} ${row.isActive ? 'deactivated' : 'activated'}.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Coupons"
        subtitle="Offers on the mobile Coupons screen. Flat ₹ off or a percentage of subtotal, optionally capped. Usage counts placed bookings only."
        actions={
          <button type="button" className="btn btn-gold" onClick={openCreate}>
            New coupon
          </button>
        }
      />
      {error ? <div className="error-banner">{error}</div> : null}
      {notice ? (
        <div className="error-banner" style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}>
          {notice}
        </div>
      ) : null}

      <div className="toolbar">
        <input
          placeholder="Search code or description"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setFilter('search', e.target.value.trim());
          }}
        />
        <FilterSelect
          value={isActive}
          onChange={(v) => setFilter('isActive', v)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'true', label: 'Active' },
            { value: 'false', label: 'Inactive' },
          ]}
        />
        <FilterSelect
          value={discountType}
          onChange={(v) => setFilter('discountType', v)}
          options={[
            { value: '', label: 'All types' },
            { value: 'flat', label: 'Flat ₹' },
            { value: 'percentage', label: 'Percentage' },
          ]}
        />
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <EmptyState title="No coupons yet" hint="Create an offer to show it in the organizer app." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min spend</th>
                  <th>Uses</th>
                  <th>Valid</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.code}</strong>
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>{row.description || '—'}</div>
                    </td>
                    <td>{discountLabel(row)}</td>
                    <td>{row.minSpend != null ? money(row.minSpend) : '—'}</td>
                    <td>{usesLabel(row)}</td>
                    <td>
                      {row.validFrom || row.validUntil
                        ? `${formatDateTime(row.validFrom)} → ${formatDateTime(row.validUntil)}`
                        : 'Always'}
                    </td>
                    <td>
                      <StatusBadge value={row.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td>
                      <div className="btn-row">
                        <button type="button" className="btn btn-ghost" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => toggleActive(row)}>
                          {row.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(row)}>
                          Delete
                        </button>
                      </div>
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

      {editing ? (
        <div className="modal-back" onClick={closeForm}>
          <form className="card card-pad modal modal-wide" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h3>{editing === 'new' ? 'New coupon' : `Edit ${editing.code}`}</h3>
            <p style={{ color: 'var(--muted)', marginTop: 0 }}>
              Percentage discounts are capped by “Max discount” when set (e.g. 50% upto ₹1000). Leave usage fields blank for
              unlimited.
            </p>
            {error ? <div className="error-banner">{error}</div> : null}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="coupon-code">Code</label>
                <input
                  id="coupon-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  required
                  minLength={2}
                  maxLength={30}
                  pattern="[A-Z0-9_-]+"
                  placeholder="CREW50"
                />
              </div>
              <div className="field">
                <label htmlFor="coupon-type">Type</label>
                <select
                  id="coupon-type"
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                >
                  <option value="flat">Flat ₹ off</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div className="field span-2">
                <label htmlFor="coupon-description">Description</label>
                <input
                  id="coupon-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="FLAT 50% OFF upto ₹1000"
                />
              </div>
              <div className="field">
                <label htmlFor="coupon-value">
                  {form.discountType === 'percentage' ? 'Percent (0–100)' : 'Amount ₹'}
                </label>
                <input
                  id="coupon-value"
                  type="number"
                  min="0.01"
                  max={form.discountType === 'percentage' ? '100' : '100000'}
                  step="0.01"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="coupon-cap">Max discount ₹ (optional cap)</label>
                <input
                  id="coupon-cap"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.maxDiscountAmount}
                  onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                  placeholder={form.discountType === 'percentage' ? 'e.g. 1000' : 'Optional'}
                />
              </div>
              <div className="field">
                <label htmlFor="coupon-min">Min spend ₹</label>
                <input
                  id="coupon-min"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minSpend}
                  onChange={(e) => setForm({ ...form, minSpend: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="coupon-active">Status</label>
                <select
                  id="coupon-active"
                  value={form.isActive ? 'true' : 'false'}
                  onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="coupon-max-uses">Global max uses</label>
                <input
                  id="coupon-max-uses"
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div className="field">
                <label htmlFor="coupon-per-user">Max uses per user</label>
                <input
                  id="coupon-per-user"
                  type="number"
                  min="1"
                  step="1"
                  value={form.maxUsesPerUser}
                  onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
                  placeholder="1 = one-time"
                />
              </div>
              <div className="field">
                <label htmlFor="coupon-from">Valid from</label>
                <input
                  id="coupon-from"
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="coupon-until">Valid until</label>
                <input
                  id="coupon-until"
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
                />
              </div>
            </div>
            <div className="btn-row" style={{ marginTop: 16 }}>
              <button type="button" className="btn btn-ghost" onClick={closeForm} disabled={busy}>
                Cancel
              </button>
              <button type="submit" className="btn btn-gold" disabled={busy}>
                {busy ? 'Saving…' : editing === 'new' ? 'Create coupon' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title={`Delete ${confirmDelete.code}?`}
          message="This permanently removes the coupon. If any booking already used it, deactivate it instead."
          confirmLabel="Delete"
          danger
          onClose={() => setConfirmDelete(null)}
          onConfirm={async () => {
            try {
              await api.delete(`/api/v1/admin/coupons/${confirmDelete.id}`);
              setNotice(`${confirmDelete.code} deleted.`);
              await load();
            } catch (err) {
              if (err.code === 'COUPON_IN_USE') {
                throw new Error('This coupon is on bookings. Deactivate it instead of deleting.');
              }
              throw err;
            }
          }}
        />
      ) : null}
    </>
  );
}
