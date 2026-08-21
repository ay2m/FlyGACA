/**
 * useAuth hook — provides current user and auth methods to components.
 */

import { useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  initializeFirebase,
  getFirebaseAuth,
  signOutUser,
  signInWithEmail,
  signUpWithEmail,
  sendPasswordReset,
  signInWithGoogle,
  onAuthStateChange,
} from '@/lib/firebase-auth';

export interface UseAuthReturn {
  user: FirebaseUser | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize Firebase on mount
  useEffect(() => {
    initializeFirebase();
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmail({ email, password });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      try {
        setError(null);
        await signUpWithEmail({ email, password, displayName });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        throw error;
      }
    },
    [],
  );

  const signOutHandler = useCallback(async () => {
    try {
      setError(null);
      await signOutUser();
      setUser(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const signInGoogle = useCallback(async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      setError(null);
      await sendPasswordReset(email);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    }
  }, []);

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut: signOutHandler,
    signInGoogle,
    resetPassword,
  };
}
