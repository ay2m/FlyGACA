import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/calc/TextField';
import { PasswordField } from '@/components/calc/PasswordField';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/ui/Button';
import type { LoginForm } from '@/hooks/useSignInForm';
import styles from './AccountPage.module.css';

/** The email + password sign-in form body. Presentational. */
export function SignInFormBody({
  form,
  busy,
  errorAlert,
  notice,
}: {
  form: LoginForm;
  busy: boolean;
  /** The shared general-error band (built once by the parent). */
  errorAlert: ReactNode;
  notice: string;
}) {
  const { t } = useTranslation();
  return (
    <form className={styles.fields} onSubmit={form.handleSubmit} noValidate>
      <TextField
        label={t('account.email')}
        value={form.values.email}
        onChange={(v) => form.setFieldValue('email', v)}
        onBlur={() => form.handleBlur('email')}
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={form.touched.email ? form.errors.email : undefined}
      />
      <PasswordField
        label={t('account.password')}
        value={form.values.password}
        onChange={(v) => form.setFieldValue('password', v)}
        onBlur={() => form.handleBlur('password')}
        autoComplete="current-password"
        error={form.touched.password ? form.errors.password : undefined}
      />
      {errorAlert}
      {notice && (
        <Alert tone="success" role="status" icon="✓">
          {notice}
        </Alert>
      )}
      <Button
        type="submit"
        variant="clay"
        className={styles.fullWidth}
        aria-busy={busy || undefined}
        disabled={busy || !form.values.email.trim() || !form.values.password}
      >
        {t('account.signIn')}
      </Button>
    </form>
  );
}
