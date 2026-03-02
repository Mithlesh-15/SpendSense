import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

interface FabAction {
  id: 'manual' | 'receipt';
  label: string;
  icon: string;
  description: string;
  path: '/add' | '/upload';
}

const ACTIONS: FabAction[] = [
  {
    id: 'manual',
    label: 'Add Manually',
    icon: '✍',
    description: 'Enter amount, category, and note',
    path: '/add',
  },
  {
    id: 'receipt',
    label: 'Upload Receipt',
    icon: '📄',
    description: 'Scan and extract expense locally',
    path: '/upload',
  },
];

export function FloatingAddButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const firstActionRef = useRef<HTMLButtonElement | null>(null);
  const actionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => firstActionRef.current?.focus(), 120);
    return () => window.clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [open]);

  const onSelect = async (path: FabAction['path']) => {
    if (isNavigating) return;
    setIsNavigating(true);
    setOpen(false);
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    navigate(path);
    setIsNavigating(false);
  };

  const onActionKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = (index + 1) % ACTIONS.length;
      actionRefs.current[next]?.focus();
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const previous = (index - 1 + ACTIONS.length) % ACTIONS.length;
      actionRefs.current[previous]?.focus();
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-20 right-4 z-40">
      {open && (
        <button
          type="button"
          aria-label="Close action menu"
          onClick={() => setOpen(false)}
          className="pointer-events-auto fixed inset-0 z-30 bg-slate-900/5 backdrop-blur-[1px]"
        />
      )}

      <div className="relative z-40 flex flex-col items-end gap-2">
        <div
          id="fab-action-menu"
          className={[
            'flex flex-col gap-2 transition-all duration-200 ease-out',
            open
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none translate-y-2 scale-95 opacity-0',
          ].join(' ')}
          role="menu"
          aria-label="Add expense options"
        >
          {ACTIONS.map((action, index) => (
            <button
              key={action.id}
              ref={(el) => {
                actionRefs.current[index] = el;
                if (index === 0) firstActionRef.current = el;
              }}
              type="button"
              role="menuitem"
              onClick={() => onSelect(action.path)}
              onKeyDown={(event) => onActionKeyDown(event, index)}
              className="w-56 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-fintech transition hover:border-sky-200 hover:bg-sky-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg">
                  {action.icon}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                  <p className="text-xs text-slate-500">{action.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls="fab-action-menu"
          onClick={() => setOpen((prev) => !prev)}
          className={[
            'pointer-events-auto rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition',
            open ? 'scale-95 bg-sky-700' : 'hover:bg-sky-700',
          ].join(' ')}
        >
          {open ? 'Close' : '+ Add Expense'}
        </button>
      </div>
    </div>
  );
}
