import { useEffect, useState } from 'react';
import { api, clearSession, getSavedUser, saveSession } from '../api';
import { AuthContext } from './useAuth';

// Wraps the whole app (see main.jsx) so every page can see the logged-in user.
export function AuthProvider({ children }) {
  // Start with whoever was saved in the browser, so a refresh keeps you logged in
  const [user, setUser] = useState(getSavedUser);

  // api.js fires this event when the backend says the token is no longer valid
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  async function login(email, password) {
    const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    saveSession(data.token, data.user);
    setUser(data.user);
  }

  // The backend's signup doesn't return a token, so log in straight after creating the account
  async function signup(name, email, password) {
    await api('/api/auth/signup', { method: 'POST', body: { name, email, password } });
    await login(email, password);
  }

  function logout() {
    clearSession();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}
