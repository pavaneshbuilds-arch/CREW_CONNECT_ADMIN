import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

function hasStoredSession() {
  const tokens = api.getTokens();
  return Boolean(tokens?.accessToken || tokens?.refreshToken);
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  // Only block the UI when we actually have tokens to restore.
  const [loading, setLoading] = useState(hasStoredSession);

  async function loadMe() {
    if (!hasStoredSession()) {
      setAdmin(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/api/v1/admin/me');
      setAdmin(data);
    } catch {
      api.clearTokens();
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  const value = useMemo(
    () => ({
      admin,
      loading,
      async login(email, password) {
        const { data } = await api.request('/api/v1/auth/admin/login', {
          method: 'POST',
          body: { email, password },
          skipAuth: true,
        });
        api.setTokens(data.tokens);
        setAdmin({
          id: data.id,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
          type: 'admin',
        });
        return data;
      },
      async logout() {
        const tokens = api.getTokens();
        try {
          if (tokens?.refreshToken) {
            await api.request('/api/v1/auth/logout', {
              method: 'POST',
              body: { refreshToken: tokens.refreshToken },
              skipAuth: true,
            });
          }
        } catch {
          // still clear local session
        }
        api.clearTokens();
        setAdmin(null);
      },
    }),
    [admin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
