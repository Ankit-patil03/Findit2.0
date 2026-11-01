import { Bell, ClipboardList, House, LogOut, Plus, Search, ShieldCheck } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Logo from './Logo';

// NavLink knows when its page is open, so the current page's link gets highlighted
const linkClass = ({ isActive }) =>
  `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

// Top bar. On wide screens it holds all the links; on phones only the logo and a few icons,
// because the main links live in the bottom tab bar (BottomNav).
// `unread` comes from Layout so the count is only fetched once for both bars.
export default function Navbar({ unread }) {
  const { user, logout } = useAuth();
  const isAdmin = user.role === 'admin';

  const links = [
    { to: '/', label: 'Home', icon: House, end: true },
    { to: '/browse', label: 'Browse', icon: Search },
    { to: '/report', label: 'Report', icon: Plus },
    { to: '/my-reports', label: 'My Reports', icon: ClipboardList },
    ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    // sticky + backdrop-blur: the bar stays on top while scrolling, with a frosted-glass look
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-4">
        <Link to="/" className="mr-4">
          <Logo />
        </Link>

        {/* Wide screens: links in a row. "md:" means "from medium screen width upwards" */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 hidden text-sm text-slate-500 lg:inline">Hi, {user.name.split(' ')[0]}</span>

          {/* Phones: the admin page isn't in the bottom bar, so it gets an icon here */}
          {isAdmin && (
            <NavLink to="/admin" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Admin">
              <ShieldCheck className="h-5 w-5" />
            </NavLink>
          )}

          {/* Wide screens: the bell (phones have it in the bottom bar) */}
          <Link to="/notifications" className="relative hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 md:block"
            aria-label={`Notifications (${unread} unread)`}>
            <Bell className="h-5 w-5" />
            <UnreadBadge count={unread} />
          </Link>

          <button onClick={logout} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Log out" title="Log out">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </nav>
    </header>
  );
}

// Red number on the bell; hidden when there's nothing unread
export function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}
