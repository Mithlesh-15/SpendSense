import { useTheme, type ThemeMode } from '../../context/ThemeContext';

const options: Array<{ mode: ThemeMode; label: string; icon: string }> = [
  { mode: 'light', label: 'Light', icon: '☀' },
  { mode: 'dark', label: 'Dark', icon: '☾' },
  { mode: 'system', label: 'System', icon: '◐' },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className="inline-flex rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900/80"
    >
      {options.map((option) => {
        const selected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setMode(option.mode)}
            className={[
              'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
              selected
                ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white',
            ].join(' ')}
          >
            <span aria-hidden="true">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
