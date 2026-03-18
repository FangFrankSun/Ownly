import {
  disableNetwork,
  enableNetwork,
  waitForPendingWrites,
} from 'firebase/firestore';

import { db } from './firebase-client';

const DEFAULT_FIRESTORE_ACTION_TIMEOUT_MS = 5000;
const DEFAULT_FIRESTORE_ACK_TIMEOUT_MS = 12000;

export async function withFirestoreTimeout<T>(
  operation: Promise<T>,
  timeoutMs = DEFAULT_FIRESTORE_ACTION_TIMEOUT_MS,
  timeoutMessage = 'Firestore did not finish the request before timing out.'
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(timeoutMessage));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export async function waitForFirestoreWriteSync(
  firestore: NonNullable<typeof db>,
  timeoutMs = DEFAULT_FIRESTORE_ACK_TIMEOUT_MS
) {
  return withFirestoreTimeout(
    waitForPendingWrites(firestore),
    timeoutMs,
    'Timed out waiting for Firestore to sync changes to the server.'
  );
}

export async function recoverFirestoreNetwork(firestore: NonNullable<typeof db>) {
  try {
    await disableNetwork(firestore);
  } catch {
    // Best-effort reset to unstick a stale Firestore connection.
  }

  try {
    await enableNetwork(firestore);
  } catch {
    // Let the caller surface the original error.
  }
}

export function getFirestoreErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return '';
}

export function isQuotaExceededError(error: unknown) {
  const code = getFirestoreErrorCode(error).toLowerCase();
  return code.includes('resource-exhausted') || code.includes('quota');
}

export function toFirestoreWriteErrorMessage(error: unknown, fallbackError: string) {
  if (isQuotaExceededError(error)) {
    return 'Cloud Firestore write quota is exhausted right now. New changes cannot sync until the quota resets or billing is enabled.';
  }

  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      if (message.toLowerCase().includes('timed out')) {
        return 'Cloud sync is taking too long. Ownly stopped waiting so the app does not freeze.';
      }
      return message;
    }
  }

  return fallbackError;
}
