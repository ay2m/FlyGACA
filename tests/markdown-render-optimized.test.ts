import { describe, expect, it, beforeEach } from 'vitest';
import {
  sanitizeAndCacheMarkdown,
  clearMarkdownRenderCache,
} from '@/components/chat/MarkdownView/markdownRenderOptimized';

describe('markdownRenderOptimized', () => {
  beforeEach(() => {
    clearMarkdownRenderCache();
  });

  it('escapes HTML special characters', () => {
    const raw = '<script>alert("xss") & \'test\'</script>';
    const sanitized = sanitizeAndCacheMarkdown(raw);
    expect(sanitized).toBe('&lt;script&gt;alert(&quot;xss&quot;) &amp; &#039;test&#039;&lt;/script&gt;');
  });

  it('returns cached result on repeated calls', () => {
    const raw = '**Bold text**';
    const first = sanitizeAndCacheMarkdown(raw);
    const second = sanitizeAndCacheMarkdown(raw);
    expect(first).toBe(second);
  });

  it('clears cache properly', () => {
    const raw = '# Header';
    sanitizeAndCacheMarkdown(raw);
    clearMarkdownRenderCache();
    // Should recompute and cache without error
    const result = sanitizeAndCacheMarkdown(raw);
    expect(result).toBe('# Header');
  });
});
