import { ArrowLeft, Calendar, Clock, ImageOff, MapPin, Tag } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { imageUrl } from '../api';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/useAuth';
import { useApi } from '../hooks/useApi';
import { formatDate, timeAgo } from '../utils';

// One item in full (flowchart: "View item details").
// The address is /items/12 - useParams() reads the 12 from the ":id" in the route.
export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: item, loading, error } = useApi(`/api/items/${id}`);

  if (loading) return <div className="skeleton mx-auto h-96 max-w-4xl rounded-2xl" />;
  if (error) return <p className="error-box">{error}</p>;

  const isLost = item.type === 'lost';
  const isMine = item.user_id === user.id;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* navigate(-1) = the browser's Back button, so Browse keeps its filters */}
      <button type="button" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="card overflow-hidden md:grid md:grid-cols-2">
        <div className="relative flex min-h-64 items-center justify-center bg-slate-100">
          {item.image_url ? (
            <img src={imageUrl(item.image_url)} alt={item.name} className="h-full max-h-[28rem] w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <ImageOff className="h-10 w-10" />
              <span className="text-sm">No photo</span>
            </div>
          )}
          <StatusBadge value={item.type} className="absolute left-3 top-3 px-3 py-1 text-sm shadow" />
        </div>

        <div className="space-y-5 p-6">
          <div>
            <StatusBadge value={item.status} />
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{item.name}</h1>
          </div>

          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Detail icon={Tag} label="Category" value={item.category} />
            <Detail icon={MapPin} label={isLost ? 'Lost at' : 'Found at'} value={item.location} />
            <Detail icon={Calendar} label={isLost ? 'Lost on' : 'Found on'} value={formatDate(item.date_occurred)} />
            <Detail icon={Clock} label="Reported" value={timeAgo(item.created_at)} />
          </dl>

          {item.description && (
            <div>
              <p className="text-sm font-medium text-slate-500">Description</p>
              <p className="mt-1 whitespace-pre-line text-slate-700">{item.description}</p>
            </div>
          )}
        </div>
      </div>

      <NextStep item={item} isMine={isMine} />
    </div>
  );
}

function Detail({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-xs text-slate-500">{label}</dt>
        <dd className="truncate font-medium text-slate-900">{value}</dd>
      </div>
    </div>
  );
}

// What the viewer can do next. People never contact each other directly:
// they file the opposite report, the matching engine links the two, and an admin verifies.
function NextStep({ item, isMine }) {
  if (isMine) {
    return <p className="card p-4 text-sm text-slate-600">You reported this item. Track it under My Reports.</p>;
  }
  if (item.status !== 'pending') {
    return (
      <p className="card p-4 text-sm text-slate-600">
        This item has already been matched with someone and is being handled by an admin.
      </p>
    );
  }

  const isLost = item.type === 'lost';
  // Open the report form with the opposite type and this item's details already filled in
  const prefill = {
    type: isLost ? 'found' : 'lost',
    fields: { name: item.name, category: item.category, location: item.location },
  };

  return (
    <div className={`card flex flex-col gap-4 p-5 sm:flex-row sm:items-center ${isLost ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-rose-50 ring-1 ring-rose-200'}`}>
      <div className="flex-1">
        <p className="font-semibold text-slate-900">{isLost ? 'Did you find this item?' : 'Is this yours?'}</p>
        <p className="mt-1 text-sm text-slate-600">
          {isLost
            ? 'Report it as found. We will check it against this report and an admin will arrange the handover.'
            : 'Report it as lost. We will check it against this report and an admin will verify it before the handover.'}
        </p>
      </div>
      <Link to="/report" state={{ prefill }} className="btn-primary shrink-0">
        {isLost ? 'I found this' : 'This is mine'}
      </Link>
    </div>
  );
}
