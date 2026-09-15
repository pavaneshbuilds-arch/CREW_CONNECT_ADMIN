const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function readTokens() {
  try {
    return JSON.parse(localStorage.getItem('cc_admin_tokens') || 'null');
  } catch {
    return null;
  }
}

function writeTokens(tokens) {
  if (!tokens) localStorage.removeItem('cc_admin_tokens');
  else localStorage.setItem('cc_admin_tokens', JSON.stringify(tokens));
}

async function parseBody(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: { message: text || res.statusText } };
  }
}

async function rawRequest(path, { method = 'GET', body, token, headers } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await parseBody(res);
    return { res, json };
  } catch (err) {
    if (err?.name === 'AbortError') {
      const timeout = new Error('The API did not respond. Is CREW_CONNECT_API running on port 4000?');
      timeout.code = 'API_TIMEOUT';
      throw timeout;
    }
    const network = new Error('Cannot reach the API. Start the backend on port 4000, then refresh.');
    network.code = 'API_UNREACHABLE';
    throw network;
  } finally {
    clearTimeout(timer);
  }
}

let refreshPromise = null;

async function refreshTokens() {
  const tokens = readTokens();
  if (!tokens?.refreshToken) throw new Error('NO_SESSION');
  if (!refreshPromise) {
    refreshPromise = rawRequest('/api/v1/auth/refresh', {
      method: 'POST',
      body: { refreshToken: tokens.refreshToken },
    }).finally(() => {
      refreshPromise = null;
    });
  }
  const { res, json } = await refreshPromise;
  if (!res.ok || !json?.data?.tokens) {
    writeTokens(null);
    const err = new Error(json?.error?.message || 'Session expired');
    err.code = json?.error?.code || 'SESSION_EXPIRED';
    throw err;
  }
  writeTokens(json.data.tokens);
  return json.data.tokens;
}

export const api = {
  getTokens: readTokens,
  setTokens: writeTokens,
  clearTokens() {
    writeTokens(null);
  },

  async request(path, options = {}) {
    const { skipAuth, retry = true, ...rest } = options;
    const tokens = readTokens();
    const { res, json } = await rawRequest(path, { ...rest, token: skipAuth ? undefined : tokens?.accessToken });

    if (res.status === 401 && !skipAuth && retry && tokens?.refreshToken) {
      try {
        await refreshTokens();
        return this.request(path, { ...options, retry: false });
      } catch {
        writeTokens(null);
      }
    }

    if (!res.ok || json.success === false) {
      const err = new Error(json?.error?.message || res.statusText || 'Request failed');
      err.code = json?.error?.code;
      err.details = json?.error?.details;
      err.status = res.status;
      throw err;
    }
    return json;
  },

  get(path) {
    return this.request(path);
  },
  post(path, body) {
    return this.request(path, { method: 'POST', body });
  },
  patch(path, body) {
    return this.request(path, { method: 'PATCH', body });
  },
  put(path, body) {
    return this.request(path, { method: 'PUT', body });
  },
  delete(path) {
    return this.request(path, { method: 'DELETE' });
  },
};

export function mediaUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}
