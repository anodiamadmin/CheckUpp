import * as SecureStore from "expo-secure-store";

const KEY_NAMESPACE = "checkupp";
const INDEX_KEY = `__${KEY_NAMESPACE}__index__`;
const CHUNK_SIZE = 1800;

const sanitizeKeySegment = (segment: string) =>
  segment.replace(/[^A-Za-z0-9._-]/g, "_");

const scopedKey = (key: string) =>
  `${KEY_NAMESPACE}__${sanitizeKeySegment(key)}`;

const metaKey = (key: string) => `${scopedKey(key)}__meta`;
const chunkKey = (key: string, index: number) =>
  `${scopedKey(key)}__chunk__${index}`;

interface ChunkMeta {
  chunkCount: number;
}

const readIndex = async (): Promise<string[]> => {
  const raw = await SecureStore.getItemAsync(INDEX_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const writeIndex = async (keys: string[]) => {
  await SecureStore.setItemAsync(INDEX_KEY, JSON.stringify(keys));
};

const registerKey = async (key: string) => {
  const keys = await readIndex();
  if (keys.includes(key)) return;
  await writeIndex([...keys, key]);
};

const unregisterKey = async (key: string) => {
  const keys = await readIndex();
  if (!keys.includes(key)) return;
  await writeIndex(keys.filter((item) => item !== key));
};

const removeChunkedItem = async (key: string) => {
  const metaRaw = await SecureStore.getItemAsync(metaKey(key));
  if (!metaRaw) {
    await SecureStore.deleteItemAsync(scopedKey(key));
    return;
  }

  try {
    const metadata = JSON.parse(metaRaw) as ChunkMeta;
    for (let i = 0; i < metadata.chunkCount; i += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, i));
    }
  } catch {
    // Best-effort cleanup even if metadata is malformed.
  }

  await SecureStore.deleteItemAsync(metaKey(key));
  await SecureStore.deleteItemAsync(scopedKey(key));
};

export const setSecureItem = async (key: string, value: string) => {
  await removeChunkedItem(key);

  if (value.length <= CHUNK_SIZE) {
    await SecureStore.setItemAsync(scopedKey(key), value);
    await registerKey(key);
    return;
  }

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += CHUNK_SIZE) {
    chunks.push(value.slice(i, i + CHUNK_SIZE));
  }

  await Promise.all(
    chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk))
  );
  await SecureStore.setItemAsync(metaKey(key), JSON.stringify({ chunkCount: chunks.length }));
  await registerKey(key);
};

export const getSecureItem = async (key: string): Promise<string | null> => {
  const singleValue = await SecureStore.getItemAsync(scopedKey(key));
  if (singleValue !== null) return singleValue;

  const metaRaw = await SecureStore.getItemAsync(metaKey(key));
  if (!metaRaw) return null;

  try {
    const metadata = JSON.parse(metaRaw) as ChunkMeta;
    if (!metadata.chunkCount || metadata.chunkCount < 1) return null;

    const chunkValues: string[] = [];
    for (let i = 0; i < metadata.chunkCount; i += 1) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, i));
      if (chunk === null) return null;
      chunkValues.push(chunk);
    }

    return chunkValues.join("");
  } catch {
    return null;
  }
};

export const deleteSecureItem = async (key: string) => {
  await removeChunkedItem(key);
  await unregisterKey(key);
};

export const clearSecureNamespace = async () => {
  const keys = await readIndex();
  await Promise.all(keys.map((key) => removeChunkedItem(key)));
  await SecureStore.deleteItemAsync(INDEX_KEY);
};

export const setSecureJson = async (key: string, value: unknown) => {
  await setSecureItem(key, JSON.stringify(value));
};

export const getSecureJson = async <T>(key: string): Promise<T | null> => {
  const raw = await getSecureItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};
