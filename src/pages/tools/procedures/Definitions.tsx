import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { DefinitionsIndex } from '@/lib/content';
import styles from './Definitions.module.css';

const LIMIT = 80;

export function Definitions() {
  const { t } = useTranslation();
  const { data, error, loading } = useFetchJson<DefinitionsIndex>('/data/definitions-index.json');
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!data || query.length < 2) return [];
    return data.terms
      .filter((d) => d.term.toLowerCase().includes(query) || d.def.toLowerCase().includes(query))
      .slice(0, LIMIT);
  }, [data, query]);

  return (
    <CalcShell
      title={t('tools.items.definitions.name')}
      intro={t('tools.items.definitions.blurb')}
      category={t('tools.categories.procedures')}
      related={[{ to: '/library/part-1', label: t('definitionsTool.openPart') }]}
    >
      <TextField
        label={t('definitionsTool.search')}
        value={q}
        onChange={setQ}
        placeholder="aerodrome"
      />
      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      {data && (
        <>
          <p className={styles.count}>
            {query.length < 2
              ? t('definitionsTool.count', { n: data.count })
              : t('definitionsTool.results', { n: results.length })}
          </p>
          {query.length < 2 ? (
            <p className={styles.count}>{t('definitionsTool.min')}</p>
          ) : results.length === 0 ? (
            <p className={styles.count}>{t('definitionsTool.none')}</p>
          ) : (
            <dl className={styles.list}>
              {results.map((d) => (
                <div key={d.term} className={styles.item}>
                  <dt className={styles.term}>{d.term}</dt>
                  <dd className={styles.def}>{d.def}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
      <p className={styles.note}>
        <Link to="/library/part-1">{t('definitionsTool.openPart')} →</Link>
      </p>
    </CalcShell>
  );
}
