import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

export default function Login() {
  const { admin, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('admin@crewconnect.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (admin) {
    const dest = location.state?.from?.pathname || '/';
    return <Navigate to={dest} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Could not sign in');
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>Crew Connect</strong>
            <small>Operations desk</small>
          </div>
        </div>
        <h1>Sign in</h1>
        <p>Review crew, bookings, and platform activity.</p>
        <form onSubmit={onSubmit}>
          {error ? <div className="error-banner">{error}</div> : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-gold" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
