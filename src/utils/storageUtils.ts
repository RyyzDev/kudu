import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;

export async function saveSafeStorage<T>(key: string, data: T): Promise<void> {
  const jsonStr = JSON.stringify(data);
  if (jsonStr.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(key, jsonStr);
    await SecureStore.deleteItemAsync(`${key}__chunks`);
    return;
  }

  const chunks: string[] = [];
  for (let i = 0; i < jsonStr.length; i += CHUNK_SIZE) {
    chunks.push(jsonStr.slice(i, i + CHUNK_SIZE));
  }

  await SecureStore.setItemAsync(`${key}__chunks`, String(chunks.length));
  for (let i = 0; i < chunks.length; i++) {
    await SecureStore.setItemAsync(`${key}__${i}`, chunks[i]);
  }
}

export async function getSafeStorage<T>(key: string): Promise<T | null> {
  const chunksCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
  if (chunksCountStr) {
    const count = parseInt(chunksCountStr, 10);
    let full = '';
    for (let i = 0; i < count; i++) {
      const part = await SecureStore.getItemAsync(`${key}__${i}`);
      if (part === null) return null;
      full += part;
    }
    try {
      return JSON.parse(full) as T;
    } catch {
      return null;
    }
  }

  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function deleteSafeStorage(key: string): Promise<void> {
  const chunksCountStr = await SecureStore.getItemAsync(`${key}__chunks`);
  if (chunksCountStr) {
    const count = parseInt(chunksCountStr, 10);
    for (let i = 0; i < count; i++) {
      await SecureStore.deleteItemAsync(`${key}__${i}`);
    }
    await SecureStore.deleteItemAsync(`${key}__chunks`);
  }
  await SecureStore.deleteItemAsync(key);
}
