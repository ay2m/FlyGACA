import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAccount } from '@/lib/services/account';

/** Gates the account surfaces: shows a sign-in prompt when there is no session. */
export function RequireSession({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { session } = useAccount();
  if (!session) {
    return (
      <section
        className="container-narrow"
        style={{ paddingBlock: 'var(--space-12)', textAlign: 'center' }}
      >
        <p style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-4)' }}>
          {t('account.needSignIn')}
        </p>
        <Link className="btn btn-primary" to="/account">
          {t('account.goSignIn')}
        </Link>
      </section>
    );
  }
  return <>{children}</>;
}
