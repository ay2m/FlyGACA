import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isNative } from '@/lib/native/nativeBridge';
import { isIosSafari, useInstallPrompt } from '@/lib/native/pwa';
import styles from './InstallButton.module.css';

/**
 * In-app "Install" affordance. On Android/desktop it triggers the captured
 * beforeinstallprompt; on iOS Safari (which has no such event) it reveals an
 * add-to-home hint. Renders nothing inside the native shell or when install
 * isn't available.
 */
export function InstallButton() {
  const { t } = useTranslation();
  const { canInstall, promptInstall } = useInstallPrompt();
  const [hint, setHint] = useState(false);

  if (isNative()) return null;
  const ios = isIosSafari();
  if (!canInstall && !ios) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.btn}
        onClick={() => (canInstall ? promptInstall() : setHint((v) => !v))}
      >
        <span aria-hidden="true">⬇</span>
        <span className={styles.label}>{t('pwa.install')}</span>
      </button>
      {ios && hint && (
        <p className={styles.hint} role="status">
          {t('pwa.installHintIos')}
        </p>
      )}
    </div>
  );
}
