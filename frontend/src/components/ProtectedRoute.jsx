import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

// Guards a group of routes.
// Not logged in -> go to /login (and remember where you were trying to go).
// adminOnly and not an admin -> go to the home page.
export default function ProtectedRoute({ adminOnly = false }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;

  // <Outlet /> means "show whichever child route matched"
  return <Outlet />;
}
