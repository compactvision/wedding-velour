import { Button } from '@/components/ui/button';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { CheckCircle2, CloudOff, RefreshCw, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function OfflineStatus({ compact = false }: { compact?: boolean }) {
  const { online, pendingCount, syncing, sync } = useOfflineSync();

  const label = !online
    ? `Hors ligne${pendingCount ? ` · ${pendingCount} en attente` : ''}`
    : pendingCount
      ? `${pendingCount} à synchroniser`
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
        online && pendingCount === 0 && 'border-green-200 bg-green-50 text-green-700',
      )}
      title={label}
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

