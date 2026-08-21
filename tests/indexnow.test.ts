import { describe, expect, it } from 'vitest';
import { extractLocs, buildPayload } from '../scripts/indexnow.mjs';

describe('extractLocs', () => {
  it('pulls every <loc> URL out of a sitemap', () => {
    const xml = `<urlset>
      <url><loc>https://flygaca.com/</loc></url>
      <url><loc>https://flygaca.com/library</loc></url>
      <url><loc>https://flygaca.com/ar/library</loc></url>
    </urlset>`;
    expect(extractLocs(xml)).toEqual([
      'https://flygaca.com/',
      'https://flygaca.com/library',
      'https://flygaca.com/ar/library',
    ]);
  });
});

describe('buildPayload', () => {
  it('sets host + key + keyLocation and keeps only same-host URLs, deduped', () => {
    const payload = buildPayload({
      site: 'https://flygaca.com',
      key: 'abc123',
      urls: [
        'https://flygaca.com/',
        'https://flygaca.com/', // dup
        'https://flygaca.com/library',
        'https://example.com/off-host', // wrong host — dropped
        'not-a-url', // junk — dropped
      ],
    });
    expect(payload.host).toBe('flygaca.com');
    expect(payload.key).toBe('abc123');
    expect(payload.keyLocation).toBe('https://flygaca.com/abc123.txt');
    expect(payload.urlList).toEqual(['https://flygaca.com/', 'https://flygaca.com/library']);
  });

  it('caps the URL list at 10,000', () => {
    const urls = Array.from({ length: 10500 }, (_, i) => `https://flygaca.com/p/${i}`);
    const payload = buildPayload({ site: 'https://flygaca.com', key: 'k', urls });
    expect(payload.urlList).toHaveLength(10000);
  });
});
