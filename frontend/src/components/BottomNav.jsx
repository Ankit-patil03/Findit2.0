import { Bell, ClipboardList, House, Plus, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { UnreadBadge } from './Navbar';

// Phone-only tab bar fixed to the bottom of the screen, like a native app.
// "md:hidden" hides it on wide screens, where the top Navbar shows the links instead.
export default function BottomNav({ unread }) {
  const tab = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition ${
      isActive ? 'text-brand-600' : 'text-slate-500'
    }`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 backdrop-blur-lg md:hidden"
      // keep the tabs above the iPhone home bar
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-md items-end px-2">
        <NavLink to="/" end className={tab}>
          <House className="h-6 w-6" />
          Home
        </NavLink>
        <NavLink to="/browse" className={tab}>
          <Search className="h-6 w-6" />
          Browse
        </NavLink>

        {/* The main action: a big raised + button in the middle */}
        <NavLink to="/report" className="flex flex-1 flex-col items-center gap-0.5 pb-2 text-[11px] font-medium text-slate-600" aria-label="Report an item">
          <span className="-mt-5 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-4 ring-white">
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </span>
          Report
        </NavLink>

        <NavLink to="/my-reports" className={tab}>
          <ClipboardList className="h-6 w-6" />
          My Reports
        </NavLink>
        <NavLink to="/notifications" className={tab}>
          <span className="relative">
            <Bell className="h-6 w-6" />
            <UnreadBadge count={unread} />
          </span>
          Alerts
        </NavLink>
      </div>
    </nav>
  );
}
