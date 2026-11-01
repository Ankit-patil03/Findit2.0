import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CardGridSkeleton, EmptyState } from '../components/Feedback';
import ItemCard from '../components/ItemCard';
import { useApi } from '../hooks/useApi';

// What each status means for the user
const TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending', help: 'Waiting for a match. We check every new report against these.' },
  { value: 'matched', label: 'Matched', help: 'An admin verified a match. Contact the admin to arrange the handover.' },
  { value: 'resolved', label: 'Resolved', help: 'The item has been handed back. Case closed.' },
];

// The logged-in user's full report history with status (Objective 3).
export default function MyReports() {
  const { data, loading, error } = useApi('/api/items/mine');
  const [tab, setTab] = useState('all');

  const countOf = (status) => data?.filter((item) => status === 'all' || item.status === status).length ?? 0;
  const shown = data?.filter((item) => tab === 'all' || item.status === tab) ?? [];
  const help = TABS.find((t) => t.value === tab).help;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="page-title">My reports</h1>
          <p className="text-slate-500">Everything you've reported, and where it stands.</p>
        </div>
        <Link to="/report" className="btn-primary hidden sm:inline-flex">
          <Plus className="h-4 w-4" /> New report
        </Link>
      </div>

      {/* Status tabs with counts. overflow-x-auto lets them scroll sideways on small phones */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`chip shrink-0 ${tab === t.value ? 'chip-active' : ''}`}
          >
            {t.label}
            <span className={`rounded-full px-1.5 text-xs ${tab === t.value ? 'bg-white/20' : 'bg-slate-100'}`}>
              {countOf(t.value)}
            </span>
          </button>
        ))}
      </div>
      {help && <p className="rounded-xl bg-brand-50 px-4 py-2.5 text-sm text-brand-800">{help}</p>}

      {loading && <CardGridSkeleton count={4} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />}
      {error && <p className="error-box">{error}</p>}
      {data && shown.length === 0 && (
        data.length === 0 ? (
          <EmptyState icon={ClipboardList} title="You haven't reported anything yet"
            text="Lost or found something? Report it and we'll look for a match."
            action={{ to: '/report', label: 'Report an item' }} />
        ) : (
          <EmptyState icon={ClipboardList} title="No reports with this status" />
        )
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
