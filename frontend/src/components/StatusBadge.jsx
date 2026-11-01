// Small coloured label for an item's status (pending / matched / resolved)
// or for its type (lost / found).
const STYLES = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  matched: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  // match statuses (admin page)
  confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rejected: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  lost: 'bg-rose-500 text-white ring-rose-500',
  found: 'bg-emerald-500 text-white ring-emerald-500',
};

export default function StatusBadge({ value, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${
        STYLES[value] || 'bg-slate-50 text-slate-700 ring-slate-600/20'
      } ${className}`}
    >
      {value}
    </span>
  );
}
