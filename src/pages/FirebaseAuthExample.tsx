/**
 * Firebase Authentication Example Page
 * Demonstrates Firebase email/password, Google Sign-in, and phone authentication.
 * This is a reference implementation — integrate useAuth into your actual pages as needed.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/calc/TextField';
import { PasswordField } from '@/components/calc/PasswordField';
import { useAuth } from '@/hooks/useAuth';
import styles from './firebase-auth.module.css';

export function FirebaseAuthExample() {
  const { t } = useTranslation();
  const { user, loading, error, signIn, signUp, signOut, signInGoogle, resetPassword } =
    useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (error) {
      setMessage(error.message);
    }
  }, [error]);

  async function handleSignIn() {
    try {
      setBusy(true);
      setMessage('');
      await signIn(email, password);
      setMessage('Sign in successful!');
      setEmail('');
      setPassword('');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp() {
    try {
      setBusy(true);
      setMessage('');
      await signUp(email, password, displayName || undefined);
      setMessage('Sign up successful!');
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setBusy(true);
      setMessage('');
      await signInGoogle();
      setMessage('Google sign in successful!');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    try {
      setBusy(true);
      setMessage('');
      await resetPassword(email);
      setMessage('Password reset email sent!');
      setEmail('');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      setBusy(true);
      setMessage('');
      await signOut();
      setMessage('Signed out successfully!');
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className={styles.container}>{t('account.loading') || 'Loading...'}</div>;
  }

  if (user) {
    return (
      <div className={styles.container}>
        <Card>
          <div className={styles.header}>
            <h1>Welcome, {user.displayName || user.email}!</h1>
          </div>

          <div className={styles.userInfo}>
            <p>
              <strong>Email:</strong> {user.email}
            </p>
            <p>
              <strong>UID:</strong> {user.uid}
            </p>
            <p>
              <strong>Email Verified:</strong> {user.emailVerified ? 'Yes' : 'No'}
            </p>
          </div>

          {message && (
            <Alert tone={message.includes('Error') ? 'error' : 'success'} role="status">
              {message}
            </Alert>
          )}

          <Button
            variant="clay"
            onClick={handleSignOut}
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? 'Signing out...' : 'Sign Out'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Card>
        <div className={styles.header}>
          <h1>Firebase Authentication Demo</h1>
          <p>Test email/password, Google Sign-in, and account recovery</p>
        </div>

        {message && (
          <Alert tone={message.includes('Error') ? 'error' : 'success'} role="status">
            {message}
          </Alert>
        )}

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${mode === 'signin' ? styles.active : ''}`}
            onClick={() => {
              setMode('signin');
              setMessage('');
            }}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`${styles.tab} ${mode === 'signup' ? styles.active : ''}`}
            onClick={() => {
              setMode('signup');
              setMessage('');
            }}
            type="button"
          >
            Sign Up
          </button>
          <button
            className={`${styles.tab} ${mode === 'reset' ? styles.active : ''}`}
            onClick={() => {
              setMode('reset');
              setMessage('');
            }}
            type="button"
          >
            Reset Password
          </button>
        </div>

        <div className={styles.form}>
          {mode === 'signin' && (
            <>
              <TextField
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="you@example.com"
              />
              <PasswordField label="Password" value={password} onChange={setPassword} />
              <Button
                variant="clay"
                onClick={handleSignIn}
                disabled={busy || !email || !password}
                aria-busy={busy || undefined}
                className={styles.fullWidth}
              >
                {busy ? 'Signing in...' : 'Sign In'}
              </Button>
            </>
          )}

          {mode === 'signup' && (
            <>
              <TextField
                label="Display Name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="John Doe"
              />
              <TextField
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="you@example.com"
              />
              <PasswordField label="Password" value={password} onChange={setPassword} />
              <Button
                variant="clay"
                onClick={handleSignUp}
                disabled={busy || !email || !password}
                aria-busy={busy || undefined}
                className={styles.fullWidth}
              >
                {busy ? 'Creating account...' : 'Create Account'}
              </Button>
            </>
          )}

          {mode === 'reset' && (
            <>
              <TextField
                label="Email"
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="you@example.com"
              />
              <Button
                variant="clay"
                onClick={handleResetPassword}
                disabled={busy || !email}
                aria-busy={busy || undefined}
                className={styles.fullWidth}
              >
                {busy ? 'Sending reset email...' : 'Send Reset Email'}
              </Button>
            </>
          )}
        </div>

        <div className={styles.divider}>or</div>

        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={busy}
          aria-busy={busy || undefined}
          className={styles.fullWidth}
        >
          {busy ? 'Signing in...' : 'Continue with Google'}
        </Button>
      </Card>
    </div>
  );
}
