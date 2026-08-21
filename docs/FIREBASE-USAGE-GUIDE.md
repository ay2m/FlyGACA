# Firebase Authentication Usage Guide

This guide explains how to use the Firebase Authentication and Firestore integration in the Fly GACA app after setup is complete.

## Quick Start

### 1. Firebase Authentication Example Page

A complete example of Firebase authentication is available at `/firebase-auth-example`:

```bash
# Development
npm run dev
# Navigate to http://localhost:5173/firebase-auth-example
```

This page demonstrates:
- Email/password sign up and sign in
- Google Sign-in integration
- Password reset flow
- User state management with the `useAuth` hook
- Loading and error states
- Tab-based form switching

### 2. Using the `useAuth` Hook in Your Components

The simplest way to add authentication to any component:

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, loading, error, signIn, signUp, signOut, signInGoogle, resetPassword } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (user) {
    return (
      <div>
        <p>Welcome {user.email}!</p>
        <button onClick={() => signOut()}>Sign Out</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => signInGoogle()}>Sign In with Google</button>
      <button onClick={() => signIn('user@example.com', 'password')}>Sign In</button>
    </div>
  );
}
```

## Authentication Methods

### Email/Password Authentication

**Sign Up:**
```typescript
const { signUp, error } = useAuth();

async function handleSignUp() {
  try {
    await signUp('user@example.com', 'securePassword123', 'John Doe');
    // User created and logged in automatically
  } catch (err) {
    console.error('Sign up failed:', err);
  }
}
```

**Sign In:**
```typescript
const { signIn, error } = useAuth();

async function handleSignIn() {
  try {
    await signIn('user@example.com', 'securePassword123');
    // User logged in
  } catch (err) {
    console.error('Sign in failed:', err);
  }
}
```

**Password Reset:**
```typescript
const { resetPassword } = useAuth();

async function handlePasswordReset() {
  try {
    await resetPassword('user@example.com');
    // Reset email sent
  } catch (err) {
    console.error('Reset failed:', err);
  }
}
```

### Google Sign-In

```typescript
const { signInGoogle } = useAuth();

async function handleGoogleSignIn() {
  try {
    await signInGoogle();
    // User logged in with Google
  } catch (err) {
    console.error('Google sign-in failed:', err);
  }
}
```

### Phone Authentication

Coming soon. The infrastructure is in place via `setupRecaptchaVerifier()` and `sendPhoneVerificationCode()`.

## Firestore Database

### Reading Data

**Get a Single Document:**
```typescript
import { getDocument } from '@/lib/firebase-db';

interface User {
  email: string;
  displayName: string;
  createdAt: Date;
}

const user = await getDocument<User>('users', userId);
if (user) {
  console.log(`User: ${user.displayName}`);
}
```

**Query Documents:**
```typescript
import { queryDocuments } from '@/lib/firebase-db';

interface LogEntry {
  date: Date;
  flightTime: number;
  aircraft: string;
}

const entries = await queryDocuments<LogEntry>(`users/${userId}/logbook`, {
  where: [{ field: 'date', operator: '>=', value: new Date('2024-01-01') }],
  orderBy: [{ field: 'date', direction: 'desc' }],
  limit: 50,
});
```

**Paginated Queries:**
```typescript
import { queryDocumentsPaginated } from '@/lib/firebase-db';

const result = await queryDocumentsPaginated<LogEntry>(`users/${userId}/logbook`, 10, {
  orderBy: [{ field: 'date', direction: 'desc' }],
});

console.log(`Found ${result.data.length} entries`);
console.log(`Has more pages: ${result.hasMore}`);
```

### Writing Data

**Create or Overwrite a Document:**
```typescript
import { setDocument } from '@/lib/firebase-db';

await setDocument('users', userId, {
  email: user.email,
  displayName: user.displayName,
  createdAt: new Date(),
});
```

**Merge with Existing Data:**
```typescript
import { setDocument } from '@/lib/firebase-db';

await setDocument('users', userId, {
  lastUpdated: new Date(),
}, { merge: true }); // Only updates lastUpdated, preserves other fields
```

**Update Specific Fields:**
```typescript
import { updateDocument } from '@/lib/firebase-db';

await updateDocument(`users/${userId}`, 'profile', {
  displayName: 'New Name',
  photoURL: 'https://...',
});
```

**Delete a Document:**
```typescript
import { deleteDocument } from '@/lib/firebase-db';

await deleteDocument('users', userId);
```

## Combining Auth and Firestore

Here's a complete example of an authenticated logbook component:

```typescript
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getDocument, setDocument, queryDocuments } from '@/lib/firebase-db';

interface LogbookEntry {
  date: Date;
  aircraftType: string;
  flightTime: number;
  route: string;
}

export function UserLogbook() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function loadLogbook() {
      try {
        // Load user's logbook entries (stored in a subcollection)
        const data = await queryDocuments<LogbookEntry>(
          `users/${user.uid}/logbook`,
          {
            orderBy: [{ field: 'date', direction: 'desc' }],
            limit: 100,
          }
        );
        setEntries(data);
      } catch (err) {
        console.error('Failed to load logbook:', err);
      } finally {
        setLoading(false);
      }
    }

    void loadLogbook();
  }, [user]);

  if (authLoading || loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in to view your logbook</div>;

  return (
    <div>
      <h1>Flight Logbook</h1>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Aircraft</th>
            <th>Flight Time</th>
            <th>Route</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td>{entry.date.toLocaleDateString()}</td>
              <td>{entry.aircraftType}</td>
              <td>{entry.flightTime}h</td>
              <td>{entry.route}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

## State Management

### useAuth Hook Return Value

```typescript
interface UseAuthReturn {
  user: FirebaseUser | null;           // Current user or null
  loading: boolean;                    // True while checking auth state
  error: Error | null;                 // Last authentication error
  signIn: (email, password) => Promise<void>;
  signUp: (email, password, displayName?) => Promise<void>;
  signOut: () => Promise<void>;
  signInGoogle: () => Promise<void>;
  resetPassword: (email) => Promise<void>;
}
```

### FirebaseUser Object

```typescript
interface FirebaseUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  isAnonymous: boolean;
  createdAt: Date;
  lastSignInTime: Date;
}
```

## Error Handling

All authentication methods throw errors that should be caught:

```typescript
async function handleSignIn(email: string, password: string) {
  try {
    await signIn(email, password);
  } catch (error) {
    if (error instanceof Error) {
      // Firebase error codes: auth/user-not-found, auth/wrong-password, etc.
      if (error.message.includes('user-not-found')) {
        console.error('No account with this email');
      } else if (error.message.includes('wrong-password')) {
        console.error('Incorrect password');
      } else {
        console.error('Authentication failed:', error.message);
      }
    }
  }
}
```

Common Firebase error codes:
- `auth/user-not-found` - No user with this email
- `auth/wrong-password` - Incorrect password
- `auth/email-already-in-use` - Email already registered
- `auth/weak-password` - Password doesn't meet security requirements
- `auth/invalid-email` - Email format is invalid
- `auth/network-request-failed` - Network error

## Testing

### E2E Tests

Run the Firebase authentication E2E tests:

```bash
npm run test:e2e
```

Tests cover:
- Sign in form rendering
- Sign up form rendering
- Tab switching
- Form validation
- Google Sign-in button
- Network error handling
- Form state preservation
- Auth state changes

### Unit Tests

Firebase configuration is tested:

```bash
npm test -- firebase-config.test.ts
npm test -- firebase-auth.test.ts
```

## Security Considerations

### 1. Environment Variables

Never commit `.env.local` with actual Firebase credentials:
```bash
# .gitignore should include:
.env.local
```

### 2. Firestore Security Rules

Always configure security rules to restrict access:
```javascript
// Example: Users can only read/write their own data
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth != null; // Public reads
    }
  }
}
```

### 3. Password Security

- Enforce strong passwords (done via `meetsPasswordPolicy`)
- Never store passwords in Firestore
- Use HTTPS only (Firebase enforces this)
- Enable email verification

### 4. Sensitive Data

Don't store sensitive data in Firestore without encryption:
```typescript
// ❌ Don't do this:
await setDocument('users', userId, {
  creditCardNumber: '4111-1111-1111-1111',
});

// ✓ Do this instead:
// Store only non-sensitive data, use a backend service for payments
await setDocument('users', userId, {
  hasPaymentMethod: true,
});
```

## Local Development with Emulator

To use Firebase Emulator for local development:

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Start emulator
firebase emulators:start

# Set env variable in .env.local
VITE_FIREBASE_EMULATOR_HOST=localhost:8080

# Run dev server
npm run dev
```

The emulator provides:
- Offline auth testing
- Real-time Firestore operations
- No network requests
- Instant reset between tests
- Free unlimited usage

## Troubleshooting

### "Firebase is not configured"

Ensure `.env.local` has all required variables:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Auth state not persisting

Firebase uses browser local storage by default. Ensure:
- Browser allows local storage
- Not in private/incognito mode (some browsers block storage)
- Local storage is not cleared between sessions

### Firestore permission denied

Check security rules:
1. Navigate to Firebase Console → Firestore Database → Rules
2. Verify `request.auth.uid` matches the document owner
3. Ensure user is authenticated before reading/writing

### Google Sign-in not working

1. Check Firebase Console → Authentication → Sign-in methods
2. Verify Google is enabled
3. Confirm localhost:5173 is in authorized domains
4. Check browser console for CORS errors

## Next Steps

1. ✅ Set up Firebase Authentication
2. ✅ Create useAuth hook
3. ✅ Set up Firestore database operations
4. ✅ Create example auth page
5. → Integrate into your actual app pages
6. → Implement Firestore security rules
7. → Add offline support (PWA)
8. → Set up auth analytics
