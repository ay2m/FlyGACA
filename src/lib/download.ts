/**
 * Client-side file download via a transient blob URL — the one idiom behind
 * every "export" button (logbook CSV/JSON, currency ICS, cohort CSV, chat
 * transcript). DOM-touching, so it lives in lib (like `scrollLock`).
 */
export function triggerDownload(name: string, data: string, mime: string): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
