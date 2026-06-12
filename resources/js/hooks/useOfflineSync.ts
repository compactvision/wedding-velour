import { getQueuedOperations, syncOfflineQueue } from '@/lib/offline';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useOfflineSync() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(
    () => localStorage.getItem('offlineLastSyncedAt'),
  );

  const refreshCount = useCallback(async () => {
    setPendingCount((await getQueuedOperations()).length);
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncOfflineQueue();
      if (result.synced > 0) {
        const now = new Date().toISOString();
        localStorage.setItem('offlineLastSyncedAt', now);
        setLastSyncedAt(now);
      }
      setPendingCount(result.remaining);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      void sync();
    };
    const handleOffline = () => setOnline(false);
    const handleQueue = () => void refreshCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-changed', handleQueue);
    void refreshCount();
    if (navigator.onLine) void sync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-changed', handleQueue);
    };
  }, [refreshCount, sync]);

  return { online, pendingCount, syncing, lastSyncedAt, sync };
}
