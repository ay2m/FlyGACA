import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePageMeta } from '@/hooks/usePageMeta';
import { itemListLd } from '@/lib/seo/jsonld';
import { useAccount } from '@/lib/services/account';
import { hasPackAccess, ownsPack } from '@/lib/services/packEntitlements';
import { notifyWaitlist } from '@/lib/services/waitlist';
import { Disclaimer } from '@/components/Disclaimer';
import { HubBackLink } from '@/components/HubBackLink';
import {
  LIVE_PACKS,
  PACKS,
  packItemCount,
  packPrice,
  type Pack,
  type PackKind,
} from '@/lib/prepCatalog';
import styles from './Study.module.css';

/** The two storefront sections, in display order. */
const SECTIONS: { kind: PackKind; head: string }[] = [
  { kind: 'certificate', head: 'study.packCertificates' },
  { kind: 'subject', head: 'study.packSubjects' },
];

export function Packs() {
  const { t, i18n } = useTranslation();
  // Storefront hub → ItemList of the LIVE pack detail pages (each is its own URL;
  // `soon` packs have no detail route, so they're excluded here and from the sitemap).
  usePageMeta(
    t('meta.packs'),
    t('metaDesc.packs'),
    itemListLd(
      LIVE_PACKS.map((p) => ({
        name: t(`study.packCatalog.${p.id}.name`),
        path: `/study/packs/${p.id}`,
      })),
      i18n.language,
    ),
  );
  const { entitlement, ownedPacks } = useAccount();

  return (
    <section className={`container ${styles.page}`}>
      <HubBackLink to="/learn?tab=practice" label={t('nav.learn')} />
      <header className={styles.head}>
        <h1>{t('study.packs')}</h1>
        <p className={styles.subtitle}>{t('study.packsDesc')}</p>
      </header>

      {SECTIONS.map(({ kind, head }) => {
        const packs = PACKS.filter((p) => p.kind === kind);
        if (!packs.length) return null;
        return (
          <section key={kind} className={styles.packSection}>
            <h2 className={styles.packSectionHead}>{t(head)}</h2>
            <ul className={styles.banks}>
              {packs.map((p) => (
                <li key={p.id}>
                  <PackCard pack={p} entitlement={entitlement} ownedPacks={ownedPacks} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <Disclaimer compact />
    </section>
  );
}

function PackCard({
  pack,
  entitlement,
  ownedPacks,
}: {
  pack: Pack;
  entitlement: ReturnType<typeof useAccount>['entitlement'];
  ownedPacks: string[];
}) {
  const { t } = useTranslation();
  const name = t(`study.packCatalog.${pack.id}.name`);
  const desc = t(`study.packCatalog.${pack.id}.desc`);

  if (pack.status === 'soon') {
    return <SoonCard pack={pack} name={name} desc={desc} />;
  }

  const access = hasPackAccess(pack, entitlement, ownedPacks);
  const owned = ownsPack(pack, ownedPacks);
  // A paid pack the user can use but hasn't bought is covered by their plan.
  const included = pack.access === 'paid' && access && !owned;
  const locked = !access;

  // The badge that sits beside the name.
  let badge: { label: string; cls: string } | null = null;
  if (pack.access === 'free') badge = { label: t('study.packFree'), cls: styles.freeTag };
  else if (owned) badge = { label: t('study.packOwned'), cls: styles.ownedTag };
  else if (included) badge = { label: t('study.packIncluded'), cls: styles.includedTag };

  return (
    <Link
      to={`/study/packs/${pack.id}`}
      className={`${styles.bank} ${locked ? styles.bankLocked : ''}`}
    >
      <span className={styles.bankTitle}>
        {locked && (
          <span className={styles.lockIcon} aria-hidden="true">
            🔒
          </span>
        )}
        {name}
        {badge && <span className={badge.cls}>{badge.label}</span>}
      </span>
      <span className={styles.bankDesc}>{desc}</span>
      <span className={styles.bankMeta}>
        {locked
          ? t('study.packPrice', { n: packPrice(pack) })
          : t('study.packItemCount', { n: packItemCount(pack) })}
      </span>
    </Link>
  );
}

/** A not-yet-shipped pack: no detail route; capture interest to the waitlist. */
function SoonCard({ pack, name, desc }: { pack: Pack; name: string; desc: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState('busy');
    try {
      await notifyWaitlist(email.trim(), pack.id);
      setState('done');
      setEmail('');
    } catch {
      setState('error');
    }
  }

  return (
    <div className={`${styles.bank} ${styles.bankSoon}`}>
      <span className={styles.bankTitle}>
        {name}
        <span className={styles.soonTag}>{t('study.packSoon')}</span>
      </span>
      <span className={styles.bankDesc}>{desc}</span>
      {state === 'done' ? (
        <p className={styles.notifyDone} role="status">
          {t('study.packNotifyDone')}
        </p>
      ) : (
        <form className={styles.notifyForm} onSubmit={submit}>
          <label className="sr-only" htmlFor={`notify-${pack.id}`}>
            {t('study.packNotifyMe')}
          </label>
          <input
            id={`notify-${pack.id}`}
            type="email"
            required
            className={styles.notifyInput}
            placeholder={t('study.packNotifyPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === 'busy'}
          />
          <button type="submit" className={styles.notifyBtn} disabled={state === 'busy'}>
            {t('study.packNotifyMe')}
          </button>
          {state === 'error' && (
            <p className={styles.notifyError} role="alert">
              {t('study.packNotifyError')}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
