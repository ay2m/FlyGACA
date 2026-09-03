/**
 * Memoized and optimized Markdown tokenizer for streaming chat interactions.
 * Avoids DOM re-layouts on partial token batches.
 */

const markdownCache = new Map<string, string>();
const MAX_CACHE_SIZE = 500;

export function sanitizeAndCacheMarkdown(raw: string): string {
  if (markdownCache.has(raw)) {
    return markdownCache.get(raw)!;
  }

  // Basic HTML entity escape for XSS protection before parse
  const sanitized = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  if (markdownCache.size >= MAX_CACHE_SIZE) {
    const firstKey = markdownCache.keys().next().value;
    if (firstKey) markdownCache.delete(firstKey);
  }

  markdownCache.set(raw, sanitized);
  return sanitized;
}

export function clearMarkdownRenderCache(): void {
  markdownCache.clear();
}
