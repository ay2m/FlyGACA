/** Stable per-browser session id used by the chat gateway for rate-limiting. */
const KEY = 'flygaca:adel-session';

export function sessionId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
