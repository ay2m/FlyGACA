import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import table from '@/pages/tools/performance/WindTable.module.css';
import styles from './RegLookup.module.css';

interface Column {
  field: string;
  labelKey: string;
}

interface RegLookupProps {
  id: string;
  /** i18n base key, e.g. "vfrMinima". */
  base: string;
  columns: Column[];
  adelPrompt: string;
}

/** Shared layout for the GACAR reference lookups: a "confirm against the cited
 *  Part" note, a bilingual reference table, and links to the Library / Adel. */
export function RegLookup({ id, base, columns, adelPrompt }: RegLookupProps) {
  const { t } = useTranslation();
  const rows = t(`${base}.rows`, { returnObjects: true }) as unknown as Record<string, string>[];

  return (
    <CalcShell
      title={t(`tools.items.${id}.name`)}
      intro={t(`tools.items.${id}.blurb`)}
      category={t('tools.categories.regulations')}
      formula={t(`${base}.formula`)}
      adelPrompt={() => adelPrompt}
      related={[{ to: '/library', label: t('reg.openLibrary') }]}
    >
      <p className={styles.confirm} role="note">
        {t(`${base}.confirm`)}
      </p>
      <div className={table.tableWrap}>
        <table className={table.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.field}>{t(c.labelKey)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c, j) => (
                  <td key={c.field} style={j === 0 ? { fontWeight: 600 } : undefined}>
                    {r[c.field]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CalcShell>
  );
}

export const VfrMinima = () => (
  <RegLookup
    id="vfr-minima"
    base="vfrMinima"
    columns={[
      { field: 'band', labelKey: 'vfrMinima.bandCol' },
      { field: 'vis', labelKey: 'vfrMinima.visCol' },
      { field: 'cloud', labelKey: 'vfrMinima.cloudCol' },
    ]}
    adelPrompt="What are the VFR weather minima by airspace under GACAR Part 91? Cite the exact section."
  />
);

export const Oxygen = () => (
  <RegLookup
    id="oxygen"
    base="oxygen"
    columns={[
      { field: 'alt', labelKey: 'oxygen.altCol' },
      { field: 'req', labelKey: 'oxygen.reqCol' },
    ]}
    adelPrompt="What are the supplemental oxygen requirements by cabin altitude under GACAR Part 91? Cite the exact section."
  />
);

export const FuelReserves = () => (
  <RegLookup
    id="fuel-reserves"
    base="fuelReserves"
    columns={[
      { field: 'name', labelKey: 'fuelReserves.nameCol' },
      { field: 'desc', labelKey: 'fuelReserves.descCol' },
    ]}
    adelPrompt="What are the minimum fuel requirements and reserves under GACAR Part 91 / 121? Cite the exact section."
  />
);

export const ConversionChecker = () => (
  <RegLookup
    id="conversion-checker"
    base="conversion"
    columns={[
      { field: 'title', labelKey: 'conversion.stepCol' },
      { field: 'desc', labelKey: 'reg.detailCol' },
    ]}
    adelPrompt="What are the steps to convert a foreign pilot licence to a GACA licence?"
  />
);
