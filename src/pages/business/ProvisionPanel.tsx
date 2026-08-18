import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { provisionSeats } from '@/lib/services/org';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { Tabs, Tab } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import styles from './admin.module.css';

interface ProvisionPanelProps {
  orgId: string;
  seatLimit: number | null;
  seatsUsed: number;
  onClose: () => void;
}

const MODAL_TITLE_ID = 'provision-panel-title';
const CSV_PREVIEW_LIMIT = 5;

export function ProvisionPanel({ orgId, seatLimit, seatsUsed, onClose }: ProvisionPanelProps) {
  const { t } = useTranslation();
  const [emails, setEmails] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'manual' | 'csv'>('manual');
  const [expiresAt, setExpiresAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csvError, setCsvError] = useState('');
  const [results, setResults] = useState<Array<{
    email: string;
    success: boolean;
    error?: string;
  }> | null>(null);

  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  const parseCSV = async (file: File): Promise<string[]> => {
    const text = await file.text();
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(',')[0].trim())
      .filter((email) => email);
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvError('');
    setCsvFile(file);
    setCsvEmails([]);

    try {
      const emailsFromCsv = await parseCSV(file);
      if (emailsFromCsv.length === 0) {
        setCsvError(t('business.admin.csvEmpty'));
        setCsvFile(null);
        return;
      }
      setCsvEmails(emailsFromCsv);
    } catch {
      setCsvError(t('business.admin.csvParseError'));
      setCsvFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let emailList: string[] = [];
    if (inputMode === 'manual') {
      emailList = emails
        .split('\n')
        .map((e) => e.trim())
        .filter(Boolean);
    } else if (csvFile) {
      try {
        emailList = await parseCSV(csvFile);
      } catch {
        setCsvError(t('business.admin.csvParseError'));
        setIsSubmitting(false);
        return;
      }
    }

    if (emailList.length === 0) {
      setIsSubmitting(false);
      return;
    }

    const res = await provisionSeats(orgId, emailList, expiresAt || undefined);
    if (res) {
      setResults(res.results);
    } else {
      setResults(emailList.map((e) => ({ email: e, success: false, error: 'network-error' })));
    }
    setIsSubmitting(false);
  };

  const availableSeats = seatLimit !== null ? seatLimit - seatsUsed : null;
  const canAddMore = availableSeats === null || availableSeats > 0;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={MODAL_TITLE_ID}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHead}>
          <h2 id={MODAL_TITLE_ID}>{t('business.admin.addSeats')}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {results ? (
          <div className={styles.modalBody}>
            <h3>{t('business.admin.provisionResults')}</h3>
            <ul className={styles.resultsList}>
              {results.map((r) => (
                <li key={r.email} className={r.success ? styles.resultSuccess : styles.resultError}>
                  <bdi dir="ltr">{r.email}</bdi>
                  {r.success ? '✓' : `✗ ${r.error}`}
                </li>
              ))}
            </ul>
            <Button type="button" variant="primary" onClick={onClose}>
              {t('business.admin.done')}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalBody}>
            {seatLimit !== null && (
              <div className={styles.seatInfo}>
                {t('business.admin.seatUsage', {
                  used: seatsUsed,
                  limit: seatLimit,
                  available: availableSeats,
                })}
              </div>
            )}

            {!canAddMore && (
              <div className={styles.warning}>{t('business.admin.seatLimitReached')}</div>
            )}

            <Tabs label={t('business.admin.inputModeLabel')} className={styles.inputModeTabs}>
              <Tab
                active={inputMode === 'manual'}
                onClick={() => {
                  setInputMode('manual');
                  setCsvError('');
                  setCsvFile(null);
                  setCsvEmails([]);
                }}
              >
                {t('business.admin.tabManual')}
              </Tab>
              <Tab
                active={inputMode === 'csv'}
                onClick={() => {
                  setInputMode('csv');
                  setEmails('');
                }}
              >
                {t('business.admin.tabCsv')}
              </Tab>
            </Tabs>

            {inputMode === 'manual' ? (
              <div className={styles.formGroup}>
                <label htmlFor="emails">{t('business.admin.emailsLabel')}</label>
                <textarea
                  id="emails"
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder={t('business.admin.emailsPlaceholder')}
                  disabled={!canAddMore}
                  rows={5}
                />
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label htmlFor="csvFile">{t('business.admin.csvLabel')}</label>
                <input
                  type="file"
                  id="csvFile"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={!canAddMore}
                  className={styles.fileInput}
                />
                {csvFile && csvEmails.length > 0 && (
                  <div className={styles.csvPreview}>
                    <p className={styles.fileInfo}>
                      {t('business.admin.csvSelected', { name: csvFile.name })}
                      {' — '}
                      {t('business.admin.csvPreviewCount', { count: csvEmails.length })}
                    </p>
                    <ul className={styles.csvPreviewList}>
                      {csvEmails.slice(0, CSV_PREVIEW_LIMIT).map((email) => (
                        <li key={email}>
                          <bdi dir="ltr">{email}</bdi>
                        </li>
                      ))}
                    </ul>
                    {csvEmails.length > CSV_PREVIEW_LIMIT && (
                      <p className={styles.csvHint}>
                        {t('business.admin.csvPreviewMore', {
                          count: csvEmails.length - CSV_PREVIEW_LIMIT,
                        })}
                      </p>
                    )}
                  </div>
                )}
                {csvError && <p className={styles.csvErrorMsg}>{csvError}</p>}
                <p className={styles.csvHint}>{t('business.admin.csvHint')}</p>
              </div>
            )}

            <div className={styles.formGroup}>
              <label htmlFor="expiresAt">{t('business.admin.expirationLabel')}</label>
              <input
                type="date"
                id="expiresAt"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={!canAddMore}
              />
            </div>

            <div className={styles.modalFooter}>
              <Button type="button" variant="clay" onClick={onClose}>
                {t('business.admin.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={
                  isSubmitting ||
                  !canAddMore ||
                  (inputMode === 'manual' ? !emails.trim() : !csvFile)
                }
              >
                {isSubmitting ? t('business.admin.provisioning') : t('business.admin.sendInvites')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
