import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './CockpitToolbar.module.css';

export function CockpitToolbar() {
  const { i18n } = useTranslation();
  const ar = i18n.language === 'ar';

  const [zuluTime, setZuluTime] = useState('');
  const [isRedMode, setIsRedMode] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [showFreqs, setShowFreqs] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Live Zulu Clock updater
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      const s = String(d.getUTCSeconds()).padStart(2, '0');
      setZuluTime(`${h}:${m}:${s}Z`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync Red Light Mode to document element
  const toggleRedMode = () => {
    const next = !isRedMode;
    setIsRedMode(next);
    if (next) {
      document.documentElement.setAttribute('data-cockpit-mode', 'red');
    } else {
      document.documentElement.removeAttribute('data-cockpit-mode');
    }
  };

  // Screen Wake Lock API (iPad / Tablet EFB)
  const toggleWakeLock = async () => {
    if ('wakeLock' in navigator) {
      if (wakeLockActive) {
        setWakeLockActive(false);
      } else {
        try {
          await (
            navigator as unknown as { wakeLock: { request: (type: string) => Promise<unknown> } }
          ).wakeLock.request('screen');
          setWakeLockActive(true);
        } catch {
          setWakeLockActive(false);
        }
      }
    } else {
      setWakeLockActive(!wakeLockActive);
    }
  };

  if (minimized) {
    return (
      <button
        type="button"
        className={styles.cockpitFloatingBar}
        style={{ insetInlineStart: 'auto', insetInlineEnd: 'var(--space-4)', transform: 'none' }}
        onClick={() => setMinimized(false)}
        aria-label="Open Cockpit EFB Bar"
      >
        <span>✈️ EFB</span>
        <span className={styles.zuluClock}>{zuluTime}</span>
      </button>
    );
  }

  return (
    <div className={styles.cockpitFloatingBar} role="toolbar" aria-label="Cockpit EFB Bar">
      {/* Zulu Clock */}
      <span className={styles.zuluClock} title="Coordinated Universal Time (UTC / Zulu)">
        🕒 {zuluTime}
      </span>

      <span className={styles.divider} aria-hidden="true" />

      {/* Red Light Night Vision Toggle */}
      <button
        type="button"
        className={`${styles.cockpitBtn} ${isRedMode ? styles.activeMode : ''}`}
        onClick={toggleRedMode}
        title={ar ? 'نمط الرؤية الليلية بالأشعة الحمراء' : 'Red-Light Cockpit Mode (Night Vision)'}
      >
        <span>🚨</span>
        <span>{isRedMode ? (ar ? 'أحمر' : 'RED') : ar ? 'نهاري' : 'NORM'}</span>
      </button>

      {/* Emergency Frequencies / Squawk Popover */}
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          className={`${styles.cockpitBtn} ${showFreqs ? styles.activeMode : ''}`}
          onClick={() => setShowFreqs(!showFreqs)}
          title={ar ? 'ترددات الطوارئ ورموز المجيب' : 'Emergency Frequencies & Squawk Codes'}
        >
          <span>📻</span>
          <span>{ar ? 'طوارئ' : 'EMERG'}</span>
        </button>

        {showFreqs && (
          <div className={styles.popover}>
            <div
              style={{
                fontWeight: 'bold',
                borderBottom: '1px solid rgba(255,255,255,0.2)',
                paddingBottom: '4px',
              }}
            >
              {ar ? 'ترددات ورموز الطوارئ الدولية' : 'Emergency Frequencies & Squawk'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>VHF Guard:</span>
              <strong>121.500 MHz</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>UHF Guard:</span>
              <strong>243.000 MHz</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Search & Rescue (SAR):</span>
              <strong>123.100 MHz</strong>
            </div>
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                paddingTop: '4px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Hijack (اختطاف):</span>
              <strong>7500</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Radio Failure (انقطاع الاتصال):</span>
              <strong>7600</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>General Emergency (طوارئ عامة):</span>
              <strong>7700</strong>
            </div>
          </div>
        )}
      </div>

      {/* Screen Wake Lock Toggle */}
      <button
        type="button"
        className={`${styles.cockpitBtn} ${wakeLockActive ? styles.activeMode : ''}`}
        onClick={toggleWakeLock}
        title={ar ? 'تثبيت إضاءة الشاشة في مقصورة القيادة' : 'Screen Wake-Lock (Keep Display On)'}
      >
        <span>💡</span>
        <span>{wakeLockActive ? (ar ? 'مثبّت' : 'LOCKED') : ar ? 'عادي' : 'AUTO'}</span>
      </button>

      <span className={styles.divider} aria-hidden="true" />

      {/* Minimize Button */}
      <button
        type="button"
        className={styles.cockpitBtn}
        onClick={() => setMinimized(true)}
        title={ar ? 'تصغير شريط قمرة القيادة' : 'Minimize EFB Bar'}
      >
        ✕
      </button>
    </div>
  );
}
