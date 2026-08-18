import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { FieldGrid } from '@/components/calc/Grids';
import { useUrlState } from '@/hooks/useUrlState';
import styles from './Loa.module.css';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

export function Loa() {
  const { t } = useTranslation();
  const [inputs, set] = useUrlState({ name: '', licence: '', aircraft: '', purpose: '', date: '' });
  const { copied, copy } = useCopyToClipboard();

  const letter = [
    `Date: ${inputs.date || '____'}`,
    '',
    'To: General Authority of Civil Aviation (GACA)',
    '',
    `I, ${inputs.name || '____'}, holder of licence number ${inputs.licence || '____'}, request authorization`,
    `in respect of aircraft ${inputs.aircraft || '____'} for the following:`,
    '',
    inputs.purpose || '____',
    '',
    'I confirm the information above is accurate and that I will operate in accordance with all',
    'applicable GACAR requirements.',
    '',
    `Signed: ${inputs.name || '____'}`,
  ].join('\n');

  return (
    <CalcShell
      title={t('tools.items.loa.name')}
      intro={t('tools.items.loa.blurb')}
      category={t('tools.categories.procedures')}
      formula={t('loa.formula')}
      onExample={() => {
        set('name', 'Sara Al-Otaibi');
        set('licence', 'KSA-PPL-12345');
        set('aircraft', 'HZ-ABC');
        set('purpose', 'Authorization to conduct a private flight for currency.');
        set('date', new Date().toISOString().slice(0, 10));
      }}
    >
      <FieldGrid>
        <TextField label={t('loa.name')} value={inputs.name} onChange={(v) => set('name', v)} />
        <TextField
          label={t('loa.licence')}
          value={inputs.licence}
          onChange={(v) => set('licence', v)}
        />
        <TextField
          label={t('loa.aircraft')}
          value={inputs.aircraft}
          onChange={(v) => set('aircraft', v)}
        />
        <TextField
          label={t('loa.date')}
          value={inputs.date}
          onChange={(v) => set('date', v)}
          placeholder="2024-06-01"
        />
      </FieldGrid>
      <TextField
        label={t('loa.purpose')}
        value={inputs.purpose}
        onChange={(v) => set('purpose', v)}
      />

      <div className={styles.outputHead}>
        <span>{t('loa.output')}</span>
        <button type="button" className={styles.copy} onClick={() => void copy(letter)}>
          {copied ? t('loa.copied') : t('loa.copy')}
        </button>
      </div>
      <pre className={styles.letter}>{letter}</pre>
    </CalcShell>
  );
}
