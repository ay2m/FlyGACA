import styles from './calc.module.css';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Optional empty/placeholder row shown when nothing is chosen. */
  placeholder?: string;
  hint?: string;
  error?: string;
}

/** Labelled native `<select>` sharing the calculator field styling (RTL-safe). */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  hint,
  error,
}: SelectFieldProps) {
  const fieldClass = [styles.field, error ? styles.fieldInvalid : ''].filter(Boolean).join(' ');
  return (
    <label className={fieldClass}>
      <span>{label}</span>
      <span className={styles.inputRow}>
        <select
          className={styles.select}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? 'true' : undefined}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
      {error && (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
      {hint && !error && <small className={styles.hint}>{hint}</small>}
    </label>
  );
}
