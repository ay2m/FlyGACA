import { useTranslation } from 'react-i18next';
import { THEMES, useTheme, type Theme } from '@/lib/theme';

/** Cycles the three themes: Falcon (default dark) → Cockpit / Night-Ops (amber
 *  dark) → Day (ivory reading) → back. A single button that shows the current
 *  theme's glyph — a crescent moon for the two dark themes, a sun for Day — and
 *  whose label names the theme it will switch to next. The icon inherits
 *  `currentColor`, so it adopts each theme's accent. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [theme, setTheme] = useTheme();

  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] as Theme;
  const label = t('common.switchToTheme', { name: t(`common.themeNames.${next}`) });

  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      title={label}
      onClick={() => setTheme(next)}
    >
      {theme === 'day' ? (
        // Sun — the light reading theme is active.
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Crescent moon — a dark theme (Falcon or Cockpit) is active.
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
