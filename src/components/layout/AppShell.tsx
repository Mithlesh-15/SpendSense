import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: 'Home' },
  { path: '/add', label: 'Add', icon: 'Plus' },
  { path: '/upload', label: 'Upload', icon: 'Scan' },
  { path: '/transactions', label: 'Transactions', icon: 'List' },
  { path: '/settings', label: 'Settings', icon: 'Gear' },
] as const;

export function AppShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.15),transparent_45%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.13),transparent_40%)]" />
      <div className="relative mx-auto max-w-5xl px-4 pb-28 pt-4 sm:px-6">
        <header className="mb-5 rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">SpendSense</h1>
              <p className="mt-1 text-sm text-slate-600">
                Analyze your spending entirely on this device.
              </p>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Offline &amp; Private
            </span>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur">
        <ul className="mx-auto flex max-w-5xl items-center justify-around">
          {navItems.map((item) => (
            <li key={item.path} className="w-full">
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  [
                    'flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition',
                    isActive ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-700',
                  ].join(' ')
                }
              >
                <span className="text-xs uppercase tracking-wide">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
