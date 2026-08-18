import { useTranslation } from 'react-i18next';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { isNative } from '@/lib/native/nativeBridge';
import { useOnline } from '@/lib/native/pwa';
import styles from './PwaPrompts.module.css';

/**
 * App-level PWA affordances: a "new version → reload" toast, a brief
 * "ready offline" toast, and an offline indicator. Suppressed inside the native
 * shell, which updates through the app store and manages its own chrome.
 */
export function PwaPrompts() {
  const { t } = useTranslation();
  const online = useOnline();
  const native = isNative();

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  return (
    <>
      {!online && (
        <div className={styles.offline} role="status">
          <span className={styles.dot} aria-hidden="true" />
          {t('pwa.offline')}
        </div>
      )}

      {!native && needRefresh && (
        <div className={styles.toast} role="alertdialog" aria-label={t('pwa.updateTitle')}>
          <span className={styles.toastText}>{t('pwa.updateTitle')}</span>
          <div className={styles.toastActions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => void updateServiceWorker(true)}
            >
              {t('pwa.update')}
            </button>
            <button type="button" className={styles.dismiss} onClick={() => setNeedRefresh(false)}>
              {t('pwa.dismiss')}
            </button>
          </div>
        </div>
      )}

      {!native && offlineReady && !needRefresh && (
        <div className={styles.toast} role="status">
          <span className={styles.toastText}>{t('pwa.offlineReady')}</span>
          <button type="button" className={styles.dismiss} onClick={() => setOfflineReady(false)}>
            {t('pwa.dismiss')}
          </button>
        </div>
      )}
    </>
  );
}
