/**
 * Decouples the Header trigger from the palette: anything can ask the palette to
 * open by dispatching this event, and the globally-mounted CommandPalette
 * listens for it (alongside the ⌘K / Ctrl-K shortcut).
 */
export const OPEN_CMDK_EVENT = 'flygaca:open-cmdk';

export function openCommandPalette(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_CMDK_EVENT));
}
