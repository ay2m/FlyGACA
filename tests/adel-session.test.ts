import { describe, expect, it, beforeEach } from 'vitest';
import { adelLink } from '@/lib/adel';
import { sessionId } from '@/lib/session';

describe('adelLink', () => {
  it('builds a chat deep link with the prompt URL-encoded', () => {
    expect(adelLink('Explain crosswind limits')).toBe('/chat?q=Explain%20crosswind%20limits');
  });

  it('encodes characters that are significant in a query string', () => {
    expect(adelLink('VMC & §61.51?')).toBe('/chat?q=VMC%20%26%20%C2%A761.51%3F');
  });

  it('returns null when there is no prompt to ask', () => {
    expect(adelLink(null)).toBeNull();
    expect(adelLink(undefined)).toBeNull();
    expect(adelLink('')).toBeNull();
  });
});

describe('sessionId', () => {
  beforeEach(() => localStorage.clear());

  it('mints a stable id and persists it for reuse', () => {
    const first = sessionId();
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
    expect(localStorage.getItem('flygaca:adel-session')).toBe(first);
    expect(sessionId()).toBe(first);
  });

  it('reuses an id already in storage', () => {
    localStorage.setItem('flygaca:adel-session', 'existing-id');
    expect(sessionId()).toBe('existing-id');
  });
});
