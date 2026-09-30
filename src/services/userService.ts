import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserAccount, UserRole, TeacherExercise } from '../types';

const USERS_COLLECTION = 'users';
const EXERCISES_COLLECTION = 'exercises';
const SYSTEM_COLLECTION = 'system';
const CUSTOM_GROUPS_STORAGE_KEY = 'faltkoll_custom_groups';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  rethrow = false
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  if (rethrow) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export const STANDARD_STUDENT_GROUPS = [
  'Byggprogrammet (BA)',
  'Anläggare (Mark & Anläggning)',
  'Vuxenutbildning (Yrkesvux)',
  'Gymnasie (Åk 1–3)',
  'Gymnasie Åk 1 (BA1)',
  'Gymnasie Åk 2 (BA2)',
  'Gymnasie Åk 3 (BA3)',
  'Anläggare Vuxen',
  'Lärling / APL',
  'Osorterad / Allmän',
];

/**
 * Returns numeric rank for role hierarchy:
 * - ADMIN (Huvudadmin) = Rank 4 (Högst)
 * - SCHOOL_ADMIN (Skoladmin) = Rank 3
 * - TEACHER (Yrkeslärare) = Rank 2 (Mellan)
 * - STUDENT (Elev / Lärling) = Rank 1 (Lägst)
 */
export function getRoleRank(role: UserRole | undefined | null): number {
  if (role === 'ADMIN') return 4;
  if (role === 'SCHOOL_ADMIN') return 3;
  if (role === 'TEACHER') return 2;
  return 1;
}

export function getRoleRankLabel(role: UserRole | undefined | null): string {
  if (role === 'ADMIN') return 'Rank 4 • Huvudadmin';
  if (role === 'SCHOOL_ADMIN') return 'Rank 3 • Skoladmin';
  if (role === 'TEACHER') return 'Rank 2 • Yrkeslärare';
  return 'Rank 1 • Elev / Lärling';
}

/**
 * Rank-based authorization check:
 * - ADMIN (Rank 4) & SCHOOL_ADMIN (Rank 3): Kan ändra ALLT på alla konton
 * - TEACHER (Rank 2): Kan redigera sitt eget konto samt alla konton UNDER sin rank (dvs. STUDENT / Elev med Rank 1)
 * - STUDENT (Rank 1): Kan INTE ändra något alls (varken på sitt eget eller andras konton)
 */
export function canEditUser(actor: UserAccount | null | undefined, target: UserAccount): boolean {
  if (!actor) return false;
  if (actor.role === 'ADMIN' || actor.role === 'SCHOOL_ADMIN') return true;
  if (actor.role === 'TEACHER') {
    return actor.id === target.id || getRoleRank(target.role) < getRoleRank(actor.role);
  }
  return false;
}

/**
 * Check if the actor can change a user's role to newRole
 */
export function canChangeRoleTo(actor: UserAccount | null | undefined, newRole: UserRole): boolean {
  if (!actor) return false;
  if (actor.role === 'ADMIN' || actor.role === 'SCHOOL_ADMIN') return true;
  if (actor.role === 'TEACHER') return newRole === 'STUDENT';
  return false;
}

/**
 * Check if the actor can delete the target user
 */
export function canDeleteUser(actor: UserAccount | null | undefined, target: UserAccount): boolean {
  if (!actor) return false;
  // Nobody can delete the primary system administrator or their own active session
  if (
    target.id === 'usr_admin_main' ||
    target.email.toLowerCase() === 'admin@faltkoll.se' ||
    actor.id === target.id
  ) {
    return false;
  }
  if (actor.role === 'ADMIN' || actor.role === 'SCHOOL_ADMIN') return true;
  if (actor.role === 'TEACHER') {
    return getRoleRank(target.role) < getRoleRank(actor.role);
  }
  return false;
}

/**
 * Get all available student groups (Standard + Custom created by teachers/admins)
 */
export function getAllStudentGroups(): string[] {
  let custom: string[] = [];
  try {
    const raw = localStorage.getItem(CUSTOM_GROUPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) custom = parsed;
    }
  } catch {}

  const merged = [...STANDARD_STUDENT_GROUPS];
  custom.forEach((g) => {
    const clean = String(g || '').trim();
    if (clean && !merged.some((m) => m.toLowerCase() === clean.toLowerCase())) {
      merged.splice(merged.length - 1, 0, clean); // Insert before 'Osorterad / Allmän'
    }
  });
  return merged;
}

export function getCustomStudentGroups(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_GROUPS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function getLocalCustomStudentGroups(): string[] {
  return getCustomStudentGroups();
}

export async function saveCustomStudentGroupsToCloud(customGroups: string[]): Promise<void> {
  try {
    localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(customGroups));
  } catch {}
  try {
    const ref = doc(db, SYSTEM_COLLECTION, 'student_groups');
    await setDoc(
      ref,
      {
        id: 'student_groups',
        customGroups,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${SYSTEM_COLLECTION}/student_groups`);
  }
}

export async function fetchCustomStudentGroupsFromCloud(): Promise<string[]> {
  try {
    const ref = doc(db, SYSTEM_COLLECTION, 'student_groups');
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if (data && Array.isArray(data.customGroups)) {
        const local = getCustomStudentGroups();
        const combined = Array.from(new Set([...data.customGroups, ...local]));
        try {
          localStorage.setItem(CUSTOM_GROUPS_STORAGE_KEY, JSON.stringify(combined));
        } catch {}
        return combined;
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `${SYSTEM_COLLECTION}/student_groups`);
  }
  return getCustomStudentGroups();
}

/**
 * Normalizes email or identifier for safe and consistent lookups
 */
export function normalizeIdentifier(val: string): string {
  return String(val || '')
    .trim()
    .toLowerCase();
}

/**
 * Infers educationLevel and specialization from group name if not explicitly set
 */
export function enrichUserGroupMetadata(user: UserAccount): UserAccount {
  const grp = (user.studentGroup || '').toLowerCase();
  let educationLevel = user.educationLevel;
  let specialization = user.specialization;

  if (!educationLevel) {
    if (grp.includes('vux')) educationLevel = 'VUXEN';
    else if (grp.includes('lärling') || grp.includes('apl')) educationLevel = 'LARLING';
    else if (user.role === 'TEACHER' || user.role === 'ADMIN') educationLevel = 'PERSONAL';
    else educationLevel = 'GYMNASIE';
  }

  if (!specialization) {
    if (grp.includes('anlägg')) specialization = 'ANLAGGARE';
    else if (grp.includes('bygg')) specialization = 'BYGGPROGRAMMET';
    else if (grp.includes('hus')) specialization = 'HUSBYGGNAD';
    else if (grp.includes('mark') || grp.includes('maskin')) specialization = 'MARK_VA';
    else specialization = 'ALLMAN';
  }

  return {
    ...user,
    educationLevel,
    specialization,
  };
}

/**
 * Saves or updates a user directly in Google Cloud Firestore.
 * Ensures the account is IMMEDIATELY available across all devices worldwide.
 */
export async function saveUserToCloud(user: UserAccount): Promise<boolean> {
  try {
    const enriched = enrichUserGroupMetadata(user);
    const cleanUser: UserAccount = {
      ...enriched,
      email: normalizeIdentifier(enriched.email),
      displayName: String(enriched.displayName || '').trim(),
      password: enriched.password ? String(enriched.password).trim() : '1234',
      lastLogin: enriched.lastLogin || new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    // Primary document by ID
    const primaryRef = doc(db, USERS_COLLECTION, cleanUser.id);
    await setDoc(primaryRef, cleanUser, { merge: true });

    // Secondary index document by normalized email/username for instant O(1) retrieval
    if (cleanUser.email) {
      const emailSafeKey = `account_${cleanUser.email.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const emailRef = doc(db, USERS_COLLECTION, emailSafeKey);
      await setDoc(emailRef, cleanUser, { merge: true });
    }

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${USERS_COLLECTION}/${user.id}`);
    return false;
  }
}

/**
 * Finds a user directly in Google Cloud Firestore by email or username or ID.
 */
export async function findUserInCloud(identifier: string): Promise<UserAccount | null> {
  const norm = normalizeIdentifier(identifier);
  if (!norm) return null;

  try {
    // 1. Try fast email key lookup
    const emailSafeKey = `account_${norm.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const emailRef = doc(db, USERS_COLLECTION, emailSafeKey);
    const emailSnap = await getDoc(emailRef);
    if (emailSnap.exists()) {
      const data = emailSnap.data() as UserAccount;
      if (data && data.email) return enrichUserGroupMetadata(data);
    }

    // 2. Try direct ID lookup
    const idRef = doc(db, USERS_COLLECTION, norm);
    const idSnap = await getDoc(idRef);
    if (idSnap.exists()) {
      const data = idSnap.data() as UserAccount;
      if (data && data.email) return enrichUserGroupMetadata(data);
    }

    // 3. Query collection where email == norm
    const emailQuery = query(
      collection(db, USERS_COLLECTION),
      where('email', '==', norm),
      limit(1)
    );
    const emailResults = await getDocs(emailQuery);
    if (!emailResults.empty) {
      return enrichUserGroupMetadata(emailResults.docs[0].data() as UserAccount);
    }

    // 4. Query collection where displayName == identifier
    const nameQuery = query(
      collection(db, USERS_COLLECTION),
      where('displayName', '==', identifier.trim()),
      limit(1)
    );
    const nameResults = await getDocs(nameQuery);
    if (!nameResults.empty) {
      return enrichUserGroupMetadata(nameResults.docs[0].data() as UserAccount);
    }

    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, USERS_COLLECTION);
    return null;
  }
}

/**
 * Fetches all user accounts from Google Cloud Firestore.
 */
export async function fetchAllUsersFromCloud(): Promise<UserAccount[]> {
  try {
    const colRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(colRef);
    const users: UserAccount[] = [];
    const seen = new Set<string>();

    snap.forEach((docSnap) => {
      const data = docSnap.data() as UserAccount;
      if (data && data.id && data.email && data.role) {
        if (!seen.has(data.id)) {
          seen.add(data.id);
          users.push(enrichUserGroupMetadata(data));
        }
      }
    });

    return users;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, USERS_COLLECTION);
    return [];
  }
}

/**
 * Removes a user from Google Cloud Firestore.
 */
export async function deleteUserFromCloud(userId: string, email?: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, userId));
    if (email) {
      const norm = normalizeIdentifier(email);
      const emailSafeKey = `account_${norm.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      await deleteDoc(doc(db, USERS_COLLECTION, emailSafeKey));
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${USERS_COLLECTION}/${userId}`);
    return false;
  }
}

/**
 * Saves or updates a teacher exercise in Google Cloud Firestore.
 */
export async function saveExerciseToCloud(exercise: TeacherExercise): Promise<boolean> {
  try {
    const cleanId = exercise.id || `ex_${Date.now()}`;
    const cleanCode = (exercise.code || 'FK-' + Math.floor(1000 + Math.random() * 9000))
      .trim()
      .toUpperCase();

    const cleanEx: TeacherExercise = {
      ...exercise,
      id: cleanId,
      code: cleanCode,
      title: String(exercise.title || '').trim(),
      updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    };

    // Save primary document by ID
    const primaryRef = doc(db, EXERCISES_COLLECTION, cleanId);
    await setDoc(primaryRef, cleanEx, { merge: true });

    // Save secondary lookup by Code
    const codeSafeKey = `code_${cleanCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const codeRef = doc(db, EXERCISES_COLLECTION, codeSafeKey);
    await setDoc(codeRef, cleanEx, { merge: true });

    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${EXERCISES_COLLECTION}/${exercise.id}`);
    return false;
  }
}

/**
 * Fetches all teacher exercises from Google Cloud Firestore.
 */
export async function fetchAllExercisesFromCloud(): Promise<TeacherExercise[]> {
  try {
    const colRef = collection(db, EXERCISES_COLLECTION);
    const snap = await getDocs(colRef);
    const exercises: TeacherExercise[] = [];
    const seen = new Set<string>();

    snap.forEach((docSnap) => {
      const data = docSnap.data() as TeacherExercise;
      if (data && data.id && data.title && data.code) {
        if (!seen.has(data.id)) {
          seen.add(data.id);
          exercises.push(data);
        }
      }
    });

    return exercises;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, EXERCISES_COLLECTION);
    return [];
  }
}

/**
 * Deletes an exercise from Google Cloud Firestore.
 */
export async function deleteExerciseFromCloud(exerciseId: string, code?: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, EXERCISES_COLLECTION, exerciseId));
    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const codeSafeKey = `code_${cleanCode.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      await deleteDoc(doc(db, EXERCISES_COLLECTION, codeSafeKey));
    }
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `${EXERCISES_COLLECTION}/${exerciseId}`);
    return false;
  }
}
