/**
 * Firestore database module.
 * Provides typed methods for reading and writing documents.
 */

import {
  getFirestore,
  Firestore,
  connectFirestoreEmulator,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { initializeFirebase } from './firebase-auth';

let db: Firestore | null = null;

/** Get or initialize Firestore instance. */
export function getDb(): Firestore {
  if (!db) {
    const app = initializeFirebase();
    db = getFirestore(app);

    // Connect to emulator in development if configured
    if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATOR_HOST) {
      try {
        const [host, port] = import.meta.env.VITE_FIREBASE_EMULATOR_HOST.split(':');
        connectFirestoreEmulator(db, host, parseInt(port, 10));
      } catch {
        // Emulator already connected
      }
    }
  }
  return db;
}

// ============================================================================
// Document Operations
// ============================================================================

/** Get a single document by ID. */
export async function getDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
): Promise<T | null> {
  const db = getDb();
  const docRef = doc(db, collectionName, docId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data() as T) : null;
}

/** Create or overwrite a document. */
export async function setDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: T,
  options?: { merge?: boolean },
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, collectionName, docId);
  await setDoc(docRef, data, { merge: options?.merge ?? false });
}

/** Update specific fields in a document. */
export async function updateDocument<T extends DocumentData>(
  collectionName: string,
  docId: string,
  data: Partial<T>,
): Promise<void> {
  const db = getDb();
  const docRef = doc(db, collectionName, docId);
  await updateDoc(docRef, data);
}

/** Delete a document. */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  const db = getDb();
  const docRef = doc(db, collectionName, docId);
  await deleteDoc(docRef);
}

// ============================================================================
// Query Operations
// ============================================================================

export interface QueryOptions {
  where?: Array<{ field: string; operator: '<' | '<=' | '==' | '!=' | '>=' | '>'; value: unknown }>;
  orderBy?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
  limit?: number;
}

/** Query documents with optional filters, ordering, and limit. */
export async function queryDocuments<T extends DocumentData>(
  collectionName: string,
  options?: QueryOptions,
): Promise<T[]> {
  const db = getDb();
  const constraints: QueryConstraint[] = [];

  // Add where clauses
  if (options?.where) {
    for (const w of options.where) {
      constraints.push(where(w.field, w.operator, w.value));
    }
  }

  // Add ordering
  if (options?.orderBy) {
    for (const o of options.orderBy) {
      constraints.push(orderBy(o.field, o.direction || 'asc'));
    }
  }

  // Add limit
  if (options?.limit) {
    constraints.push(firestoreLimit(options.limit));
  }

  const q = query(collection(db, collectionName), ...constraints);
  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(
    (doc) =>
      ({
        ...doc.data(),
        id: doc.id,
      }) as T,
  );
}

/** Query documents and return paginated results. */
export async function queryDocumentsPaginated<T extends DocumentData>(
  collectionName: string,
  pageSize: number,
  options?: QueryOptions,
): Promise<{ data: T[]; hasMore: boolean; pageSize: number }> {
  const db = getDb();
  const constraints: QueryConstraint[] = [];

  // Add where clauses
  if (options?.where) {
    for (const w of options.where) {
      constraints.push(where(w.field, w.operator, w.value));
    }
  }

  // Add ordering
  if (options?.orderBy) {
    for (const o of options.orderBy) {
      constraints.push(orderBy(o.field, o.direction || 'asc'));
    }
  }

  // Request one more than page size to determine if there are more pages
  constraints.push(firestoreLimit(pageSize + 1));

  const q = query(collection(db, collectionName), ...constraints);
  const querySnapshot = await getDocs(q);

  const data = querySnapshot.docs.slice(0, pageSize).map(
    (doc) =>
      ({
        ...doc.data(),
        id: doc.id,
      }) as T,
  );

  const hasMore = querySnapshot.docs.length > pageSize;

  return { data, hasMore, pageSize };
}

/** Get all documents in a collection. */
export async function getAllDocuments<T extends DocumentData>(
  collectionName: string,
): Promise<T[]> {
  const db = getDb();
  const querySnapshot = await getDocs(collection(db, collectionName));
  return querySnapshot.docs.map(
    (doc) =>
      ({
        ...doc.data(),
        id: doc.id,
      }) as T,
  );
}
