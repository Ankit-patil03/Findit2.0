import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import AuthLayout from '../components/AuthLayout';

export default function Signup() {
  const { user, signup } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // signup() logs the new user in, so they land straight on the home page
  if (user) return <Navigate to="/" replace />;

  // One change handler for all three inputs, using each input's "name"
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="It takes less than a minute.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="error-box">{error}</p>}
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" name="name" className="input" required autoComplete="name" placeholder="Your name"
            value={form.name} onChange={update} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" placeholder="you@college.edu"
            value={form.email} onChange={update} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" required
            minLength={6} autoComplete="new-password" value={form.password} onChange={update} />
          <p className="mt-1 text-xs text-slate-500">At least 6 characters</p>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account? <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">Log in</Link>
      </p>
    </AuthLayout>
  );
}
