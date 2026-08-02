import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type ServiceWorkerUpdateEvent = CustomEvent<{
    registration: ServiceWorkerRegistration;
}>;

export default function ServiceWorkerUpdateToast() {
    const [registration, setRegistration] =
        useState<ServiceWorkerRegistration | null>(null);
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        const handleUpdate = (event: Event) => {
            const updateEvent = event as ServiceWorkerUpdateEvent;
            setRegistration(updateEvent.detail.registration);
            setHidden(false);
        };

        window.addEventListener('pwa-update-ready', handleUpdate);

        return () => {
            window.removeEventListener('pwa-update-ready', handleUpdate);
        };
    }, []);

    if (!registration || hidden) {
        return null;
    }

    const activateUpdate = () => {
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    };

    return (
        <div className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md rounded-xl border border-stone-200 bg-white p-4 shadow-2xl md:bottom-6">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <RefreshCw className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900">
                        Nouvelle version disponible
                    </p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                        Rechargez pour utiliser la dernière version de Planivo.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <Button size="sm" onClick={activateUpdate}>
                            Recharger
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setHidden(true)}
                        >
                            Plus tard
                        </Button>
                    </div>
                </div>
                <button
                    type="button"
                    className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    onClick={() => setHidden(true)}
                    aria-label="Masquer"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
