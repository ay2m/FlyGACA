import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/calc/TextField';
import type { FlightDraft } from './flight';
import styles from '@/pages/account/account.module.css';

const FIELDS: { key: keyof FlightDraft; placeholder?: string }[] = [
  { key: 'date', placeholder: '2024-06-01' },
  { key: 'type', placeholder: 'C172' },
  { key: 'reg', placeholder: 'HZ-ABC' },
  { key: 'from', placeholder: 'OERK' },
  { key: 'to', placeholder: 'OEJN' },
  { key: 'total', placeholder: '1.5' },
  { key: 'pic', placeholder: '1.5' },
  { key: 'night' },
  { key: 'ifr' },
  { key: 'ldg', placeholder: '1' },
  { key: 'nightLdg', placeholder: '0' },
  { key: 'appr', placeholder: '0' },
  { key: 'remarks' },
];

interface FlightFormProps {
  initial: FlightDraft;
  submitLabel: string;
  onSubmit: (draft: FlightDraft) => void;
  onCancel: () => void;
}

/** Shared add/edit form for a logbook flight (all columns incl. night ldg + approaches). */
export function FlightForm({ initial, submitLabel, onSubmit, onCancel }: FlightFormProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<FlightDraft>(initial);
  const set = (k: keyof FlightDraft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  function submit() {
    if (!draft.date && !draft.type) return;
    onSubmit(draft);
  }

  return (
    <>
      <div className={styles.form} role="group" aria-label={t('account.flightDetails')}>
        {FIELDS.map(({ key, placeholder }) => (
          <TextField
            key={key}
            label={t(`account.${key}`)}
            value={draft[key] ?? ''}
            onChange={(v) => set(key, v)}
            placeholder={placeholder}
          />
        ))}
      </div>
      <div className={styles.actions}>
        <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={submit}>
          {submitLabel}
        </button>
        <button type="button" className={styles.btn} onClick={onCancel}>
          {t('account.cancel')}
        </button>
      </div>
    </>
  );
}
