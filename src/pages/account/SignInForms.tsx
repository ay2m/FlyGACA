import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/calc/TextField';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/ui/Button';
import { signIn } from '@/lib/services/account';
import { looksLikeEmail } from '@/calc/app/emailShape';
import { useSignInForm } from '@/hooks/useSignInForm';
import { GoogleMark } from './GoogleMark';
import { AppleMark } from './AppleMark';
import { SignInFormBody } from './SignInFormBody';
import { SignUpFormBody } from './SignUpFormBody';
import styles from './AccountPage.module.css';

export function BackendSignIn() {
  const { t } = useTranslation();
  const {
    mode,
    animating,
    busy,
    errors,
    notice,
    mainSiteHref,
    toggleMode,
    forgotPassword,
    loginForm,
    signupForm,
    runGoogle,
    runApple,
  } = useSignInForm();

  const containerClass = `${styles.fadeTransition} ${animating ? styles.animating : ''}`;

  // The general-error band, shared by the sign-in and sign-up forms. On a
  // domain-authorization failure it also carries the click-through to the
  // authorized main site.
  const errorAlert = errors.general ? (
    <Alert tone="error" role="alert" icon="⚠">
      {errors.general}
      {mainSiteHref && (
        <>
          {' '}
          <a className={styles.alertLink} href={mainSiteHref}>
            {t('account.errors.useMainSite')}
          </a>
        </>
      )}
    </Alert>
  ) : null;

  return (
    <>
      <div className={styles.oauthButtons}>
        <Button
          type="button"
          variant="clayPrimary"
          icon={<GoogleMark />}
          className={styles.halfWidth}
          disabled={busy}
          onClick={runGoogle}
        >
          {t('account.continueGoogle')}
        </Button>
        <Button
          type="button"
          variant="clayPrimary"
          icon={<AppleMark />}
          className={styles.halfWidth}
          disabled={busy}
          onClick={runApple}
        >
          {t('account.continueApple')}
        </Button>
      </div>
      <p className={styles.divider}>{t('account.or')}</p>

      <div className={containerClass}>
        {mode === 'in' ? (
          <SignInFormBody form={loginForm} busy={busy} errorAlert={errorAlert} notice={notice} />
        ) : (
          <SignUpFormBody form={signupForm} busy={busy} errorAlert={errorAlert} notice={notice} />
        )}
      </div>

      <div className={styles.signInLinks}>
        <button type="button" className={styles.linkBtn} onClick={toggleMode}>
          {mode === 'in' ? t('account.needAccount') : t('account.haveAccount')}
        </button>
        {mode === 'in' && (
          <button type="button" className={styles.linkBtn} disabled={busy} onClick={forgotPassword}>
            {t('account.forgotPassword')}
          </button>
        )}
      </div>
    </>
  );
}

export function LocalSignIn() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return (
    <>
      <form
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault();
          const trimmed = email.trim();
          if (!trimmed) return;
          if (!looksLikeEmail(trimmed)) {
            setError(t('account.errors.invalidEmail'));
            return;
          }
          setError('');
          signIn(trimmed, name);
        }}
      >
        <TextField
          label={t('account.email')}
          value={email}
          onChange={(v) => {
            setEmail(v);
            if (error) setError('');
          }}
          type="email"
          placeholder="you@example.com"
          error={error}
        />
        <TextField label={t('account.name')} value={name} onChange={setName} />
        <Button
          type="submit"
          variant="clayPrimary"
          className={styles.fullWidth}
          disabled={!email.trim()}
        >
          {t('account.signIn')}
        </Button>
      </form>
      <p className={styles.note}>{t('account.localNote')}</p>
    </>
  );
}

/**
 * Shown in a PRODUCTION build when the auth backend isn't configured. It deliberately
 * offers NO form and mints NO session — a config-less deploy must never present a
 * working "email + name" sign-in that looks like a real account. The email+name
 * `LocalSignIn` is a local-first dev convenience only (see the chooser in
 * AccountSignedOut).
 */
export function AuthUnavailable() {
  const { t } = useTranslation();
  return (
    <Alert tone="warning" role="status">
      <strong>{t('account.unavailableTitle')}</strong> {t('account.unavailableBody')}
    </Alert>
  );
}
