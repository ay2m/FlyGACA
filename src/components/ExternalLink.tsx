import type { ReactNode } from 'react';
import { isNative, openExternal } from '@/lib/native/nativeBridge';

/**
 * An external link that opens in the native in-app browser inside the Capacitor
 * shell and a normal new tab on the web. Use for off-site/asset URLs so the
 * native app doesn't kick users out to Safari/Chrome.
 */
export function ExternalLink({
  href,
  className,
  children,
  'aria-label': ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  'aria-label'?: string;
}) {
  if (isNative()) {
    return (
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        onClick={() => void openExternal(href)}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </button>
    );
  }
  return (
    <a className={className} href={href} aria-label={ariaLabel} target="_blank" rel="noopener">
      {children}
    </a>
  );
}
