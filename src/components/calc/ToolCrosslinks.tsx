import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { getToolCrosslinks } from '@/lib/toolLibraryCrosslinks';
import styles from './ToolCrosslinks.module.css';

interface ToolCrosslinksProps {
  toolId: string;
}

/**
 * Display regulatory cross-links for a tool. Shows the GACAR sections that
 * govern the calculator, with links to verify against the regulation in the
 * regulatory library.
 *
 * Rendered by CalcShell; also appears in tool metadata.
 */
export function ToolCrosslinks({ toolId }: ToolCrosslinksProps) {
  const { t } = useTranslation();
  const crosslinks = getToolCrosslinks(toolId);

  if (crosslinks.length === 0) return null;

  return (
    <div className={styles.container}>
      <p className={styles.label}>
        {t('common.governedBy') ?? 'Governed by:'}
      </p>
      <ul className={styles.links}>
        {crosslinks.map((link) => (
          <li key={`${link.part}-${link.section}`}>
            <Link
              to={`/library/part-${link.part}#gacar-part-${link.part}-${link.section.replace(/\./g, '-')}`}
              className={styles.link}
            >
              GACAR Part {link.part}.{link.section}
            </Link>
            <span className={styles.title}>{link.title}</span>
          </li>
        ))}
      </ul>
      <p className={styles.caveat}>
        {t('common.verifyAgainstGaca') ??
          'Always verify current requirements directly with GACA.'}
      </p>
    </div>
  );
}
