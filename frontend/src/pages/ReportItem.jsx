import { CircleCheck, Lock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import CameraCapture from '../components/CameraCapture';
import { useApi } from '../hooks/useApi';

// Today as "YYYY-MM-DD" in the user's own timezone (en-CA happens to use that format)
const today = () => new Date().toLocaleDateString('en-CA');

const EMPTY_FORM = { name: '', category: '', location: '', date_occurred: '', description: '', proof_details: '' };

// Each visit to /report gets a fresh form. Without the key, clicking "Report" in the navbar
// while already on this page would keep the old form instead of starting again.
export default function ReportPage() {
  const location = useLocation();
  return <ReportItem key={location.key} />;
}

// Report a lost or found item (flowchart: fill details -> photo -> submit -> matching engine).
// Opened as /report?type=lost or /report?type=found from the dashboard,
// or from an item's details page with some fields already filled in ("This is mine").
function ReportItem() {
  const [searchParams] = useSearchParams();
  const prefill = useLocation().state?.prefill;
  const [type, setType] = useState(
    prefill?.type || (searchParams.get('type') === 'found' ? 'found' : 'lost')
  );
  const [form, setForm] = useState({ ...EMPTY_FORM, date_occurred: today(), ...prefill?.fields });
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // the saved report, once submitted

  // The category list comes from the backend so both sides always agree
  const categories = useApi('/api/items/categories');

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // FormData instead of JSON, because a photo file can't go inside JSON.
    // The field names match what the backend reads from req.body / req.file.
    const data = new FormData();
    data.append('type', type);
    Object.entries(form).forEach(([key, value]) => data.append(key, value.trim()));
    if (photo) data.append('image', photo);

    try {
      setResult(await api('/api/items', { method: 'POST', form: data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function reportAnother() {
    setForm({ ...EMPTY_FORM, date_occurred: today() });
    setPhoto(null);
    setResult(null);
  }

  if (result) return <SubmittedMessage report={result} onReportAnother={reportAnother} />;

  const isLost = type === 'lost';

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="page-title">Report an item</h1>
      <p className="mb-5 text-slate-500">The more detail you give, the better the matching works.</p>

      <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6">
        {/* Lost / Found switch */}
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          {['lost', 'found'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl py-2.5 text-sm font-semibold transition ${
                type === t
                  ? t === 'lost' ? 'bg-rose-500 text-white shadow' : 'bg-emerald-500 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              I {t} something
            </button>
          ))}
        </div>

        {error && <p className="error-box">{error}</p>}

        <div>
          <label className="label" htmlFor="name">Item name</label>
          <input id="name" name="name" className="input" required maxLength={100}
            placeholder="e.g. Blue water bottle" value={form.name} onChange={update} />
        </div>

        <div>
          <label className="label" htmlFor="category">Category</label>
          <select id="category" name="category" className="input" required
            value={form.category} onChange={update}>
            <option value="">Choose a category</option>
            {categories.data?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {categories.error && <p className="mt-1 text-sm text-red-600">{categories.error}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="location">
              {isLost ? 'Where did you lose it?' : 'Where did you find it?'}
            </label>
            <input id="location" name="location" className="input" required maxLength={100}
              placeholder="e.g. Central Library" value={form.location} onChange={update} />
          </div>
          <div>
            <label className="label" htmlFor="date_occurred">
              {isLost ? 'When did you lose it?' : 'When did you find it?'}
            </label>
            <input id="date_occurred" name="date_occurred" type="date" className="input" required
              max={today()} value={form.date_occurred} onChange={update} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="description">Description (optional)</label>
          <textarea id="description" name="description" className="input" rows={3} maxLength={500}
            placeholder="Colour, brand, stickers, anything that helps identify it"
            value={form.description} onChange={update} />
        </div>

        {/* Private field: saved, but never shown publicly. Only the admin sees it when checking a match. */}
        <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
          <label className="label flex items-center gap-1.5" htmlFor="proof_details">
            <Lock className="h-4 w-4 text-amber-600" />
            {isLost ? 'Proof of ownership' : 'Private details'} (optional)
          </label>
          <textarea id="proof_details" name="proof_details" className="input" rows={2} maxLength={500}
            placeholder={isLost
              ? 'Something only the owner would know, e.g. "library card inside in the name A. Sharma"'
              : 'Details you saw but don\'t want public, e.g. "has an ID card inside"'}
            value={form.proof_details} onChange={update} />
          <p className="mt-1.5 text-xs text-amber-800">
            Only the admin can see this. It helps them confirm the real owner before handing the item over.
          </p>
        </div>

        <div>
          <p className="label">Photo (optional)</p>
          <CameraCapture file={photo} onChange={setPhoto} />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit report'}
        </button>
      </form>
    </div>
  );
}

// Shown after submitting: tells the user whether the matching engine found anything
// (flowchart: "Match found?" -> admin verifies, or "Save & await match").
function SubmittedMessage({ report, onReportAnother }) {
  const count = report.matches_found;
  return (
    <div className="card mx-auto max-w-xl space-y-4 p-8 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
        <CircleCheck className="h-9 w-9" />
      </span>
      <h1 className="text-2xl font-bold text-slate-900">Report submitted</h1>
      <p className="text-slate-600">
        Your {report.type} item <span className="font-semibold text-slate-900">"{report.name}"</span> has been saved.
      </p>
      {count > 0 ? (
        <p className="flex items-start gap-2 rounded-xl bg-brand-50 p-4 text-left text-sm text-brand-800">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
          We found {count} possible match{count > 1 ? 'es' : ''}. An admin will review it, and you'll get a
          notification once it's verified.
        </p>
      ) : (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
          No match yet. We'll keep checking new reports against yours.
        </p>
      )}
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <button type="button" className="btn-primary" onClick={onReportAnother}>Report another</button>
        <Link to="/" className="btn-secondary">Back to home</Link>
      </div>
    </div>
  );
}
