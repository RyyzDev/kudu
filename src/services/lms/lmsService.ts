import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getSafeStorage, saveSafeStorage, deleteSafeStorage } from '../../utils/storageUtils';
import { LmsCourse, LmsAssignment, LmsUser, LmsDataState } from './lmsTypes';

const KEY_USER = 'lms_user';
const KEY_COURSES = 'lms_courses';
const KEY_ASSIGNMENTS = 'lms_assignments';
const KEY_SESSKEY = 'lms_sesskey';
const KEY_CONNECTED = 'lms_is_connected';
const KEY_LAST_SYNC = 'lms_last_sync';

/**
 * User agent mobile modern murni tanpa embel-embel 'wv' atau 'Version/4.0'
 * untuk menghindari Google OAuth 403 disallowed_useragent.
 */
export const LMS_USER_AGENT =
  Platform.OS === 'ios'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';

export async function getLmsState(): Promise<LmsDataState> {
  const [user, courses, assignments, sesskey, isConnectedStr, lastSyncStr] = await Promise.all([
    getSafeStorage<LmsUser>(KEY_USER),
    getSafeStorage<LmsCourse[]>(KEY_COURSES),
    getSafeStorage<LmsAssignment[]>(KEY_ASSIGNMENTS),
    SecureStore.getItemAsync(KEY_SESSKEY),
    SecureStore.getItemAsync(KEY_CONNECTED),
    SecureStore.getItemAsync(KEY_LAST_SYNC),
  ]);

  return {
    user: user || null,
    courses: courses || [],
    assignments: assignments || [],
    sesskey: sesskey || undefined,
    isConnected: isConnectedStr === 'true',
    lastSyncedAt: lastSyncStr ? parseInt(lastSyncStr, 10) : null,
  };
}

export async function saveLmsSyncPayload(payload: {
  user: LmsUser;
  courses: LmsCourse[];
  assignments: LmsAssignment[];
  sesskey?: string;
  syncedAt: number;
}): Promise<void> {
  await Promise.all([
    saveSafeStorage(KEY_USER, payload.user),
    saveSafeStorage(KEY_COURSES, payload.courses),
    saveSafeStorage(KEY_ASSIGNMENTS, payload.assignments),
    payload.sesskey ? SecureStore.setItemAsync(KEY_SESSKEY, payload.sesskey) : Promise.resolve(),
    SecureStore.setItemAsync(KEY_CONNECTED, 'true'),
    SecureStore.setItemAsync(KEY_LAST_SYNC, String(payload.syncedAt)),
  ]);
}

export async function setLmsDisconnected(): Promise<void> {
  await SecureStore.setItemAsync(KEY_CONNECTED, 'false');
}

export async function clearLmsState(): Promise<void> {
  await Promise.all([
    deleteSafeStorage(KEY_USER),
    deleteSafeStorage(KEY_COURSES),
    deleteSafeStorage(KEY_ASSIGNMENTS),
    SecureStore.deleteItemAsync(KEY_SESSKEY),
    SecureStore.deleteItemAsync(KEY_CONNECTED),
    SecureStore.deleteItemAsync(KEY_LAST_SYNC),
  ]);
}
