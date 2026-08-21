# Firebase Authentication & Firestore Setup Guide

This guide walks through setting up Firebase Authentication and Firestore for the Fly GACA app.

## Prerequisites

- An existing Firebase project (`flygaca-prod`)
- Access to Firebase Console: https://console.firebase.google.com
- A web app registered in your Firebase project

## Step 1: Register a Web App in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your `flygaca-prod` project
3. Click **Project Settings** (gear icon at top)
4. Go to **Your apps** tab
5. If no web app exists, click **Add app** and select **Web**
6. Copy the configuration object (you'll see something like):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD...",
  authDomain: "flygaca-prod.firebaseapp.com",
  projectId: "flygaca-prod",
  storageBucket: "flygaca-prod.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-XXXXXXXXXX"
};
```

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase credentials:

```bash
cp .env.example .env.local
```

Then update `.env.local` with your Firebase config:

```env
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=flygaca-prod.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=flygaca-prod
VITE_FIREBASE_STORAGE_BUCKET=flygaca-prod.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123def456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Step 3: Enable Authentication Methods

### Email/Password Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click **Enable** next to "Email/Password"
3. Toggle on both:
   - Email/Password
   - Email link (optional)

### Google Sign-in

1. In **Sign-in method**, click **Enable** next to "Google"
2. Select a project support email
3. Add authorized domains:
   - `localhost:5173` (development)
   - `localhost:3000` (if using Vite preview)
   - Your production domain (e.g., `flygaca.com`)
4. Save changes

### Phone Authentication

1. In **Sign-in method**, click **Enable** next to "Phone"
2. Ensure reCAPTCHA Enterprise is configured:
   - Go to **reCAPTCHA Admin Console**
   - Create a site key for your domain
   - Copy the key to your Firebase project settings
3. Note: Phone auth requires SSL/HTTPS in production

## Step 4: Set Up Firestore

1. In Firebase Console, go to **Firestore Database**
2. Click **Create database**
3. Start in **test mode** (for development):
   ```
   allow read, write: if request.time < timestamp.date(2025, 1, 1);
   ```
4. Choose your region (e.g., `us-central1` or `europe-west1`)
5. Click **Create**

## Step 5: Configure Firestore Security Rules

Update your Firestore security rules to protect user data. Replace the test mode rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // User logbook entries
    match /users/{userId}/logbook/{entry} {
      allow read, write: if request.auth.uid == userId;
    }

    // User study progress
    match /users/{userId}/studyProgress/{progress} {
      allow read, write: if request.auth.uid == userId;
    }

    // Public collections (read-only)
    match /regulations/{document=**} {
      allow read: if true;
    }

    match /tools/{document=**} {
      allow read: if true;
    }

    // Deny everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Step 6: Using Firebase Auth in Components

### Basic Sign Up / Sign In

```typescript
import { useAuth } from '@/hooks/useAuth';

export function AuthForm() {
  const { user, loading, error, signUp, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (loading) return <div>Loading...</div>;
  if (user) return <div>Welcome {user.email}!</div>;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await signUp(email, password);
        } catch (err) {
          console.error('Sign up failed:', err);
        }
      }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign Up</button>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}
    </form>
  );
}
```

### Google Sign-in Button

```typescript
import { useAuth } from '@/hooks/useAuth';

export function GoogleSignIn() {
  const { signInGoogle, loading } = useAuth();

  return (
    <button onClick={() => signInGoogle()} disabled={loading}>
      Sign in with Google
    </button>
  );
}
```

### Protected Route

```typescript
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router';

export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/signin" />;

  return children;
}
```

## Step 7: Using Firestore Database

### Writing Data

```typescript
import { setDocument } from '@/lib/firebase-db';
import { useAuth } from '@/hooks/useAuth';

export function LogbookForm() {
  const { user } = useAuth();

  const handleSave = async (entry) => {
    if (!user) return;

    await setDocument(
      `users/${user.uid}/logbook`, // Collection path
      Date.now().toString(),         // Document ID
      entry,                         // Data
      { merge: false }              // Options
    );
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSave({ date: new Date(), duration: 2.5 });
    }}>
      {/* Form fields */}
      <button type="submit">Save Entry</button>
    </form>
  );
}
```

### Reading Data

```typescript
import { useEffect, useState } from 'react';
import { queryDocuments } from '@/lib/firebase-db';
import { useAuth } from '@/hooks/useAuth';

export function LogbookList() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!user) return;

    const loadEntries = async () => {
      const data = await queryDocuments(
        `users/${user.uid}/logbook`,
        {
          orderBy: [{ field: 'date', direction: 'desc' }],
          limit: 50,
        }
      );
      setEntries(data);
    };

    loadEntries();
  }, [user]);

  return (
    <div>
      {entries.map((entry) => (
        <div key={entry.id}>{entry.date} - {entry.duration} hours</div>
      ))}
    </div>
  );
}
```

## Step 8: Troubleshooting

### "Firebase is not configured"

Make sure all Firebase environment variables in `.env.local` are set correctly.

### Authentication not working

1. Check that the auth method is **enabled** in Firebase Console
2. Verify your domain is in the **authorized domains** list
3. For Google Sign-in, ensure your **OAuth consent screen** is configured

### Firestore permission denied

1. Check your **Firestore Security Rules** — they may be too restrictive
2. Make sure the user is **authenticated** (check `console.log(user)`)
3. Verify the document path matches your rules

### Emulator Setup (Development)

To use Firebase Local Emulator:

```bash
npm install -g firebase-tools
firebase emulators:start
```

Then set in `.env.local`:

```env
VITE_FIREBASE_EMULATOR_HOST=localhost:8080
```

## Next Steps

- Set up Firestore backup and restore
- Configure Cloud Functions for server-side logic
- Add custom claims for role-based access control
- Set up Firebase Hosting for automatic deployment
- Configure Firestore indexes for production queries

## Resources

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Console](https://console.firebase.google.com)
