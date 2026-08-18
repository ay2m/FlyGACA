/**
 * All of the Firebase sign-in / sign-up form state and choreography in one hook:
 * the in↔up mode toggle, both `useForm` instances (with validation), the shared
 * auth-call runner (`run` — dismiss handling, error-code → field/general mapping,
 * the mirror-host "use the main site" link), and forgot-password. The page keeps
 * only the JSX. Pure decisions are reused from `@/calc/app/*`
 * (`authError`, `emailShape`, `passwordPolicy`); the auth side effects stay in
 * `@/lib/services/auth`.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  registerWithEmail,
  sendPasswordReset,
  signInWithEmail,
  signInWithGoogle,
} from '@/lib/services/auth';
import {
  AUTH_TIMEOUT_CODE,
  authErrorInfo,
  isAuthDismiss,
  isDomainAuthError,
} from '@/calc/app/authError';
import { looksLikeEmail } from '@/calc/app/emailShape';
import { meetsPasswordPolicy } from '@/calc/app/passwordPolicy';
import { SITE_ORIGIN, isMirrorHost } from '@/lib/seo/seo';
import { useForm } from '@/hooks/useForm';

/** How long an auth call may run before the watchdog reports a timeout. */
export const AUTH_TIMEOUT_MS = 20_000;

export interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
  general?: string;
}

export type LoginForm = ReturnType<typeof useForm<{ email: string; password: string }>>;
export type SignupForm = ReturnType<
  typeof useForm<{ name: string; email: string; password: string; confirmPassword: string }>
>;

export interface SignInForm {
  mode: 'in' | 'up';
  animating: boolean;
  busy: boolean;
  errors: FieldErrors;
  notice: string;
  /** Set when auth fails because this (mirror/preview) host isn't authorized. */
  mainSiteHref: string | null;
  toggleMode: () => void;
  forgotPassword: () => void;
  loginForm: LoginForm;
  signupForm: SignupForm;
  /** Continue-with-Google, wrapped in the shared runner. */
  runGoogle: () => void;
}

export function useSignInForm(): SignInForm {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [animating, setAnimating] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  // Set when a sign-in fails because *this* host isn't an authorized Firebase
  // origin (a preview/mirror deploy). The remedy is to sign in on the canonical
  // site, so we surface a real click-through link on the error alert.
  const [mainSiteHref, setMainSiteHref] = useState<string | null>(null);

  const toggleMode = () => {
    setAnimating(true);
    setTimeout(() => {
      setMode((m) => (m === 'in' ? 'up' : 'in'));
      setErrors({});
      setNotice('');
      loginForm.resetForm();
      signupForm.resetForm();
    }, 200);
    setTimeout(() => {
      setAnimating(false);
    }, 400);
  };

  async function run(
    fn: () => Promise<unknown>,
    setFormErrors?: (errs: Partial<Record<string, string>>) => void,
  ) {
    setBusy(true);
    setErrors({});
    setNotice('');
    setMainSiteHref(null);
    // Watchdog: when the App Check / reCAPTCHA Enterprise token can't be minted,
    // the Firebase SDK promise never settles — without this race the button spins
    // forever with no feedback. Reject with a synthetic Firebase-shaped code so
    // the standard mapping below surfaces the timeout message.
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject({ code: AUTH_TIMEOUT_CODE }), AUTH_TIMEOUT_MS);
        }),
      ]);
    } catch (e) {
      const code = (e as { code?: string }).code;
      // Closing the Google popup (or opening a second one) isn't a failure — the
      // `finally` clears busy, so bail silently instead of flashing a scary error.
      if (isAuthDismiss(code)) return;
      const { field, key } = authErrorInfo(code);
      const generic = key === 'account.authError';
      if (generic) console.error('Auth failure', code, e);

      let errorMessage = t(key);
      // For deployment/config/unknown failures (never credential ones), append the
      // raw Firebase code so the exact cause is visible and copyable from the page —
      // it maps 1:1 to the triage steps in docs/RUNBOOK-firebase.md and ends the
      // "still broken but which error?" guessing loop.
      if (field === 'general' && code) {
        errorMessage = `${errorMessage} ${t('account.errors.technicalDetail', { code })}`;
      }

      // A domain-authorization failure on a preview/mirror host is a dead end here
      // ("use the main site" with nowhere to go). Turn it into a click-through to
      // the same page on the canonical origin, which *is* an authorized domain.
      if (
        isDomainAuthError(code) &&
        typeof window !== 'undefined' &&
        isMirrorHost(window.location.hostname)
      ) {
        setMainSiteHref(`${SITE_ORIGIN}${window.location.pathname}`);
      }

      if (setFormErrors && (field === 'email' || field === 'password')) {
        setFormErrors({ [field]: errorMessage });
      } else {
        setErrors({ [field]: errorMessage });
      }
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setBusy(false);
    }
  }

  const loginForm = useForm({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const errs: FieldErrors = {};
      if (!values.email.trim()) {
        errs.email = t('account.errors.invalidEmail');
      } else if (!looksLikeEmail(values.email.trim())) {
        errs.email = t('account.errors.invalidEmail');
      }
      if (!values.password) {
        errs.password = t('account.passwordRequired');
      }
      return errs;
    },
    onSubmit: async (values) => {
      await run(() => signInWithEmail(values.email.trim(), values.password), loginForm.setErrors);
    },
  });

  const signupForm = useForm({
    initialValues: { name: '', email: '', password: '', confirmPassword: '' },
    validate: (values) => {
      const errs: FieldErrors & { confirmPassword?: string } = {};
      if (!values.name.trim()) {
        errs.name = t('account.nameRequired');
      }
      if (!values.email.trim()) {
        errs.email = t('account.errors.invalidEmail');
      } else if (!looksLikeEmail(values.email.trim())) {
        errs.email = t('account.errors.invalidEmail');
      }
      if (!values.password) {
        errs.password = t('account.passwordRequired');
      } else if (!meetsPasswordPolicy(values.password)) {
        errs.password = t('account.errors.passwordTooWeak');
      }
      if (values.password !== values.confirmPassword) {
        errs.confirmPassword = t('account.errors.passwordsDoNotMatch');
      }
      return errs;
    },
    onSubmit: async (values) => {
      await run(
        () =>
          registerWithEmail(values.email.trim(), values.password, values.name.trim() || undefined),
        signupForm.setErrors,
      );
    },
  });

  function forgotPassword() {
    const emailToUse =
      mode === 'in' ? loginForm.values.email.trim() : signupForm.values.email.trim();
    if (!emailToUse) {
      if (mode === 'in') {
        loginForm.setErrors({ email: t('account.resetNeedEmail') });
      } else {
        signupForm.setErrors({ email: t('account.resetNeedEmail') });
      }
      return;
    }
    void run(async () => {
      await sendPasswordReset(emailToUse);
      setNotice(t('account.resetSent'));
    });
  }

  return {
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
    runGoogle: () => void run(signInWithGoogle),
  };
}
