import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/calc/TextField';
import type { PilotRecord } from '@/lib/services/account';
import styles from '@/pages/account/account.module.css';

export type RecordDraft = Omit<PilotRecord, 'id'>;

interface RecordFormProps {
  initial: RecordDraft;
  submitLabel: string;
  onSubmit: (draft: RecordDraft) => void;
  onCancel: () => void;
}

/** Shared add/edit form for a pilot record (rating, aircraft, document, endorsement). */
export function RecordForm({ initial, submitLabel, onSubmit, onCancel }: RecordFormProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<RecordDraft>(initial);
  const set = (k: keyof RecordDraft, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  function submit() {
    if (!draft.title.trim()) return;
    onSubmit(draft);
  }

  return (
    <>
      <div className={styles.form}>
        <TextField
          label={t(`records.titleLabel.${draft.category}`)}
          value={draft.title}
          onChange={(v) => set('title', v)}
          placeholder={t(`records.titlePh.${draft.category}`)}
        />
        <TextField
          label={t(`records.refLabel.${draft.category}`)}
          value={draft.ref}
          onChange={(v) => set('ref', v)}
        />
        <TextField
          label={t('records.fields.issued')}
          value={draft.issued}
          onChange={(v) => set('issued', v)}
          type="date"
        />
        <TextField
          label={t('records.fields.expires')}
          value={draft.expires}
          onChange={(v) => set('expires', v)}
          type="date"
          hint={t('records.expiresHint')}
        />
        <TextField
          label={t('account.remarks')}
          value={draft.remarks}
          onChange={(v) => set('remarks', v)}
        />
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
