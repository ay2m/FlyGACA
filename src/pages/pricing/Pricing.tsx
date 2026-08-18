import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '@/components/Disclaimer';
import { PageHero } from '@/components/PageHero';
import { usePageMeta } from '@/hooks/usePageMeta';
import { faqLd } from '@/lib/seo/jsonld';
import { canCheckout } from '@/lib/services/billing';
import { COHORT_PRICE_SAR, annualSavingsPct, monthlyEquivalent } from '@/lib/services/pricing';
import { foundingAnnualPrice, showFoundingStrike } from '@/calc/app/pricingView';
import { usePricingCheckout } from '@/hooks/usePricingCheckout';
import {
  EXAM_BUNDLE_PRICE,
  PREP_PACK_PRICE_CERT,
  PREP_PACK_PRICE_SUBJECT,
} from '@/lib/prepCatalog';
import { PricingPlanCard } from './PricingPlanCard';
import { BillingToggle } from './BillingToggle';
import { PriceBand } from './PriceBand';
import { CompareTable } from './CompareTable';
import { SchoolsBand } from './SchoolsBand';
import { PricingFaq } from './PricingFaq';
import styles from './Pricing.module.css';

/**
 * Indicative pricing (SAR). One source of truth — the display strings are
 * templated from these numbers so they can never drift. Reading the regulatory
 * library is always free; these gate acceleration, AI depth, proof and ops.
 */
const PRO_PRICE = { monthly: 59, annual: 449 };
const STUDENT_PRICE = { monthly: 39, annual: 299 };
const PASS_PRICE = 149;
// One-time exam-prep prices, sourced from the catalog so the page can't drift from the
// server price table: certificate packs price above single-subject packs, and the
// All-Access bundle unlocks every pack in one payment.
const PREP_FROM = PREP_PACK_PRICE_SUBJECT;
const PREP_CERT = PREP_PACK_PRICE_CERT;
const BUNDLE_PRICE = EXAM_BUNDLE_PRICE;
const SCHOOL_FROM = 250;
// Published B2B tier anchors (indicative, SAR) — validated with design partners; see
// docs/b2b/PLAN.md §5. Surfacing them shortens the sales cycle for the smaller tiers.
const SCHOOL_TIERS = { cohort: COHORT_PRICE_SAR, academy: 22000, institution: 40000 };
// Time-boxed founding launch: Pro annual at a lower intro price to seed the first paying
// cohort + reviews, then ratchet the list price up. Flip off when the launch window ends.
const FOUNDING_OFFER = true;
const FOUNDING_ANNUAL = 349;

interface Faq {
  q: string;
  a: string;
}

export function Pricing() {
  const { t } = useTranslation();
  usePageMeta(
    t('meta.pricing'),
    t('metaDesc.pricing'),
    faqLd(t('pricing.faq', { returnObjects: true }) as unknown as Faq[]),
  );
  const {
    annual,
    setAnnual,
    busy,
    errorKind,
    showCanceled,
    dismissCanceled,
    checkout,
    buyBundle,
    plan,
    isPaid,
  } = usePricingCheckout();

  const f = (base: string) => t(`${base}.features`, { returnObjects: true }) as unknown as string[];
  const savePct = annualSavingsPct(PRO_PRICE.monthly, PRO_PRICE.annual);

  // During the founding launch the annual price is the intro figure; the list price is
  // shown struck-through so the discount is legible.
  const proAnnual = foundingAnnualPrice(FOUNDING_OFFER, FOUNDING_ANNUAL, PRO_PRICE.annual);
  const proPrice = annual
    ? t('pricing.perYr', { n: proAnnual, eq: monthlyEquivalent(proAnnual) })
    : t('pricing.perMo', { n: PRO_PRICE.monthly });
  const proStrike = showFoundingStrike(FOUNDING_OFFER, annual)
    ? t('pricing.wasYr', { n: PRO_PRICE.annual })
    : undefined;
  const studentPrice = annual
    ? t('pricing.perYr', { n: STUDENT_PRICE.annual, eq: monthlyEquivalent(STUDENT_PRICE.annual) })
    : t('pricing.perMo', { n: STUDENT_PRICE.monthly });

  const errorText = errorKind
    ? t(errorKind === 'student-verify' ? 'pricing.studentVerifyNeeded' : 'pricing.checkoutError')
    : '';

  return (
    <section className={`container ${styles.page}`}>
      <PageHero
        align="center"
        eyebrow={t('pricing.eyebrow')}
        title={t('pricing.title')}
        subtitle={t('pricing.subtitle')}
      >
        <BillingToggle annual={annual} onChange={setAnnual} savePct={savePct} />
      </PageHero>

      <p className={styles.trustBanner}>{t('pricing.trustBanner')}</p>
      <p className={styles.planIntro}>{t(`pricing.planIntro.${plan}`)}</p>

      <div className={styles.plans}>
        <PricingPlanCard
          name={t('pricing.plans.free.name')}
          price={t('pricing.plans.free.price')}
          features={f('pricing.plans.free')}
          cta={plan === 'free' ? t('pricing.current') : t('pricing.included')}
          ctaDisabled
          current={plan === 'free'}
          currentLabel={t('pricing.yourPlan')}
        />
        <PricingPlanCard
          name={t('pricing.plans.pro.name')}
          price={proPrice}
          priceStrike={proStrike}
          priceNote={t('pricing.vatIncl')}
          features={f('pricing.plans.pro')}
          cta={
            isPaid
              ? t('account.subscription.manage')
              : busy
                ? t('pricing.checkoutBusy')
                : t('pricing.goPro')
          }
          highlight
          badge={FOUNDING_OFFER ? t('pricing.foundingBadge') : t('pricing.popular')}
          ctaHref={isPaid ? '/account' : undefined}
          ctaOnClick={
            !isPaid && canCheckout()
              ? () => void checkout(annual ? 'annual' : 'monthly')
              : undefined
          }
          ctaDisabled={busy || !canCheckout()}
          current={plan === 'pro'}
          currentLabel={t('pricing.yourPlan')}
          note={`${t('pricing.indicative')} ${t('pricing.billingNote')}`}
          belowCta={
            !isPaid && (
              <>
                {FOUNDING_OFFER && (
                  <p className={styles.foundingNote}>{t('pricing.foundingNote')}</p>
                )}
                <p className={styles.proExtras}>
                  <span>{t('pricing.trial')}</span>
                  <span>{t('pricing.moneyBack')}</span>
                </p>
                <details className={styles.studentDisc}>
                  <summary>{t('pricing.studentToggle')}</summary>
                  <p>
                    <bdi dir="ltr">{studentPrice}</bdi> · {t('pricing.studentNote')}
                  </p>
                  {canCheckout() && (
                    <button
                      type="button"
                      className="btn"
                      disabled={busy}
                      onClick={() => void checkout('student')}
                    >
                      {t('pricing.studentCta')}
                    </button>
                  )}
                </details>
              </>
            )
          }
        />
        <PricingPlanCard
          name={t('pricing.plans.school.name')}
          price={t('pricing.perSeat', { n: SCHOOL_FROM })}
          priceNote={t('pricing.vatExcl')}
          features={f('pricing.plans.school')}
          cta={plan === 'school' ? t('pricing.yourPlan') : t('pricing.contact')}
          ctaHref="/schools"
          current={plan === 'school'}
          currentLabel={t('pricing.yourPlan')}
        />
      </div>

      {showCanceled && (
        <p role="status" className={styles.canceled}>
          <span>{t('pricing.checkoutCanceled')}</span>
          <button type="button" className={styles.canceledDismiss} onClick={dismissCanceled}>
            {t('pricing.checkoutCanceledDismiss')}
          </button>
        </p>
      )}

      {errorText && (
        <p role="alert" className={styles.error}>
          {errorText}
        </p>
      )}

      {/* Exam Season Pass — serves "just need it until my checkride" buyers. */}
      <PriceBand
        id="pass-head"
        head={t('pricing.passHead')}
        lead={t('pricing.passLead')}
        price={t('pricing.pass', { n: PASS_PRICE })}
        action={
          canCheckout() ? (
            <button
              type="button"
              className={styles.passCta}
              disabled={busy}
              onClick={() => void checkout('pass')}
            >
              {t('pricing.passCta')}
            </button>
          ) : (
            // Native shells buy through store IAP, not Moyasar web checkout.
            <button type="button" className={styles.passCta} disabled aria-disabled="true">
              {t('pricing.passComingSoon')}
            </button>
          )
        }
      />

      {/* Exam Prep packs — the one-time, per-certificate path (ASA/Gleim-style). */}
      <PriceBand
        id="prep-head"
        head={t('pricing.prepHead')}
        lead={t('pricing.prepLead', { cert: PREP_CERT, subject: PREP_FROM })}
        price={t('pricing.prepPer', { n: PREP_FROM })}
        action={
          <Link to="/study/packs" className={styles.passCta}>
            {t('pricing.prepCta')}
          </Link>
        }
      />

      {/* All-Access Exam Bundle — one payment unlocks every pack (the "pay once for
          everything" buyer who won't subscribe; still cheaper than annual Pro). */}
      <PriceBand
        id="bundle-head"
        head={t('pricing.bundleHead')}
        lead={t('pricing.bundleLead')}
        price={t('pricing.bundlePrice', { n: BUNDLE_PRICE })}
        action={
          canCheckout() ? (
            <button
              type="button"
              className={styles.passCta}
              disabled={busy}
              onClick={() => void buyBundle()}
            >
              {t('pricing.bundleCta')}
            </button>
          ) : (
            <button type="button" className={styles.passCta} disabled aria-disabled="true">
              {t('pricing.passComingSoon')}
            </button>
          )
        }
      />

      <CompareTable />

      <SchoolsBand tiers={SCHOOL_TIERS} seatFrom={SCHOOL_FROM} />

      <PricingFaq />

      <Disclaimer compact />
    </section>
  );
}
