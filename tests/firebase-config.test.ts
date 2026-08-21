import { describe, it, expect, beforeEach } from 'vitest';
import { getFirebaseConfig } from '@/lib/firebase-config';

describe('Firebase Configuration', () => {
  beforeEach(() => {
    // Reset environment
    vi.resetModules();
  });

  it('should load Firebase config from environment variables', () => {
    const config = getFirebaseConfig();

    expect(config).toBeDefined();
    expect(config.apiKey).toBe(import.meta.env.VITE_FIREBASE_API_KEY);
    expect(config.authDomain).toBe(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
    expect(config.projectId).toBe('flygaca-prod');
    expect(config.storageBucket).toBe(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
    expect(config.messagingSenderId).toBe(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
    expect(config.appId).toBe(import.meta.env.VITE_FIREBASE_APP_ID);
  });

  it('should have all required Firebase config fields', () => {
    const config = getFirebaseConfig();
    const requiredFields = [
      'apiKey',
      'authDomain',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId',
    ];

    for (const field of requiredFields) {
      expect(config[field as keyof typeof config]).toBeTruthy();
    }
  });

  it('should have correct project ID', () => {
    const config = getFirebaseConfig();
    expect(config.projectId).toBe('flygaca-prod');
  });
});
