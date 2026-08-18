import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_RESET_MS = 1500;

/**
 * Copy text to the clipboard and flash a "Copied ✓" confirmation.
 *
 * Every copy button in the app wants the same three things: write the text,
 * show a tick, clear it a moment later — and stay silent when the clipboard is
 * unavailable (insecure context, denied permission), because the content the
 * user wanted is still on screen to select by hand.
 *
 * The timer is cancelled on unmount, which the hand-rolled copies were not: a
 * user who copies and immediately navigates away no longer triggers a setState
 * on an unmounted component.
 */
export function useCopyToClipboard(resetMs: number = DEFAULT_RESET_MS): {
  copied: boolean;
  copy: (text: string) => Promise<void>;
} {
  const { copiedKey, copy } = useCopyToClipboardKeyed<true>(resetMs);
  const copyText = useCallback((text: string) => copy(true, text), [copy]);
  return { copied: copiedKey === true, copy: copyText };
}

/**
 * The same flash, keyed — for pages that render a copy button per section and
 * need to tick only the one that was pressed (`copiedKey === section.id`).
 */
export function useCopyToClipboardKeyed<K>(resetMs: number = DEFAULT_RESET_MS): {
  copiedKey: K | null;
  copy: (key: K, text: string) => Promise<void>;
} {
  const [copiedKey, setCopiedKey] = useState<K | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (key: K, text: string) => {
      try {
        await navigator.clipboard?.writeText(text);
      } catch {
        // Clipboard blocked (insecure context / permissions) — no confirmation,
        // no error surface; the text stays selectable on screen.
        return;
      }
      setCopiedKey(key);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiedKey(null), resetMs);
    },
    [resetMs],
  );

  return { copiedKey, copy };
}
