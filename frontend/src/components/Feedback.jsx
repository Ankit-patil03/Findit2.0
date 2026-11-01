import { Link } from 'react-router-dom';

// Small shared pieces for "loading" and "nothing here" states, so every page looks the same.

// Grey card-shaped placeholders while a list of items loads
export function CardGridSkeleton({ count = 6, className = 'grid-cols-2 md:grid-cols-3' }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="skeleton aspect-[4/3] rounded-none" />
          <div className="space-y-2 p-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Grey line placeholders while a list (e.g. notifications) loads
export function ListSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <div className="skeleton h-4 w-5/6" />
          <div className="skeleton h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}

// "Nothing here yet" box with an icon, a message and an optional button
export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon className="h-7 w-7" />
      </span>
      <p className="mt-4 font-semibold text-slate-900">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
      {action && (
        <Link to={action.to} className="btn-primary mt-5">
          {action.label}
        </Link>
      )}
    </div>
  );
}
