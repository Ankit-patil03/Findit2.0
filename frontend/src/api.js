// One place for every call to the backend.
// It adds the login token, sends JSON or form-data, and turns error replies into normal JS errors.

const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'findit_token';
const USER_KEY = 'findit_user';

// ---------- Saved login (kept in the browser so a page refresh doesn't log you out) ----------
export const getToken = () => localStorage.getItem(TOKEN_KEY);

export function getSavedUser() {
  if (!getToken()) return null;
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ---------- The request helper ----------
// api('/api/items')                                  -> GET
// api('/api/auth/login', { method: 'POST', body })   -> JSON body
// api('/api/items', { method: 'POST', form })        -> FormData (for photo uploads)
export async function api(path, { method = 'GET', body, form } = {}) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload;
  if (form) {
    payload = form; // the browser sets the multipart Content-Type itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new Error('Cannot reach the server. Is the backend running?');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    // Token expired or invalid: forget it and tell the app to go back to the login page
    if (res.status === 401 && token) {
      clearSession();
      window.dispatchEvent(new Event('auth:logout'));
    }
    // The backend sends either { error: "..." } or { errors: ["...", "..."] }
    throw new Error(data?.error || data?.errors?.join(', ') || `Request failed (${res.status})`);
  }

  return data;
}

// Image paths come back as "/uploads/abc.jpg"; the browser needs the full backend address
export const imageUrl = (path) => (path ? `${API_URL}${path}` : null);
