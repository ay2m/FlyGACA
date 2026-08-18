import styles from './SortSelect.module.css';

export interface SortOption {
  value: string;
  label: string;
}

interface SortSelectProps {
  /** Label shown before the select (e.g. t('library.sortBy')). */
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: SortOption[];
}

/**
 * Labelled sort dropdown shared by the browse hubs. Generic over string values;
 * each hub maps its own `SortKey` union to/from the option values.
 */
export function SortSelect({ label, value, onChange, options }: SortSelectProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <select className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
