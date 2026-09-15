import { labelize } from '../utils/format.js';

export default function StatusBadge({ value, active }) {
  if (typeof active === 'boolean') {
    return <span className={`pill ${active ? 'active' : 'inactive'}`}>{active ? 'Active' : 'Suspended'}</span>;
  }
  return <span className={`pill ${value || ''}`}>{labelize(value)}</span>;
}
