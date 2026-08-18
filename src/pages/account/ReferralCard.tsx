import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchReferralCode, referralLink } from '@/lib/services/referral';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import styles from './ReferralCard.module.css';

/**
 * Shows the signed-in user their referral link. Sharing it earns both the referrer
 * and the friend Captain Adel credits when the friend subscribes (rewarded
 * server-side). Renders nothing until a code loads, so it's inert offline / when the
 * backend isn't deployed.
 */
export function ReferralCard() {
  const { t } = useTranslation();
  const [code, setCode] = useState<string | null>(null);
  const { copied, copy } = useCopyToClipboard(2000);

  useEffect(() => {
    let alive = true;
    void fetchReferralCode().then((c) => {
      if (alive) setCode(c);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!code) return null;
  const link = referralLink(code);

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{t('referral.title')}</h3>
      <p className={styles.subtitle}>{t('referral.subtitle')}</p>
      <div className={styles.row}>
        <input
          className={styles.link}
          readOnly
          value={link}
          aria-label={t('referral.title')}
          onFocus={(e) => e.currentTarget.select()}
        />
        <button type="button" className="btn" onClick={() => void copy(link)}>
          {copied ? t('referral.copied') : t('referral.copy')}
        </button>
      </div>
    </div>
  );
}
