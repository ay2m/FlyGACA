/**
 * Example authentication component demonstrating Firebase Auth usage.
 * This component shows email/password, Google, and phone authentication.
 * Remove or refactor this when integrating into your actual app.
 */

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import styles from './AuthExample.module.css';

type AuthMode = 'signin' | 'signup' | 'phone' | 'reset';

export function AuthExample() {
  const { user, loading, error, signIn, signUp, signInGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');

  if (loading) {
    return <div className={styles.container}>Loading authentication...</div>;
  }

  if (user) {
    return (
      <div className={styles.container}>
        <h1>Welcome!</h1>
        <p>
          Signed in as: <strong>{user.email}</strong>
        </p>
        {user.displayName && <p>Name: {user.displayName}</p>}
        <p>
          User ID: <code>{user.uid}</code>
        </p>
        <button
          onClick={async () => {
            // Sign out is in the useAuth hook
            window.location.reload(); // Refresh after sign out
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      await signUp(email, password, displayName || undefined);
      setMessage('Account created! You are now signed in.');
      // Clear form
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign up failed';
      setMessage(`Error: ${errorMsg}`);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      await signIn(email, password);
      setMessage('Signed in successfully!');
      // Clear form
      setEmail('');
      setPassword('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Sign in failed';
      setMessage(`Error: ${errorMsg}`);
    }
  };

  const handleGoogleSignIn = async () => {
    setMessage('');

    try {
      await signInGoogle();
      setMessage('Signed in with Google!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Google sign in failed';
      setMessage(`Error: ${errorMsg}`);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      await resetPassword(email);
      setMessage('Password reset email sent! Check your inbox.');
      setEmail('');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Password reset failed';
      setMessage(`Error: ${errorMsg}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Fly GACA Authentication</h1>

        {/* Mode Tabs */}
        <div className={styles.tabs}>
          <button
            className={mode === 'signin' ? styles.tabActive : ''}
            onClick={() => setMode('signin')}
          >
            Sign In
          </button>
          <button
            className={mode === 'signup' ? styles.tabActive : ''}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
          <button
            className={mode === 'reset' ? styles.tabActive : ''}
            onClick={() => setMode('reset')}
          >
            Reset Password
          </button>
        </div>

        {/* Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleEmailSignIn} className={styles.form}>
            <h2>Sign In</h2>
            <div className={styles.formGroup}>
              <label htmlFor="email-signin">Email</label>
              <input
                id="email-signin"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="password-signin">Password</label>
              <input
                id="password-signin"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className={styles.button}>
              Sign In
            </button>

            <div className={styles.divider}>or</div>

            <button type="button" onClick={handleGoogleSignIn} className={styles.buttonGoogle}>
              Sign In with Google
            </button>
          </form>
        )}

        {/* Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleEmailSignUp} className={styles.form}>
            <h2>Create Account</h2>
            <div className={styles.formGroup}>
              <label htmlFor="displayname">Display Name (optional)</label>
              <input
                id="displayname"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Captain Adel"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email-signup">Email</label>
              <input
                id="email-signup"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="password-signup">Password</label>
              <input
                id="password-signup"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" className={styles.button}>
              Create Account
            </button>

            <div className={styles.divider}>or</div>

            <button type="button" onClick={handleGoogleSignIn} className={styles.buttonGoogle}>
              Sign Up with Google
            </button>
          </form>
        )}

        {/* Password Reset Form */}
        {mode === 'reset' && (
          <form onSubmit={handlePasswordReset} className={styles.form}>
            <h2>Reset Password</h2>
            <p className={styles.help}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <div className={styles.formGroup}>
              <label htmlFor="email-reset">Email</label>
              <input
                id="email-reset"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <button type="submit" className={styles.button}>
              Send Reset Link
            </button>
          </form>
        )}

        {/* Messages */}
        {(error || message) && (
          <div className={error ? styles.errorBox : styles.successBox}>
            {error ? error.message : message}
          </div>
        )}
      </div>
    </div>
  );
}
