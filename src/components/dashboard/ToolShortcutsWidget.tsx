import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useToolPrefs } from '@/lib/prefs/toolPrefs';
import { TOOLS, type ToolMeta } from '@/lib/tools';
import { CategoryIcon } from '@/lib/toolIcons';
import styles from './dashboard-widgets.module.css';

const MAX_SHORTCUTS = 6;

/**
 * The user's starred tools (favorites first, backfilled with recents, capped)
 * as tap-friendly chips. Names resolve from the per-tool i18n namespaces the
 * toolbox already ships.
 */
export function ToolShortcutsWidget() {
  const { t } = useTranslation();
  const { favorites, recents } = useToolPrefs();

  const ids = [...favorites, ...recents.filter((id) => !favorites.includes(id))];
  const tools = ids
    .map((id) => TOOLS.find((tool) => tool.id === id))
    .filter((tool): tool is ToolMeta => tool !== undefined && tool.status === 'live')
    .slice(0, MAX_SHORTCUTS);

  return (
    <>
      <div className={styles.head}>
        <h2>{t('dashboard.widgets.tools.title')}</h2>
        <Link to="/tools" className={styles.headLink}>
          {t('dashboard.widgets.tools.manage')}
        </Link>
      </div>
      {tools.length > 0 ? (
        <div className={styles.chips}>
          {tools.map((tool) => (
            <Link key={tool.id} to={tool.route} className={styles.chip}>
              <span className={styles.chipIcon} aria-hidden="true">
                <CategoryIcon cat={tool.category} size={16} />
              </span>
              {t(`tools.items.${tool.id}.name`)}
            </Link>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>
          {t('dashboard.widgets.tools.empty')}{' '}
          <Link to="/tools" className={styles.emptyCta}>
            {t('dashboard.widgets.tools.manage')}
          </Link>
        </p>
      )}
    </>
  );
}
