import axios, { AxiosRequestConfig } from 'axios';

const DB_NAME = 'wedding-velour-offline';
const DB_VERSION = 1;
const CACHE_STORE = 'api-cache';
const QUEUE_STORE = 'sync-queue';

export type OfflineOperation = {
  id: string;
  method: 'post' | 'put' | 'delete';
  url: string;
  data?: Record<string, unknown>;
  createdAt: string;
  label: string;
  attempts: number;
  lastError?: string;
};

type CacheRecord = {
  key: string;
  data: unknown;
  updatedAt: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export function createOfflineId(): string {
  return crypto.randomUUID();
}

export async function cacheApiResponse(key: string, data: unknown): Promise<void> {
  await runStore(CACHE_STORE, 'readwrite', store =>
    store.put({ key, data, updatedAt: new Date().toISOString() } satisfies CacheRecord),
  );
}

export async function getCachedApiResponse<T>(key: string): Promise<T | null> {
  const record = await runStore<CacheRecord | undefined>(CACHE_STORE, 'readonly', store => store.get(key));
  return (record?.data as T) ?? null;
}

export async function cachedGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const params = config?.params ? new URLSearchParams(config.params).toString() : '';
  const key = params ? `${url}?${params}` : url;

  try {
    const response = await axios.get<T>(url, config);
    await cacheApiResponse(key, response.data);
    return response.data;
  } catch (error) {
    const record = await runStore<CacheRecord | undefined>(CACHE_STORE, 'readonly', store => store.get(key));
    if (record?.data !== undefined) {
      window.dispatchEvent(new CustomEvent('offline-cache-hit', {
        detail: { key, updatedAt: record.updatedAt },
      }));
      return record.data as T;
    }
    throw error;
  }
}

export async function enqueueOperation(
  operation: Omit<OfflineOperation, 'id' | 'createdAt' | 'attempts'> & { id?: string },
): Promise<OfflineOperation> {
  const queued: OfflineOperation = {
    ...operation,
    id: operation.id ?? createOfflineId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  await runStore(QUEUE_STORE, 'readwrite', store => store.put(queued));
  window.dispatchEvent(new CustomEvent('offline-queue-changed'));
  return queued;
}

export async function getQueuedOperations(): Promise<OfflineOperation[]> {
  const operations = await runStore<OfflineOperation[]>(QUEUE_STORE, 'readonly', store => store.getAll());
  return operations.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function queuedMutation<T>(
  method: OfflineOperation['method'],
  url: string,
  data: Record<string, unknown> | undefined,
  label: string,
  optimisticValue: T,
): Promise<T> {
  try {
    const response = await axios.request<T>({ method, url, data });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) throw error;
    await enqueueOperation({ method, url, data, label });
    return optimisticValue;
  }
}

export async function syncOfflineQueue(): Promise<{ synced: number; remaining: number }> {
  if (!navigator.onLine) {
    return { synced: 0, remaining: (await getQueuedOperations()).length };
  }

  let synced = 0;
  const operations = await getQueuedOperations();

  for (const operation of operations) {
    try {
      await axios.request({
        method: operation.method,
        url: operation.url,
        data: operation.data,
        headers: { 'X-Offline-Operation': operation.id },
      });
      await runStore(QUEUE_STORE, 'readwrite', store => store.delete(operation.id));
      synced += 1;
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.message || error.message
        : 'Erreur de synchronisation';
      await runStore(QUEUE_STORE, 'readwrite', store =>
        store.put({ ...operation, attempts: operation.attempts + 1, lastError: message }),
      );
      if (!axios.isAxiosError(error) || !error.response) break;
    }
  }

  const remaining = (await getQueuedOperations()).length;
  window.dispatchEvent(new CustomEvent('offline-queue-changed'));
  window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: { synced, remaining } }));
  return { synced, remaining };
}
