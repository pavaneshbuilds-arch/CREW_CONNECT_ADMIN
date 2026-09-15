import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './EyeIcons.jsx';

export default function MaskedValue({ masked, value, label }) {
  const [visible, setVisible] = useState(false);

  if (!masked && !value) return '—';

  const canReveal = Boolean(value);
  const shown = visible && value ? value : masked || '—';

  return (
    <span className="masked-value">
      <span className="masked-value-text">{shown}</span>
      {canReveal ? (
        <button
          type="button"
          className="reveal-btn"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          aria-pressed={visible}
          title={visible ? `Hide ${label}` : `Show ${label}`}
          onClick={() => setVisible((open) => !open)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      ) : null}
    </span>
  );
}
