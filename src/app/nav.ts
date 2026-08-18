export interface NavItem {
  to: string;
  key: string;
}

// The signed-in daily-use pages, surfaced in the mobile "More" sheet (and the
// desktop account menu) so a returning pilot doesn't have to dig through /account.
export const SIGNED_IN: NavItem[] = [
  { to: '/dashboard', key: 'account.dashboard' },
  { to: '/logbook', key: 'account.logbook' },
  { to: '/records', key: 'account.records' },
  { to: '/currency', key: 'account.currency' },
  { to: '/settings', key: 'account.settings' },
];

// Primary top-level destinations. Every route here is live (the legacy→React
// rebuild is complete — see MIGRATION.md); when signed in, /account renders as a
// dropdown (AccountMenu) surfacing the daily pages.
export const NAV: NavItem[] = [
  { to: '/library', key: 'nav.library' },
  { to: '/chat', key: 'nav.captainAdel' },
  { to: '/tools', key: 'nav.tools' },
  { to: '/learn', key: 'nav.learn' },
  { to: '/pricing', key: 'nav.pricing' },
  { to: '/about', key: 'nav.about' },
  { to: '/account', key: 'nav.account' },
];

// The four destinations surfaced as quick-access tabs in the mobile bottom dock;
// everything else falls into the dock's "More" sheet. Adjust this set to retune
// which routes get a dedicated tab.
const PRIMARY_KEYS = new Set(['/library', '/chat', '/tools', '/learn']);
export const PRIMARY = NAV.filter((item) => PRIMARY_KEYS.has(item.to));
export const MORE = NAV.filter((item) => !PRIMARY_KEYS.has(item.to));

// Per-route label overrides for the compact dock tabs, where the full nav label
// would truncate in the 5-up row ("Captain Adel" → "Adel").
export const DOCK_LABEL: Record<string, string> = { '/chat': 'nav.captainShort' };
