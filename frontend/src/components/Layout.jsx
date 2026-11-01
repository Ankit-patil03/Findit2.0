import { Outlet } from 'react-router-dom';
import { useUnreadCount } from '../hooks/useUnreadCount';
import BottomNav from './BottomNav';
import Navbar from './Navbar';

// The frame around every logged-in page: top bar, the page itself, and (on phones) the bottom tab bar
export default function Layout() {
  // Fetched once here and passed to both bars, instead of each bar polling the backend separately
  const unread = useUnreadCount();

  return (
    <>
      <Navbar unread={unread} />
      {/* Extra bottom padding on phones so the tab bar never covers the end of the page */}
      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-10">
        <Outlet />
      </main>
      <BottomNav unread={unread} />
    </>
  );
}
