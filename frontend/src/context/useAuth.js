import { createContext, useContext } from 'react';

// Shared "who is logged in" data. AuthProvider fills it in; any component reads it with useAuth().
export const AuthContext = createContext(null);

// Usage inside a component: const { user, login, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}
