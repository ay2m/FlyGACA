import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Copy, Check, ShareNetwork, GraduationCap } from '@phosphor-icons/react';
import { Disclaimer } from './Disclaimer';
import { Breadcrumbs } from './Breadcrumbs';
import { adelLink } from '@/lib/adel';
import { usePageMeta } from '@/hooks/usePageMeta';
import { breadcrumbLd, softwareAppLd, type Crumb, type JsonLd } from '@/lib/seo/jsonld';
import { shareCurrent } from '@/lib/share';
import { useFeature } from '@/lib/services/features';
import {
  addPreset,
  removePreset,
  presetsFor,
  normalizePresets,
  type Preset,
} from '@/calc/app/toolPresets';
import { regulationForRoute, regulationLink } from '@/lib/toolRegulations';
import styles from './CalcShell.module.css';

const PRESETS_KEY = 'flygaca:tool-presets';

function loadPresets(): Preset[] {
  try {
    return normalizePresets(JSON.parse(localStorage.getItem(PRESETS_KEY) ?? 'null'));
  } catch {
    return [];
  }
}

export interface RelatedTool {
  to: string;
  label: string;
}

interface CalcShellProps {
  title: string;
  intro?: string;
  /** Small category eyebrow above the title. */
  category?: string;
  /** Inputs / outputs of the calculator. */
  children: ReactNode;
  /** Applies a worked example to the inputs (the "Try an example" button). */
  onExample?: () => void;
  /** Returns the Ask-Adel prompt, or null/undefined to hide the action. */
  adelPrompt?: () => string | null | undefined;
  /** Optional "How it works" explainer, shown in a collapsible. */
  formula?: ReactNode;
  /** Related tools shown as chips at the foot of the page. */
  related?: RelatedTool[];
  /**
   * Replace the default SoftwareApplication JSON-LD with a node that better
   * describes the page's subject (e.g. an Airport for an aerodrome page). The
   * breadcrumb is still emitted alongside it.
   */
  primaryLd?: JsonLd;
  /** Keep this rendering out of the index (e.g. an unknown-ICAO soft-404). */
  noindex?: boolean;
}

/**
 * The shared frame for every calculator tool: category eyebrow, title, intro,
 * the tool body, the action row (copy link · try an example · ask Captain Adel),
 * an optional "How it works" explainer, related-tool chips and the disclaimer.
 */
export function CalcShell({
  title,
  intro,
  category,
  children,
  onExample,
  adelPrompt,
  formula,
  related,
  primaryLd,
  noindex,
}: CalcShellProps) {
  const { t, i18n } = useTranslation();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const isPro = useFeature('tool-presets');
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [shared, setShared] = useState<'idle' | 'shared' | 'copied'>('idle');
  const [presets, setPresets] = useState<Preset[]>(loadPresets);
  const [naming, setNaming] = useState(false);
  const [presetName, setPresetName] = useState('');
  const mine = presetsFor(presets, pathname);

  function persistPresets(next: Preset[]) {
    setPresets(next);
    try {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }
  function saveCurrentPreset() {
    const name = presetName.trim();
    if (!name) return;
    persistPresets(addPreset(presets, { path: pathname, name, query: search.replace(/^\?/, '') }));
    setPresetName('');
    setNaming(false);
  }
  // One crumb trail for both the JSON-LD and the visible <Breadcrumbs/>, so the
  // on-page nav and the structured data never drift (mirrors the Document reader).
  const crumbs: Crumb[] = [
    { name: t('nav.breadcrumbHome'), path: '/' },
    { name: t('nav.tools'), path: '/tools' },
    { name: title, path: pathname },
  ];
  usePageMeta(
    title,
    intro,
    [
      primaryLd ??
        softwareAppLd({ title, description: intro, path: pathname, lang: i18n.language }),
      breadcrumbLd(crumbs, i18n.language),
    ],
    noindex ? { noindex: true } : undefined,
  );

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
    setTimeout(() => setCopied('idle'), 1500);
  }

  // Share the current tool URL (inputs carried in the query via useUrlState),
  // tagged with ?ref=tool. Web Share sheet where available, else clipboard.
  async function shareThis() {
    const result = await shareCurrent('tool', { title });
    setShared(result);
    setTimeout(() => setShared('idle'), 1500);
  }

  const copyLabel =
    copied === 'ok'
      ? t('calc.copied')
      : copied === 'fail'
        ? t('calc.copyFailed')
        : t('calc.copyLink');

  const shareLabel =
    shared === 'copied'
      ? t('calc.copied')
      : shared === 'shared'
        ? t('calc.shared')
        : t('calc.share');

  // The buttons' visible labels change on action, but screen readers also need the
  // outcome announced — a polite live region carries the transient confirmation
  // (WCAG 4.1.3 Status Messages). Empty while idle so it only speaks on change.
  const copyStatus =
    copied === 'ok' ? t('calc.copied') : copied === 'fail' ? t('calc.copyFailed') : '';
  const shareStatus =
    shared === 'shared' ? t('calc.shared') : shared === 'copied' ? t('calc.copied') : '';

  const adelHref = adelPrompt ? adelLink(adelPrompt()) : null;

  // Cross-link the tool to the GACAR Part it operates under, where one is
  // mapped (src/lib/toolRegulations.ts) — internal link to the cited source.
  const reg = regulationForRoute(pathname);
  const regLink = reg ? regulationLink(reg) : null;

  return (
    <article className={`container-narrow ${styles.shell} page-enter`}>
      <header className={styles.head}>
        <Breadcrumbs items={crumbs} />
        {category && <p className={styles.eyebrow}>{category}</p>}
        <h1>{title}</h1>
        {intro && <p className={styles.intro}>{intro}</p>}
      </header>

      <div className={styles.body}>{children}</div>

      <div className={styles.actions}>
        {/* Primary actions: the worked example seeds the inputs, Ask-Adel is the
            one filled CTA. Utilities (copy · share · save) sit to the inline-end. */}
        <div className={styles.actionsPrimary}>
          {onExample && (
            <button className={styles.action} type="button" onClick={onExample}>
              {t('calc.tryExample')}
            </button>
          )}
          {adelHref && (
            <Link className={`${styles.action} ${styles.adel}`} to={adelHref}>
              <GraduationCap size={18} weight="fill" aria-hidden />
              {t('calc.askAdel')}
            </Link>
          )}
        </div>

        <div className={styles.actionsUtility}>
          <button
            className={styles.iconAction}
            type="button"
            onClick={copyLink}
            aria-label={copyLabel}
            title={copyLabel}
          >
            {copied === 'ok' ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
          </button>
          <button
            className={styles.iconAction}
            type="button"
            onClick={shareThis}
            aria-label={shareLabel}
            title={shareLabel}
          >
            {shared !== 'idle' ? (
              <Check size={18} aria-hidden />
            ) : (
              <ShareNetwork size={18} aria-hidden />
            )}
          </button>
          {!isPro ? (
            <Link className={styles.action} to="/pricing">
              {t('calc.savePreset')}
              <span className={styles.proTag}>{t('upsell.proOnly')}</span>
            </Link>
          ) : naming ? (
            <span className={styles.presetForm}>
              <input
                className={styles.presetInput}
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder={t('calc.presetName')}
                aria-label={t('calc.presetName')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveCurrentPreset();
                  } else if (e.key === 'Escape') {
                    setNaming(false);
                  }
                }}
              />
              <button
                type="button"
                className={styles.action}
                onClick={saveCurrentPreset}
                disabled={!presetName.trim()}
              >
                {t('calc.presetSave')}
              </button>
            </span>
          ) : (
            <button type="button" className={styles.action} onClick={() => setNaming(true)}>
              {t('calc.savePreset')}
            </button>
          )}
        </div>

        <span className={styles.note}>{t('calc.shareNote')}</span>
      </div>

      {mine.length > 0 && (
        <details className={styles.presets}>
          <summary>{t('calc.presets')}</summary>
          <ul className={styles.presetList}>
            {mine.map((p) => (
              <li key={p.name} className={styles.presetRow}>
                <button
                  type="button"
                  className={styles.presetLoad}
                  onClick={() => navigate(`${pathname}${p.query ? `?${p.query}` : ''}`)}
                >
                  {p.name}
                </button>
                <button
                  type="button"
                  className={styles.presetRemove}
                  aria-label={t('calc.removePreset')}
                  onClick={() => persistPresets(removePreset(presets, pathname, p.name))}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <span className="sr-only" role="status" aria-live="polite">
        {copyStatus || shareStatus}
      </span>

      {formula && (
        <details className={styles.formula}>
          <summary>{t('calc.howItWorks')}</summary>
          <div className={styles.formulaBody}>{formula}</div>
        </details>
      )}

      {regLink && (
        <nav className={styles.regLink} aria-label={t('calc.governingReg')}>
          <span className={styles.relatedLabel}>{t('calc.governingReg')}</span>
          <Link to={regLink.to} className={styles.regChip}>
            {regLink.label}
          </Link>
        </nav>
      )}

      {related && related.length > 0 && (
        <nav className={styles.related} aria-label={t('calc.related')}>
          <span className={styles.relatedLabel}>{t('calc.related')}</span>
          {related.map((r) => (
            <Link key={r.to} to={r.to} className={styles.relatedChip}>
              {r.label}
            </Link>
          ))}
        </nav>
      )}

      <Disclaimer compact />
    </article>
  );
}
