import { ArrowRight, Bell, CircleCheck, Handshake, Hourglass, Inbox, PackageSearch, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CardGridSkeleton, EmptyState, ListSkeleton } from '../components/Feedback';
import ItemCard from '../components/ItemCard';
import { useAuth } from '../context/useAuth';
import { useApi } from '../hooks/useApi';
import { timeAgo } from '../utils';

// Home dashboard (flowchart: "Home dashboard - recent items, notifications").
// From here the user either reports an item or goes to browse/search.
export default function Home() {
  const { user } = useAuth();
  const items = useApi('/api/items?limit=6');
  const notifications = useApi('/api/notifications');
  const mine = useApi('/api/items/mine');

  // Count the user's own reports per status for the stats row
  const count = (status) => mine.data?.filter((i) => i.status === status).length ?? '–';

  return (
    <div className="space-y-8">
      {/* Welcome header with the user's stats */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-6 text-white shadow-lg shadow-brand-600/20 sm:p-8">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-brand-200">Welcome back,</p>
          <h1 className="text-3xl font-bold tracking-tight">{user.name.split(' ')[0]} 👋</h1>
          <div className="mt-6 grid grid-cols-3 gap-3 sm:max-w-md">
            <Stat icon={Hourglass} label="Pending" value={count('pending')} />
            <Stat icon={Handshake} label="Matched" value={count('matched')} />
            <Stat icon={CircleCheck} label="Resolved" value={count('resolved')} />
          </div>
        </div>
      </section>

      {/* The two main actions */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ActionCard
          to="/report?type=lost"
          icon={Search}
          title="I lost something"
          text="Report it and we'll look for a match"
          tone="bg-rose-50 text-rose-600 ring-rose-100 hover:ring-rose-300"
        />
        <ActionCard
          to="/report?type=found"
          icon={PackageSearch}
          title="I found something"
          text="Help it get back to its owner"
          tone="bg-emerald-50 text-emerald-600 ring-emerald-100 hover:ring-emerald-300"
        />
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Recent items (2/3 of the width on large screens) */}
        <section className="lg:col-span-2">
          <SectionHeader title="Recently reported" linkTo="/browse" linkText="Browse all" />
          {items.loading && <CardGridSkeleton count={6} />}
          {items.error && <p className="error-box">{items.error}</p>}
          {items.data?.length === 0 && (
            <EmptyState icon={Inbox} title="No items reported yet" text="Be the first to report a lost or found item." />
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {items.data?.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {/* Latest notifications (1/3 of the width) */}
        <section>
          <SectionHeader title="Notifications" linkTo="/notifications" linkText="See all" />
          {notifications.loading && <ListSkeleton rows={3} />}
          {notifications.error && <p className="error-box">{notifications.error}</p>}
          {notifications.data?.length === 0 && (
            <EmptyState icon={Bell} title="All quiet" text="You'll be notified here when a match is verified." />
          )}
          {notifications.data?.length > 0 && (
            <ul className="card divide-y divide-slate-100 overflow-hidden">
              {notifications.data.slice(0, 5).map((n) => (
                <li key={n.id} className={`flex gap-3 p-4 text-sm ${n.is_read ? '' : 'bg-brand-50/60'}`}>
                  <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${n.is_read ? 'bg-slate-100 text-slate-500' : 'bg-brand-100 text-brand-600'}`}>
                    <Bell className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-slate-800">{n.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{timeAgo(n.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
      <Icon className="h-4 w-4 text-brand-200" />
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs text-brand-200">{label}</p>
    </div>
  );
}

function ActionCard({ to, icon: Icon, title, text, tone }) {
  return (
    <Link to={to} className={`group card flex items-center gap-4 p-5 ring-2 ring-inset transition hover:shadow-md ${tone}`}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white shadow-sm">
        <Icon className="h-6 w-6" />
      </span>
      <div className="flex-1">
        <p className="text-lg font-bold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{text}</p>
      </div>
      <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
    </Link>
  );
}

function SectionHeader({ title, linkTo, linkText }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <Link to={linkTo} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
        {linkText}
      </Link>
    </div>
  );
}
