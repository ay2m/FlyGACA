import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import i18n, { applyDocumentLang, type Lang } from '@/i18n';
import { initReactI18next } from 'react-i18next';
import { clearJsonCache } from '@/lib/content';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

// The runtime JSON loader memoizes per path in a module-level cache; clear it
// between tests so a stubbed fetch in one test never leaks into the next.
afterEach(() => {
  clearJsonCache();
});

// Initialize i18n for components using translation hooks/functions under Vitest.
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  interpolation: {
    escapeValue: false, // React already escapes values
  },
  returnNull: false,
});

// Update document language/direction attributes when changing language in tests
i18n.on('languageChanged', (next) => {
  applyDocumentLang(next as Lang);
});

// Define robust in-memory Storage mock to replace native Node 22+ localStorage/sessionStorage
class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] !== undefined ? keys[index] : null;
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
  configurable: true,
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, 'sessionStorage', {
    value: mockSessionStorage,
    writable: true,
    configurable: true,
  });
}

// jsdom doesn't implement scrollIntoView; components that keep an active item in
// view (e.g. the command palette) call it in an effect. Make it a no-op.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
