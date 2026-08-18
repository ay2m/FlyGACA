# Backend & Security Architecture Survey: Fly GACA ATO Admin & Cohort Onboarding Dashboard (R2)

## 1. Observation

### 1.1 Existing Architecture & File Inventory
- **Functions Entry Point & Manifest (`functions/src/index.ts`)**:
  - Exports callables: `getMyOrgs`, `getCohortReadiness`, `provisionSeats` (lines 44 in `functions/src/index.ts`), `claimSchoolSeat` (line 35), `claimStaffAccess` (line 31), `claimFoundingAccess` (line 39), billing callables (`createCheckoutConfig`, `confirmPayment`, `cancelAutoRenew`, `moyasarWebhook`, `renewMoyasarSubscriptions`), and the Express chat gateway `chat` on line 50.
  - Pinned region: `REGION = "me-central2"` (`functions/src/region.ts`, Dammam, KSA for PDPL compliance).
  - Global option: `setGlobalOptions({ maxInstances: 10 })` (line 64).

- **Current Org & School Core Implementation**:
  - `functions/src/org.ts`: Implements `getMyOrgs`, `getCohortReadiness`, `provisionSeats`. All callables use `enforceAppCheck: true`, `memory: "256MiB"`, `region: REGION`.
  - `functions/src/org-core.ts`: Pure business rules for input validation (`parseProvisionInput`), seat limit guardrails (`checkSeatLimit`), invite doc generation (`buildInvite`), and cohort creation (`buildCohortOrg`).
  - `functions/src/school.ts`: Implements `claimSchoolSeat` allowing verified email users to claim school seat entitlements based on domain or `schoolInvites/{email}`.
  - `functions/src/school-core.ts`: Defines `SeatStatus` (`"active" | "expired" | "invited" | "none"`), `Readiness` (`coveredBanks`, `totalBanks`, `examBest`, `ready`), and `CohortRow`.
  - `functions/src/billing-core.ts`: Defines `Plan = "free" | "pro" | "school"` and `Entitlement = { plan: Plan; expiresAt?: string; source?: "moyasar" | "revenuecat" | "school" | "staff" | "founding" }`.

- **Current Firestore Security Rules (`firestore.rules`)**:
  - Strict user isolation for `/users/{uid}` (lines 82-155), `/users/{uid}/logbook/{entry}` (lines 95-112), `/users/{uid}/records/{entry}` (lines 118-129), and `/users/{uid}/progress/{doc}` (lines 136-154).
  - `users/{uid}/logbook/{entry}` allows access ONLY if `isOwner(uid)`.
  - Current `orgs/{orgId}` rules (lines 198-203):
    ```firestore
    match /orgs/{orgId} {
      allow read, write: if false;
      match /members/{uid} {
        allow read, write: if false;
      }
    }
    ```
  - Catch-all rule (lines 268-270): `match /{document=**} { allow read, write: if false; }`.

- **Rules Test Suite (`tests/rules/firestore-rules.test.ts`)**:
  - Comprehensive unit test suite (542 lines) using `@firebase/rules-unit-testing` testing profile isolation, logbook access denial to other users, entitlement immutability from client side, and server-only collections.

- **Client Services (`src/lib/services/org.ts` & `src/lib/services/school.ts`)**:
  - `src/lib/services/org.ts`: Exports `getMyOrgs()`, `getCohortReadiness(orgId)`, `provisionSeats(orgId, emails, expiresAt)`.
  - `src/lib/services/school.ts`: Exports `claimSchoolSeatIfEligible(email, emailVerified)`.

---

## 2. Logic Chain

### 2.1 Analysis of Requirements vs Codebase State
1. **Multi-Tenant Hierarchy & Isolation (`schools/{schoolId}/roster/{cadetUid}`)**:
   - *Observation*: Current implementation uses `orgs/{orgId}` and `orgs/{orgId}/members/{uid}` which is deny-all in security rules and queried only via Admin SDK in Cloud Functions.
   - *Logic*: For ATO Flight School Admin & Cohort Dashboard, we need explicit multi-tenant architecture supporting `schools/{schoolId}` and subcollections `schools/{schoolId}/roster/{cadetUid}` and `schools/{schoolId}/analytics/summary`.
   - *Security Requirement*: Instructors belonging to `schools/{schoolId}` must be able to read cadet roster entries in their school, but under NO circumstances should instructors be able to read `/users/{cadetUid}/logbook/{entry}` or `/users/{cadetUid}/records/{entry}`.
   - *Enforcement*: `firestore.rules` must introduce `isSchoolStaff(schoolId)` or `isSchoolInstructor(schoolId)` helper checking `request.auth.uid in get(/databases/$(database)/documents/schools/$(schoolId)).data.instructorUids || request.auth.uid in get(/databases/$(database)/documents/schools/$(schoolId)).data.ownerUids`.

2. **Seat Granting & Revocation Cloud Functions (`grantSchoolLicence` & `revokeSchoolLicence`)**:
   - *Observation*: `functions/src/org.ts` has `provisionSeats` (which creates `schoolInvites`) and `functions/src/school.ts` has `claimSchoolSeat` (which claims). There is no direct admin callable to grant or revoke an active cadet license immediately with atomic seat ledger updates.
   - *Logic*: We must implement dedicated, audited Cloud Functions:
     - `grantSchoolLicence`: Verifies caller is school owner/instructor, verifies school seat limit is not exceeded, sets `users/{cadetUid}.entitlement = { plan: "school", source: "school", expiresAt }`, updates `schools/{schoolId}/roster/{cadetUid}` with `status: "active"`, and tracks license expiration.
     - `revokeSchoolLicence`: Verifies caller is school owner/instructor, verifies cadet exists, downgrades `users/{cadetUid}.entitlement = { plan: "free" }`, marks `schools/{schoolId}/roster/{cadetUid}.status = "revoked"`, and decrements active seat count.

3. **KSA PDPL Privacy & Consent Model (`consent: true`)**:
   - *Observation*: Saudi Personal Data Protection Law (PDPL, Royal Decree M/19) requires explicit consent before personal educational metrics and activity are disclosed to third parties (including training academies).
   - *Logic*:
     - The cadet document in `schools/{schoolId}/roster/{cadetUid}` must have `consent: boolean` (default `false` upon invite, `true` when cadet accepts onboarding invitation).
     - Cadets can update their own consent flag (`isOwner(cadetUid)`) via Firestore security rule on `schools/{schoolId}/roster/{cadetUid}`.
     - When `consent == false`, progress analytics in cohort readiness views must mask individual study records or omit granular telemetry.
     - Private logbook entries (`/users/{uid}/logbook/*`) remain 100% private to the pilot.

4. **Backward Compatibility & Alias Strategy**:
   - *Observation*: Both UK/Saudi aviation spelling ("licence") and US spelling ("license") are commonly encountered, as well as `orgs` vs `schools`.
   - *Logic*: Export `grantSchoolLicence` as primary (GACA nomenclature) and alias `grantSchoolLicense` if needed. Support `schools/{schoolId}` as the canonical collection while maintaining compatibility with `orgs/{orgId}` where applicable.

---

## 3. Caveats

1. **Firestore Rules Emulator Network Sandbox**: Running `npm test` in the root sandbox environment restricts raw socket connections to local ports unless executed in the emulator test runner (`npm run test:rules`).
2. **KSA Data Residency**: All Firestore instances and Cloud Functions must remain deployed in `me-central2` (Dammam) region as pinned in `functions/src/region.ts`.
3. **Local-First Degradation**: If Firebase is unconfigured or in offline/development mode, client-side services in `src/lib/services/` degrade gracefully to mock data without throwing exceptions.

---

## 4. Conclusion & Proposed Specification

### 4.1 Data Schema Specifications

#### `schools/{schoolId}` Document Schema
```typescript
interface SchoolDoc {
  id: string;                         // e.g. "sn-aviation-academy", "oxford-saudia"
  name: string;                       // e.g. "Saudi National Aviation Academy"
  nameAr?: string;                     // e.g. "الأكاديمية السعودية للطيران المدني"
  atoNumber: string;                  // GACA ATO Certificate (e.g. "GACA-ATO-042")
  ownerUids: string[];                // Academy Directors / Primary Admins
  instructorUids: string[];           // Authorized Ground & Flight Instructors
  seatLimit: number;                  // Maximum licensed seats (e.g. 50)
  activeSeats: number;                // Currently allocated active seats
  licenceExpiresAt: string;           // ISO 8601 School Contract Expiration
  passThreshold: number;              // Passing standard % (default 75)
  banks: string[];                    // Tracked GACAR packs (['aip-ais', 'airspace', 'gacar-061'])
  createdAt: string;                  // ISO 8601
  updatedAt: string;                  // ISO 8601
}
```

#### `schools/{schoolId}/roster/{cadetUid}` Document Schema
```typescript
interface SchoolRosterDoc {
  cadetUid: string;                   // Firebase Auth UID
  email: string;                      // Cadet email (normalized lowercase)
  displayName?: string;               // Cadet full name
  cadetId?: string;                   // Academy Student ID (e.g. "CAD-2026-089")
  cohortId?: string;                  // Class Batch / Cohort (e.g. "Cohort-26-Alpha")
  trainingTrack?: "PPL" | "CPL" | "IR" | "ATPL" | "GACA Part 141 ATO";
  status: "active" | "invited" | "revoked" | "expired";
  consent: boolean;                   // KSA PDPL explicit consent flag
  consentedAt?: string;               // ISO 8601 timestamp of consent grant
  seatGrantedAt: string;              // ISO 8601
  seatExpiresAt?: string;             // ISO 8601 (aligned with school contract)
  grantedBy: string;                  // Instructor/Owner UID
  metrics?: {
    srsRetentionPct: number;          // Leitner SRS Retention Rate (0-100)
    mockExamPassRate: number;         // Mock Exam Pass Rate % (0-100)
    examBest: number;                 // Best Mock Exam Score (0-100)
    examCount: number;                // Total Mock Exams Attempted
    coveredBanks: number;             // Banks >= passThreshold
    totalBanks: number;               // Expected banks in track
    ready: boolean;                   // GACA Exam Ready indicator
    lastActive: string;               // ISO 8601
    updatedAt: string;                // ISO 8601
  };
}
```

#### `schools/{schoolId}/analytics/summary` Aggregated Schema (for R3)
```typescript
interface SchoolAnalyticsSummary {
  schoolId: string;
  totalEnrolled: number;
  activeSeats: number;
  readyCadets: number;
  avgSrsRetention: number;
  avgMockScore: number;
  healthScore: number;                // 5-factor composite score (0-100)
  updatedAt: string;
}
```

### 4.2 Cloud Functions API Signatures

1. **`grantSchoolLicence` (`functions/src/org.ts`)**:
   - Callable definition:
     ```typescript
     export const grantSchoolLicence = onCall(CALL_OPTS, async (request) => {
       // 1. Auth check: request.auth?.uid required.
       // 2. Validate input: { schoolId, cadetUid?, email, cadetId?, cohortId?, trainingTrack?, expiresAt? }
       // 3. Ownership/Instructor check: caller UID in school.ownerUids or school.instructorUids.
       // 4. Seat limit verification: activeSeats < seatLimit.
       // 5. Entitlement grant: users/{cadetUid}.entitlement = { plan: "school", source: "school", expiresAt }.
       // 6. Write roster doc: schools/{schoolId}/roster/{cadetUid}.
       // 7. Update school.activeSeats count.
       // Return: { success: true, cadetUid, status: "active", expiresAt }
     });
     ```

2. **`revokeSchoolLicence` (`functions/src/org.ts`)**:
   - Callable definition:
     ```typescript
     export const revokeSchoolLicence = onCall(CALL_OPTS, async (request) => {
       // 1. Auth check: request.auth?.uid required.
       // 2. Validate input: { schoolId, cadetUid, reason? }
       // 3. Ownership/Instructor check.
       // 4. Reset user entitlement: users/{cadetUid}.entitlement = { plan: "free" }.
       // 5. Update roster doc: schools/{schoolId}/roster/{cadetUid}.status = "revoked".
       // 6. Decrement school.activeSeats count.
       // Return: { success: true, cadetUid, status: "revoked" }
     });
     ```

3. **`updateCadetConsent` (`functions/src/org.ts` or direct Firestore rule)**:
   - Cadets can update their own consent flag directly or through callable.

### 4.3 Proposed Firestore Security Rules Addition (`firestore.rules`)

```firestore
    // Helper: Is the caller an authorized instructor or owner of the school?
    function isSchoolInstructor(schoolId) {
      return signedIn() && (
        (request.auth.uid in get(/databases/$(database)/documents/schools/$(schoolId)).data.ownerUids) ||
        (request.auth.uid in get(/databases/$(database)/documents/schools/$(schoolId)).data.instructorUids)
      );
    }

    // Helper: Is the caller a registered cadet of the school?
    function isSchoolCadet(schoolId, cadetUid) {
      return isOwner(cadetUid) &&
        exists(/databases/$(database)/documents/schools/$(schoolId)/roster/$(cadetUid));
    }

    // Schools multi-tenant root
    match /schools/{schoolId} {
      // Instructors/owners and enrolled cadets can read school metadata
      allow read: if isSchoolInstructor(schoolId) ||
                     (signedIn() && exists(/databases/$(database)/documents/schools/$(schoolId)/roster/$(request.auth.uid)));
      // School creation/updates handled server-side
      allow write: if false;

      // Cadet Roster Subcollection
      match /roster/{cadetUid} {
        // Instructors can read all roster docs; Cadets can read only their own
        allow read: if isSchoolInstructor(schoolId) || isOwner(cadetUid);

        // Cadets can update ONLY their own PDPL consent and timestamp
        allow update: if isOwner(cadetUid)
          && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['consent', 'consentedAt', 'updatedAt'])
          && request.resource.data.consent is bool;

        // Direct creation/deletion forbidden to clients (must use Cloud Functions)
        allow create, delete: if false;
      }

      // Pre-aggregated analytics summary (R3)
      match /analytics/{doc} {
        allow read: if isSchoolInstructor(schoolId);
        allow write: if false;
      }
    }
```

---

## 5. Verification Method

1. **Unit Test Verification (Pure Core)**:
   ```bash
   cd functions && npx vitest run tests/org-core.test.ts tests/school-core.test.ts
   ```
2. **Callable Integration Test Verification**:
   ```bash
   cd functions && npx vitest run tests/org-routes.test.ts
   ```
3. **Firestore Security Rules Unit Tests**:
   ```bash
   npm run test:rules
   ```
   *Asserts that*:
   - Instructors can read `schools/{schoolId}/roster/{cadetUid}`.
   - Instructors CANNOT read `users/{cadetUid}/logbook/*` (fails with permission denied).
   - Cadets can read and toggle consent on their own `schools/{schoolId}/roster/{cadetUid}`.
   - Non-school users are denied all access.
4. **Functions TypeScript Compilation**:
   ```bash
   cd functions && npx tsc --noEmit
   ```
