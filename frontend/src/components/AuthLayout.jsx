import { Camera, ShieldCheck, Sparkles } from 'lucide-react';
import Logo from './Logo';

const FEATURES = [
  { icon: Camera, text: 'Report lost or found items with a photo' },
  { icon: Sparkles, text: 'Automatic matching of lost and found reports' },
  { icon: ShieldCheck, text: 'Every match verified by an admin' },
];

// Login and Signup share this screen: a coloured brand panel (wide screens only) + the form card
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel, hidden on phones ("hidden lg:flex") */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 p-12 text-white lg:flex">
        {/* Soft decorative circles */}
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/5" />

        <div className="relative flex items-center gap-2 text-2xl font-extrabold">FindIt</div>
        <div className="relative">
          <h2 className="text-4xl font-bold leading-tight">
            Lost it on campus?
            <br />
            Let's find it.
          </h2>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-brand-100">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5 text-white" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-brand-200">Smart Lost &amp; Found Management System</p>
      </aside>

      {/* Form side */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <Logo size="lg" />
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
