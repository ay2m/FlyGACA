/**
 * Web PWA helpers: connectivity, and the install (Add-to-Home-Screen) prompt.
 * Inert inside the native shell (the app store handles install/updates there) —
 * callers gate on `isNative()`.
 */
import { useEffect, useState } from 'react';

/** Tracks navigator.onLine, updating on the online/offline events. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Captures `beforeinstallprompt` so the app can offer its own Install button.
 * `canInstall` is true once the browser has fired the event (and the app isn't
 * already installed); `promptInstall()` shows the native chooser.
 */
export function useInstallPrompt(): { canInstall: boolean; promptInstall: () => void } {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return {
    canInstall: deferred !== null,
    promptInstall: () => {
      if (!deferred) return;
      void deferred.prompt();
      setDeferred(null);
    },
  };
}

/** iOS Safari has no beforeinstallprompt — used to show an A2HS hint instead. */
export function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const webkit = /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  const standalone = (navigator as { standalone?: boolean }).standalone === true;
  return iOS && webkit && !standalone;
}
