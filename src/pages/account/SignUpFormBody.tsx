import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { TextField } from '@/components/calc/TextField';
import { PasswordField } from '@/components/calc/PasswordField';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/ui/Button';
import { PasswordStrength } from '@/components/account/PasswordStrength';
import type { SignupForm } from '@/hooks/useSignInForm';
import styles from './AccountPage.module.css';

/** The name + email + password + confirm sign-up form body. Presentational. */
export function SignUpFormBody({
  form,
  busy,
  errorAlert,
  notice,
}: {
  form: SignupForm;
  busy: boolean;
  /** The shared general-error band (built once by the parent). */
  errorAlert: ReactNode;
  notice: string;
}) {
  const { t } = useTranslation();
  return (
    <form className={styles.fields} onSubmit={form.handleSubmit} noValidate>
      <TextField
        label={t('account.name')}
        value={form.values.name}
        onChange={(v) => form.setFieldValue('name', v)}
        onBlur={() => form.handleBlur('name')}
        error={form.touched.name ? form.errors.name : undefined}
      />
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
        autoComplete="new-password"
        error={form.touched.password ? form.errors.password : undefined}
      />
      <PasswordStrength password={form.values.password} />
      <PasswordField
        label={t('account.confirmPassword')}
        value={form.values.confirmPassword}
        onChange={(v) => form.setFieldValue('confirmPassword', v)}
        onBlur={() => form.handleBlur('confirmPassword')}
        autoComplete="new-password"
        error={form.touched.confirmPassword ? form.errors.confirmPassword : undefined}
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
        disabled={
          busy ||
          !form.values.name.trim() ||
          !form.values.email.trim() ||
          !form.values.password ||
          !form.values.confirmPassword
        }
      >
        {t('account.register')}
      </Button>
    </form>
  );
}
