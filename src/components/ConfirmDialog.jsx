import { useState } from 'react';

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  requireReason = false,
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (requireReason && reason.trim().length < 3) {
      setError('Please enter a reason (at least 3 characters).');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Action failed');
      setBusy(false);
    }
  }

  return (
    <div className="modal-back" onClick={onClose}>
      <form className="card card-pad modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h3>{title}</h3>
        <p style={{ color: 'var(--muted)' }}>{message}</p>
        {requireReason ? (
          <div className="field">
            <label htmlFor="reason">Reason</label>
            <textarea id="reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        ) : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <div className="btn-row" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className={`btn ${danger ? 'btn-danger' : 'btn-ok'}`} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
