import { Link } from 'react-router-dom';

function entityPath(type, id) {
  if (id == null || id === '') return null;
  switch (type) {
    case 'crew':
    case 'crew_member':
      return `/crew/${id}`;
    case 'user':
      return `/users/${id}`;
    case 'booking':
      return `/bookings/${id}`;
    case 'coupon':
      return '/coupons';
    default:
      return null;
  }
}

function EntityRef({ type, id }) {
  if (!type && (id == null || id === '')) return '—';
  const label = [type, id != null && id !== '' ? `#${id}` : null].filter(Boolean).join(' ');
  const to = entityPath(type, id);
  if (!to) return label || '—';
  return <Link to={to}>{label}</Link>;
}

function isEmpty(value) {
  if (value == null) return true;
  if (typeof value === 'object') return !Object.keys(value).length;
  return false;
}

export default function LogDetailModal({ title, fields, payload, payloadLabel = 'Change', onClose }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="card card-pad modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <dl className="kv" style={{ marginTop: 16 }}>
          {fields.map((field) => (
            <div key={field.label} className="kv-row">
              <dt>{field.label}</dt>
              <dd>{field.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
        <h4 style={{ margin: '18px 0 8px' }}>{payloadLabel}</h4>
        {isEmpty(payload) ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>No extra details were stored for this event.</p>
        ) : (
          <pre className="log-json">{JSON.stringify(payload, null, 2)}</pre>
        )}
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export { EntityRef };
