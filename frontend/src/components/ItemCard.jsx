import { Calendar, ImageOff, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { imageUrl } from '../api';
import { formatDate } from '../utils';
import StatusBadge from './StatusBadge';

// One reported item as a clickable card: photo, lost/found label, name, place, date, status.
// Used on the dashboard, Browse and My Reports.
export default function ItemCard({ item }) {
  return (
    <Link
      to={`/items/${item.id}`}
      // "group" lets the photo react when the whole card is hovered (group-hover: below)
      className="group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
        {item.image_url ? (
          <img
            src={imageUrl(item.image_url)}
            alt={item.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
            <ImageOff className="h-7 w-7" />
            <span className="text-xs">No photo</span>
          </div>
        )}
        {/* Lost / Found label on top of the photo */}
        <StatusBadge value={item.type} className="absolute left-2 top-2 shadow-sm" />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h3 className="truncate font-semibold text-slate-900">{item.name}</h3>
        <p className="text-xs font-medium text-brand-600">{item.category}</p>
        <p className="flex items-center gap-1 truncate text-xs text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{item.location}</span>
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(item.date_occurred)}
          </p>
          <StatusBadge value={item.status} />
        </div>
      </div>
    </Link>
  );
}
