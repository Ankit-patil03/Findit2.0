import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Browse from './pages/Browse';
import Home from './pages/Home';
import ItemDetails from './pages/ItemDetails';
import Login from './pages/Login';
import MyReports from './pages/MyReports';
import Notifications from './pages/Notifications';
import ReportItem from './pages/ReportItem';
import Signup from './pages/Signup';
import AdminItems from './pages/admin/AdminItems';
import AdminMatches from './pages/admin/AdminMatches';

// Every page of the app and the address (path) it lives at.
// Routes nested inside another Route only open if the outer one allows it.
export default function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Logged-in pages, all shown inside the Layout (navbar + page) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportItem />} />
          <Route path="/browse" element={<Browse />} />
          {/* ":id" is a placeholder: /items/12 opens item 12 */}
          <Route path="/items/:id" element={<ItemDetails />} />
          <Route path="/my-reports" element={<MyReports />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Admin-only pages */}
          <Route element={<ProtectedRoute adminOnly />}>
            <Route path="/admin" element={<AdminMatches />} />
            <Route path="/admin/items" element={<AdminItems />} />
          </Route>
        </Route>
      </Route>

      {/* Any unknown address goes to the home page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
