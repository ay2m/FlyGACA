/**
 * Waitlist / notify-me capture. POSTs {email, topic} to the write-only `/api/waitlist`
 * route — the server stores it and never exposes it to the client, so addresses stay
 * private. Backend-gated: throws `unavailable` in the local-first build so the caller
 * can show the "not available yet" state. `topic` records what the person is waiting
 * for — e.g. a `soon` exam-prep pack id.
 */
import { isBackendConfigured, apiFetch } from '@/lib/services/backend';

export async function notifyWaitlist(email: string, topic?: string): Promise<void> {
  if (!isBackendConfigured()) throw new Error('unavailable');
  const payload: { email: string; topic?: string } = { email };
  if (topic) payload.topic = topic;
  await apiFetch<unknown>('/waitlist', { method: 'POST', body: payload });
}
