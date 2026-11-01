import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/useAuth';

export default function Login() {
  const { user, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Once logged in, go back to the page the user originally asked for (or home)
  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  async function handleSubmit(e) {
    e.preventDefault(); // stop the browser from reloading the page
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to report and track your items.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="error-box">{error}</p>}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" required autoComplete="email"
            placeholder="you@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="input" required autoComplete="current-password"
            placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here? <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
