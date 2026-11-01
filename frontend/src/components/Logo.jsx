import { ScanSearch } from 'lucide-react';

// The FindIt logo: an icon in a rounded square + the name
export default function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`grid place-items-center rounded-xl bg-brand-600 text-white shadow-sm ${big ? 'h-11 w-11' : 'h-8 w-8'}`}>
        <ScanSearch className={big ? 'h-6 w-6' : 'h-[18px] w-[18px]'} strokeWidth={2.4} />
      </span>
      <span className={`font-extrabold tracking-tight text-slate-900 ${big ? 'text-3xl' : 'text-xl'}`}>
        Find<span className="text-brand-600">It</span>
      </span>
    </span>
  );
}
