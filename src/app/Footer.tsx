import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '@/components/LangToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Disclaimer } from '@/components/Disclaimer';
import { ExternalLink } from '@/components/ExternalLink';
import styles from './Footer.module.css';

/** Scrolls to the top, honouring the user's reduced-motion preference. */
function scrollToTop() {
  const reduce =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}

/** Brand-monochrome social glyphs (Simple Icons paths) — inherit `currentColor`. */
const SOCIAL_ICONS: Record<string, ReactNode> = {
  x: (
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  ),
  snapchat: (
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.78-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.298 1.104.298.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06Z" />
  ),
  facebook: (
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  ),
  instagram: (
    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
  ),
  linkedin: (
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  ),
};

/** FlyGACA social profiles, in display order. */
const SOCIALS = [
  { key: 'x', href: 'https://x.com/flygacax' },
  { key: 'snapchat', href: 'https://www.snapchat.com/@flygaca' },
  { key: 'facebook', href: 'https://www.facebook.com/flygaca' },
  { key: 'instagram', href: 'https://www.instagram.com/flygaca' },
  { key: 'linkedin', href: 'https://www.linkedin.com/company/flygaca' },
] as const;

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="container">
        {/* Brand + two tidy link columns. */}
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link className={styles.lockup} to="/" aria-label={t('nav.home')} viewTransition>
              <img
                src="/img/flygaca-mark.png"
                alt=""
                width={32}
                height={32}
                loading="lazy"
                decoding="async"
              />
              <span className={styles.wordmark} aria-hidden="true">
                <span className={styles.wmFly}>Fly</span>
                <span className={styles.wmGaca}>GACA</span>
              </span>
            </Link>
            <p className={styles.tagline}>{t('footer.tagline')}</p>
            <a className={styles.contact} href="mailto:i@flygaca.com">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-10 5L2 7" />
              </svg>
              i@flygaca.com
            </a>
            <ul className={styles.social} aria-label={t('footer.followUs')}>
              {SOCIALS.map((s) => (
                <li key={s.key}>
                  <ExternalLink
                    className={styles.socialLink}
                    href={s.href}
                    aria-label={t(`footer.social.${s.key}`)}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      {SOCIAL_ICONS[s.key]}
                    </svg>
                  </ExternalLink>
                </li>
              ))}
            </ul>
          </div>

          <nav className={styles.col} aria-label={t('footer.explore')}>
            <h2>{t('footer.explore')}</h2>
            <ul>
              <li>
                <Link to="/library" viewTransition>
                  {t('nav.library')}
                </Link>
              </li>
              <li>
                <Link to="/chat" viewTransition>
                  {t('nav.captainAdel')}
                </Link>
              </li>
              <li>
                <Link to="/tools" viewTransition>
                  {t('footer.flightTools')}
                </Link>
              </li>
              <li>
                <Link to="/learn" viewTransition>
                  {t('nav.learn')}
                </Link>
              </li>
              <li>
                <Link to="/pricing" viewTransition>
                  {t('nav.pricing')}
                </Link>
              </li>
              <li>
                <Link to="/schools" viewTransition>
                  {t('nav.schools')}
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.col} aria-label={t('footer.legal')}>
            <h2>{t('footer.legal')}</h2>
            <ul>
              <li>
                <Link to="/support" viewTransition>
                  {t('footer.support')}
                </Link>
              </li>
              <li>
                <Link to="/disclaimer" viewTransition>
                  {t('footer.disclaimerLink')}
                </Link>
              </li>
              <li>
                <Link to="/terms" viewTransition>
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/privacy" viewTransition>
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/refund" viewTransition>
                  {t('footer.refund')}
                </Link>
              </li>
              <li>
                <Link to="/safety" viewTransition>
                  {t('footer.safety')}
                </Link>
              </li>
              <li>
                <a href="/sitemap.xml" target="_blank" rel="noopener">
                  {t('footer.sitemap')}
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* The not-affiliated notice + a calm reminder to check the official source. */}
        <div className={styles.notice}>
          <Disclaimer />
          <p className={styles.verify}>
            <span className={styles.verifyLabel}>{t('footer.verify')}</span>
            <a href="https://gaca.gov.sa" target="_blank" rel="noopener">
              {t('footer.gacaSite')}
            </a>
            <a
              href="https://gaca.gov.sa/en/Rules-and-Regulations-Category"
              target="_blank"
              rel="noopener"
            >
              {t('footer.gacaRules')}
            </a>
          </p>
          <p className={styles.legalEntity}>{t('footer.legalEntity')}</p>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {year} {t('footer.copyright')}
          </span>
          <button type="button" className={styles.backToTop} onClick={scrollToTop}>
            <span>{t('common.backToTop')}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>
          <ThemeToggle className={styles.langToggle} />
          <LangToggle className={styles.langToggle} />
        </div>
      </div>
    </footer>
  );
}
