import { useEffect, useState } from 'react';
import { MapPin, Search, SearchX, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CardGridSkeleton, EmptyState } from '../components/Feedback';
import ItemCard from '../components/ItemCard';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';

// The filter names match the backend's query parameters for GET /api/items
const FILTER_KEYS = ['type', 'category', 'location', 'q', 'from', 'to'];
const NO_FILTERS = Object.fromEntries(FILTER_KEYS.map((key) => [key, '']));

// Builds "type=found&category=Keys" from the filters, skipping empty ones
function toQueryString(filters) {
  const params = new URLSearchParams();
  FILTER_KEYS.forEach((key) => filters[key].trim() && params.set(key, filters[key].trim()));
  return params.toString();
}

// Browse and search all open reports (flowchart: "Browse listings - filter by category, location").
// The filters are also kept in the address bar (/browse?type=found&category=Keys), so the
// search survives a refresh, can be shared as a link, and is still there when you come back
// from an item's details page.
export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() =>
    Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) || '']))
  );

  // Wait until the user stops typing before searching
  const query = toQueryString(useDebounce(filters, 400));
  const items = useApi(`/api/items?${query}`);
  const categories = useApi('/api/items/categories');

  // Copy the filters into the address bar (only when they actually changed)
  useEffect(() => {
    if (query !== searchParams.toString()) setSearchParams(query, { replace: true });
  }, [query, searchParams, setSearchParams]);

  const update = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const hasFilters = FILTER_KEYS.some((key) => filters[key]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">Browse items</h1>
        <p className="text-slate-500">Search everything reported on campus.</p>
      </div>

      <div className="card space-y-3 p-4">
        {/* Big search box with an icon inside it */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input name="q" className="input pl-11" placeholder="Search by name or description"
            value={filters.q} onChange={update} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input name="location" className="input pl-10" placeholder="Location, e.g. library"
              value={filters.location} onChange={update} />
          </div>
          <select name="category" className="input" value={filters.category} onChange={update}>
            <option value="">All categories</option>
            {categories.data?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input name="from" type="date" className="input" title="From date" aria-label="From date"
            max={filters.to || undefined} value={filters.from} onChange={update} />
          <input name="to" type="date" className="input" title="To date" aria-label="To date"
            min={filters.from || undefined} value={filters.to} onChange={update} />
        </div>

        {/* All / Lost / Found + clear */}
        <div className="flex flex-wrap items-center gap-2">
          {[['', 'All'], ['lost', 'Lost'], ['found', 'Found']].map(([value, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => setFilters({ ...filters, type: value })}
              className={`chip ${filters.type === value ? 'chip-active' : ''}`}
            >
              {label}
            </button>
          ))}
          {hasFilters && (
            <button type="button" className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
              onClick={() => setFilters(NO_FILTERS)}>
              <X className="h-4 w-4" /> Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {items.error && <p className="error-box">{items.error}</p>}
      {items.loading && <CardGridSkeleton count={8} className="grid-cols-2 md:grid-cols-3 lg:grid-cols-4" />}
      {items.data && (
        <p className="text-sm font-medium text-slate-500">
          {items.data.length} item{items.data.length === 1 ? '' : 's'} found
        </p>
      )}
      {items.data?.length === 0 && (
        <EmptyState icon={SearchX} title="Nothing matches these filters" text="Try a different word, or remove some filters." />
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {items.data?.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
