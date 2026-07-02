import { Button } from '@/components/ui/button';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { CheckCircle2, CloudOff, RefreshCw, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function OfflineStatus({ compact = false }: { compact?: boolean }) {
  const { online, pendingCount, syncing, sync } = useOfflineSync();
  const [cacheFallbackAt, setCacheFallbackAt] = useState<string | null>(null);

  useEffect(() => {
    const handleCacheHit = (event: Event) => {
      const cacheEvent = event as CustomEvent<{ updatedAt?: string }>;
      setCacheFallbackAt(cacheEvent.detail.updatedAt || new Date().toISOString());
    };

    window.addEventListener('offline-cache-hit', handleCacheHit);

    return () => {
      window.removeEventListener('offline-cache-hit', handleCacheHit);
    };
  }, []);

  const label = !online
    ? `Hors ligne${pendingCount ? ` · ${pendingCount} en attente` : ''}`
    : pendingCount
      ? `${pendingCount} à synchroniser`
      : cacheFallbackAt
        ? 'Données locales'
        : 'Synchronisé';

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!online || syncing || pendingCount === 0}
      onClick={() => void sync()}
      className={cn(
        'gap-2',
        !online && 'border-amber-300 bg-amber-50 text-amber-800',
        online && pendingCount > 0 && 'border-blue-300 bg-blue-50 text-blue-800',
        online && pendingCount === 0 && !cacheFallbackAt && 'border-green-200 bg-green-50 text-green-700',
        online && pendingCount === 0 && cacheFallbackAt && 'border-amber-300 bg-amber-50 text-amber-800',
      )}
      title={cacheFallbackAt ? `${label} · dernière mise en cache ${new Date(cacheFallbackAt).toLocaleString()}` : label}
    >
      {!online ? (
        <CloudOff className="h-4 w-4" />
      ) : syncing ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : pendingCount > 0 ? (
        <UploadCloud className="h-4 w-4" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      {!compact && <span>{label}</span>}
    </Button>
  );
}
