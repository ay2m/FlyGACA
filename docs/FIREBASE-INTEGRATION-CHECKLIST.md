# Firebase Integration Checklist

This checklist guides you through setting up and using Firebase Authentication and Firestore in the Fly GACA app.

## 1. Firebase Console Setup

- [ ] Go to [Firebase Console](https://console.firebase.google.com)
- [ ] Select the `flygaca-prod` project
- [ ] Register a **Web App** (if not already done)
- [ ] Copy your Firebase config credentials

## 2. Environment Configuration

- [ ] Copy `.env.example` to `.env.local`
- [ ] Fill in all Firebase credentials:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_MEASUREMENT_ID` (optional)

## 3. Enable Authentication Methods

### Email/Password
- [ ] Go to **Authentication** → **Sign-in method**
- [ ] Enable **Email/Password**
- [ ] Enable **Email link sign-in** (optional)

### Google Sign-in
- [ ] Enable **Google** sign-in method
- [ ] Add authorized domains:
  - `localhost:5173` (dev)
  - `localhost:3000` (preview)
  - Your production domain

### Phone Authentication
- [ ] Enable **Phone** sign-in method
- [ ] Configure **reCAPTCHA Enterprise**
- [ ] Get reCAPTCHA site key

## 4. Set Up Firestore Database

- [ ] Go to **Firestore Database**
- [ ] Create a database in **test mode** (dev)
- [ ] Choose appropriate region
- [ ] Replace test rules with production rules (see `FIREBASE-SETUP.md`)

## 5. Configure Firestore Security Rules

- [ ] Update Firestore rules for:
  - User profiles: `/users/{userId}`
  - User logbook: `/users/{userId}/logbook/{entry}`
  - User study progress: `/users/{userId}/studyProgress/{progress}`
  - Public collections: read-only
  - Deny all other access

## 6. Import Authentication in Your App

### In Your Main App Component

```typescript
import { initializeFirebase } from '@/lib/firebase-auth';

// Initialize on app load
useEffect(() => {
  initializeFirebase();
}, []);
```

### In Pages/Components Using Auth

```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, loading, error, signIn, signUp, signOut, signInGoogle } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (user) return <div>Welcome {user.email}!</div>;

  return <SignInForm onSignIn={signIn} />;
}
```

## 7. Access User Data from Firestore

### Reading User Data

```typescript
import { queryDocuments, getDocument } from '@/lib/firebase-db';

// Get single document
const userProfile = await getDocument('users', userId);

// Query documents
const entries = await queryDocuments(`users/${userId}/logbook`, {
  orderBy: [{ field: 'date', direction: 'desc' }],
  limit: 50,
});
```

### Writing User Data

```typescript
import { setDocument, updateDocument } from '@/lib/firebase-db';

// Create or overwrite
await setDocument('users', userId, {
  email: user.email,
  displayName: user.displayName,
  createdAt: new Date(),
});

// Update specific fields
await updateDocument(`users/${userId}`, 'profile', {
  displayName: 'New Name',
});
```

## 8. Test Authentication

- [ ] Test email/password sign up
- [ ] Test email/password sign in
- [ ] Test Google sign-in
- [ ] Test sign out
- [ ] Test password reset email
- [ ] Verify user data appears in Firestore

## 9. Test Firestore Security

- [ ] Verify unauthenticated users cannot write to their own documents
- [ ] Verify users can only read/write their own data
- [ ] Verify public collections are readable by anyone
- [ ] Test cross-user access is denied

## 10. Deploy Configuration

### For Production Deployment

- [ ] Set all Firebase environment variables in GCP Secret Manager
- [ ] Enable Cloud SQL, Cloud Run (if using hybrid setup)
- [ ] Configure CORS for Firebase domains
- [ ] Update Firebase Security Rules for production
- [ ] Set up Firestore backup
- [ ] Enable Firestore point-in-time recovery (PITR)
- [ ] Configure email templates in Firebase Console
- [ ] Set custom domain for auth emails

### For Firebase Hosting

- [ ] Run `npm run build` to create production build
- [ ] Run `firebase deploy --only hosting`
- [ ] Verify deployment at your Firebase Hosting URL

## 11. Optional: Local Development with Emulator

- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Run emulator: `firebase emulators:start`
- [ ] Set `VITE_FIREBASE_EMULATOR_HOST=localhost:8080` in `.env.local`
- [ ] Develop against local emulator
- [ ] Test production flows before deploying

## 12. Migrate Existing User Data (if applicable)

- [ ] Export user data from old system
- [ ] Write migration script to import into Firestore
- [ ] Verify data integrity after import
- [ ] Test auth against migrated data
- [ ] Archive old data (don't delete immediately)

## 13. Post-Launch

- [ ] Monitor Firebase Console for errors
- [ ] Check Firestore usage and optimize indexes if needed
- [ ] Review authentication logs for suspicious activity
- [ ] Set up Firestore auto-scaling policies
- [ ] Configure backups and disaster recovery
- [ ] Monitor costs (especially if usage spikes)

## Common Issues & Solutions

### "Firebase is not configured"
- Check all `VITE_FIREBASE_*` environment variables
- Restart dev server after updating `.env.local`
- Verify variables are spelled correctly

### Authentication not working
- Enable the authentication method in Firebase Console
- Check authorized domains
- Verify reCAPTCHA (for Phone auth)
- Check browser console for CORS errors

### Firestore permission denied
- Check security rules
- Verify user is authenticated
- Ensure document path matches rules
- Check request.auth.uid matches userId in path

### Performance Issues
- Create Firestore indexes for commonly queried fields
- Paginate large result sets
- Use field masks to limit data transfer
- Enable Firestore compression

## Resources

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Firebase Console](https://console.firebase.google.com)

## Next Steps

1. Complete all checklist items above
2. Read `FIREBASE-SETUP.md` for detailed configuration
3. Review `src/lib/firebase-auth.ts` and `src/lib/firebase-db.ts` for API details
4. Test the `AuthExample` component at `/auth-example` route
5. Integrate auth into your actual pages/components
6. Deploy to Firebase Hosting or your preferred platform
