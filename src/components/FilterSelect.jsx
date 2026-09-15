import { useEffect, useRef, useState } from 'react';

/**
 * In-page dropdown. Native <select> popups are drawn by the OS and often
 * appear at (0,0) in Chromium / Cursor Simple Browser.
 */
export default function FilterSelect({ value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current?.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div className="filter-select" ref={ref}>
      <button type="button" className="filter-select-btn" onClick={() => setOpen((v) => !v)}>
        <span>{selected?.label}</span>
        <span aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul className="filter-select-menu">
          {options.map((o) => (
            <li key={o.value === '' ? '__empty' : o.value}>
              <button
                type="button"
                className={o.value === value ? 'is-active' : ''}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
