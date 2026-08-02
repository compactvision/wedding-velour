import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import {
    AlertCircle,
    Camera,
    CameraOff,
    CheckCircle2,
    History,
    ImageUp,
    LogOut,
    Map as MapIcon,
    RotateCcw,
    ScanLine,
    Search,
    ShieldCheck,
    UserCheck,
    Users,
    XCircle,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
    AccessGuest,
    SeatingPoint} from '@/api/tenantClient';
import {
    tenantAccess,
} from '@/api/tenantClient';
import BrandLogo from '@/components/shared/BrandLogo';
import EmptyState from '@/components/shared/EmptyState';
import OfflineStatus from '@/components/shared/OfflineStatus';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type AccessTable = {
    id: string;
    name: string;
    shape: 'round' | 'rectangular' | 'oval';
    position_x: number;
    position_y: number;
};

type ResultKind = 'ready' | 'already' | 'done' | 'denied' | 'not_found';

type ScanResult = {
    guest?: AccessGuest;
    kind: ResultKind;
    method: 'qr' | 'manual';
    message?: string;
};

const partySize = (guest?: AccessGuest) =>
    guest ? 1 + Math.max(0, Number(guest.companions) || 0) : 0;

const companionText = (guest: AccessGuest) => {
    const count = Math.max(0, Number(guest.companions) || 0);

    return count === 0
        ? 'Sans accompagnant'
        : `${count} accompagnant${count > 1 ? 's' : ''}`;
};

function errorMessage(error: unknown, fallback: string) {
    if (!axios.isAxiosError(error)) {
return fallback;
}

    const errors = error.response?.data?.errors;

    if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat()[0];

        if (typeof first === 'string') {
return first;
}
    }

    return error.response?.data?.message || fallback;
}

function TableMap({
    tables,
    roomPolygon,
    highlightedTableId,
}: {
    tables: AccessTable[];
    roomPolygon: SeatingPoint[];
    highlightedTableId: string | null;
}) {
    if (tables.length === 0) {
return null;
}

    return (
        <div className="mt-4 overflow-auto rounded-2xl border border-stone-200 bg-slate-50 shadow-inner">
            <svg
                viewBox="0 0 700 500"
                className="min-h-[420px] w-full min-w-[700px]"
                aria-label="Plan de la salle"
            >
                <defs>
                    <pattern
                        id="door-grid"
                        width="25"
                        height="25"
                        patternUnits="userSpaceOnUse"
                    >
                        <path
                            d="M 25 0 L 0 0 0 25"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="0.7"
                        />
                    </pattern>
                </defs>
                <rect width="700" height="500" fill="url(#door-grid)" />
                {roomPolygon.length >= 3 && (
                    <polygon
                        points={roomPolygon
                            .map((point) => `${point.x},${point.y}`)
                            .join(' ')}
                        fill="#fff"
                        stroke="#a8a29e"
                        strokeWidth="4"
                        strokeLinejoin="round"
                    />
                )}
                <g transform="translate(305 466)">
                    <rect width="90" height="18" rx="7" fill="#d6d3d1" />
                    <text
                        x="45"
                        y="13"
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="700"
                        fill="#57534e"
                    >
                        ENTRÉE
                    </text>
                </g>
                {tables.map((table, index) => {
                    const x =
                        table.position_x > 0
                            ? table.position_x
                            : 100 + (index % 4) * 150;
                    const y =
                        table.position_y > 0
                            ? table.position_y
                            : 90 + Math.floor(index / 4) * 120;
                    const highlighted = table.id === highlightedTableId;
                    const rectangular = table.shape === 'rectangular';
                    const width = rectangular ? 104 : 78;
                    const height = rectangular ? 62 : 78;

                    return (
                        <g
                            key={table.id}
                            transform={`translate(${x - width / 2} ${y - height / 2})`}
                        >
                            {rectangular ? (
                                <rect
                                    width={width}
                                    height={height}
                                    rx="12"
                                    fill={highlighted ? '#8b1e1e' : '#fff'}
                                    stroke={highlighted ? '#fca5a5' : '#d6d3d1'}
                                    strokeWidth={highlighted ? 5 : 2}
                                />
                            ) : (
                                <ellipse
                                    cx={width / 2}
                                    cy={height / 2}
                                    rx={width / 2}
                                    ry={height / 2}
                                    fill={highlighted ? '#8b1e1e' : '#fff'}
                                    stroke={highlighted ? '#fca5a5' : '#d6d3d1'}
                                    strokeWidth={highlighted ? 5 : 2}
                                />
                            )}
                            <text
                                x={width / 2}
                                y={height / 2 + 4}
                                textAnchor="middle"
                                fontSize="11"
                                fontWeight="700"
                                fill={highlighted ? '#fff' : '#44403c'}
                            >
                                {table.name.length > 18
                                    ? `${table.name.slice(0, 16)}…`
                                    : table.name}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

function QrScanner({
    onScan,
    pending,
}: {
    onScan: (value: string) => void;
    pending: boolean;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<number | null>(null);
    const [active, setActive] = useState(false);
    const [error, setError] = useState('');

    const stop = () => {
        if (timerRef.current) {
window.clearInterval(timerRef.current);
}

        timerRef.current = null;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setActive(false);
    };

    useEffect(() => stop, []);

    const start = async () => {
        setError('');
        const Detector = (window as any).BarcodeDetector;

        if (!Detector) {
            setError(
                'Le scan caméra n’est pas pris en charge ici. Importez une photo du QR code.',
            );

            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            streamRef.current = stream;

            if (!videoRef.current) {
return;
}

            videoRef.current.srcObject = stream;
            await videoRef.current.play();
            setActive(true);
            const detector = new Detector({ formats: ['qr_code'] });
            timerRef.current = window.setInterval(async () => {
                if (!videoRef.current || videoRef.current.readyState < 2) {
return;
}

                const codes = await detector.detect(videoRef.current);

                if (codes[0]?.rawValue) {
                    onScan(codes[0].rawValue);
                    stop();
                }
            }, 400);
        } catch {
            setError('Accès à la caméra refusé ou indisponible.');
            stop();
        }
    };

    const scanImage = async (file?: File) => {
        if (!file) {
return;
}

        const Detector = (window as any).BarcodeDetector;

        if (!Detector) {
            setError('Ce navigateur ne peut pas lire ce QR code.');

            return;
        }

        try {
            const bitmap = await createImageBitmap(file);
            const codes = await new Detector({
                formats: ['qr_code'],
            }).detect(bitmap);

            if (!codes[0]?.rawValue) {
throw new Error();
}

            onScan(codes[0].rawValue);
        } catch {
            setError('Aucun QR code lisible dans cette image.');
        }
    };

    return (
        <Card className="border-primary/20 shadow-sm">
            <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-medium text-stone-700">
                        <ScanLine className="h-5 w-5 text-primary" />
                        Scanner le QR de l’invité
                    </div>
                    <Button
                        variant={active ? 'destructive' : 'default'}
                        size="sm"
                        onClick={active ? stop : start}
                        disabled={pending}
                    >
                        {active ? (
                            <CameraOff className="mr-2 h-4 w-4" />
                        ) : (
                            <Camera className="mr-2 h-4 w-4" />
                        )}
                        {active ? 'Arrêter' : 'Caméra'}
                    </Button>
                </div>
                <div
                    className={cn(
                        'relative overflow-hidden rounded-xl bg-stone-950',
                        active ? 'aspect-video' : 'hidden',
                    )}
                >
                    <video
                        ref={videoRef}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                    />
                    <div className="pointer-events-none absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-white shadow-[0_0_0_999px_rgba(0,0,0,.3)]" />
                </div>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-3 text-sm text-stone-600 hover:bg-stone-50">
                    <ImageUp className="h-4 w-4" />
                    Importer une photo du QR
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(event) =>
                            scanImage(event.target.files?.[0])
                        }
                    />
                </label>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </CardContent>
        </Card>
    );
}

export default function DoorAgent() {
    const workspace = (usePage().props as any).workspace;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const eventId = workspace?.event?.id || null;
    const permissions: string[] = workspace?.permissions || [];
    const canManage =
        permissions.includes('*') || permissions.includes('checkins.manage');
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [result, setResult] = useState<ScanResult | null>(null);
    const [showMap, setShowMap] = useState(false);

    const accessQuery = useQuery({
        queryKey: ['tenant-access', eventId],
        queryFn: () => tenantAccess.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
        refetchInterval: 15000,
    });
    const access = accessQuery.data?.data;
    const guests = useMemo(() => access?.guests || [], [access?.guests]);

    const refresh = () =>
        queryClient.invalidateQueries({ queryKey: ['tenant-access', eventId] });

    const lookupMutation = useMutation({
        mutationFn: (token: string) =>
            tenantAccess.lookup(organizationSlug, eventSlug, token),
        onSuccess: (guest) =>
            setResult({
                guest,
                kind: guest.checked_in
                    ? 'already'
                    : guest.status === 'confirmed'
                      ? 'ready'
                      : 'denied',
                method: 'qr',
            }),
        onError: (error) =>
            setResult({
                kind: 'not_found',
                method: 'qr',
                message: errorMessage(
                    error,
                    'Ce QR code ne correspond à aucun invité.',
                ),
            }),
    });

    const checkInMutation = useMutation({
        mutationFn: ({
            guest,
            method,
        }: {
            guest: AccessGuest;
            method: 'qr' | 'manual';
        }) =>
            tenantAccess.checkIn(
                organizationSlug,
                eventSlug,
                guest.id,
                method,
            ),
        onSuccess: (response, variables) => {
            setResult({
                guest: { ...variables.guest, checked_in: true },
                kind: response.meta.already_present ? 'already' : 'done',
                method: variables.method,
            });
            refresh();
        },
        onError: (error, variables) =>
            setResult({
                guest: variables.guest,
                kind: 'denied',
                method: variables.method,
                message: errorMessage(error, 'Cette entrée ne peut pas être validée.'),
            }),
    });

    const revokeMutation = useMutation({
        mutationFn: (checkInId: string) =>
            tenantAccess.revoke(organizationSlug, eventSlug, checkInId),
        onSuccess: refresh,
    });

    const filtered = useMemo(() => {
        const value = search.trim().toLocaleLowerCase('fr');

        if (value.length < 2) {
return [];
}

        return guests.filter((guest) =>
            `${guest.first_name} ${guest.last_name}`
                .toLocaleLowerCase('fr')
                .includes(value),
        );
    }, [guests, search]);

    const selectManual = (guest: AccessGuest) => {
        setResult({
            guest,
            kind: guest.checked_in
                ? 'already'
                : guest.status === 'confirmed'
                  ? 'ready'
                  : 'denied',
            method: 'manual',
        });
        setSearch('');
    };

    if (!workspace) {
        return (
            <EmptyState
                icon={ShieldCheck}
                title="Choisissez un événement"
                description="Le contrôle d’accès fonctionne dans l’espace événementiel actif."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (accessQuery.isError) {
        return (
            <EmptyState
                icon={ShieldCheck}
                title="Contrôle d’accès indisponible"
                description={errorMessage(
                    accessQuery.error,
                    'Activez le module QR et contrôle d’accès pour cet événement.',
                )}
                actionLabel="Voir l’espace de travail"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    const summary = access?.summary || {
        confirmed_people: 0,
        checked_in_people: 0,
        remaining_people: 0,
    };
    const tables = (access?.tables || []) as AccessTable[];
    const roomPolygon = access?.room_polygon || [];

    return (
        <div className="min-h-screen bg-stone-50 pb-10">
            <header className="sticky top-0 z-40 border-b border-stone-200 bg-white px-4 py-4 shadow-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BrandLogo variant="mark" className="h-11 w-11" />
                        <div>
                            <h1 className="font-display text-xl font-semibold text-stone-800">
                                Contrôle d’accès
                            </h1>
                            <p className="text-xs text-stone-500">
                                {workspace.event.name}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <OfflineStatus compact />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMap((value) => !value)}
                        >
                            <MapIcon className="mr-2 h-4 w-4" />
                            Plan
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/logout" method="post" as="button">
                                <LogOut className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto mt-2 max-w-6xl space-y-6 p-4">
                <div className="grid grid-cols-3 gap-3">
                    {[
                        {
                            label: 'Confirmés',
                            value: summary.confirmed_people,
                            icon: Users,
                            color: 'text-stone-700',
                        },
                        {
                            label: 'Entrés',
                            value: summary.checked_in_people,
                            icon: CheckCircle2,
                            color: 'text-green-600',
                        },
                        {
                            label: 'Attente',
                            value: summary.remaining_people,
                            icon: AlertCircle,
                            color: 'text-amber-600',
                        },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <Card
                            key={label}
                            className="p-3 text-center shadow-sm"
                        >
                            <Icon className={cn('mx-auto mb-1 h-5 w-5', color)} />
                            <div className={cn('text-xl font-bold', color)}>
                                {value}
                            </div>
                            <div className="text-xs font-medium tracking-wider text-stone-500 uppercase">
                                {label}
                            </div>
                        </Card>
                    ))}
                </div>

                {showMap && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-lg">
                                Plan de la salle
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowMap(false)}
                                >
                                    Fermer
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TableMap
                                tables={tables}
                                roomPolygon={roomPolygon}
                                highlightedTableId={null}
                            />
                        </CardContent>
                    </Card>
                )}

                <AnimatePresence>
                    {result && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                        >
                            <Card
                                className={cn(
                                    'relative border-2 p-5 shadow-lg',
                                    result.kind === 'done' &&
                                        'border-green-400 bg-green-50',
                                    result.kind === 'ready' &&
                                        'border-primary/40',
                                    result.kind === 'already' &&
                                        'border-blue-300 bg-blue-50',
                                    ['denied', 'not_found'].includes(
                                        result.kind,
                                    ) && 'border-red-300 bg-red-50',
                                )}
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={() => setResult(null)}
                                >
                                    <XCircle className="h-5 w-5" />
                                </Button>
                                <div className="mx-auto max-w-2xl space-y-3 text-center">
                                    {result.kind === 'done' && (
                                        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                                    )}
                                    {result.kind === 'already' && (
                                        <UserCheck className="mx-auto h-12 w-12 text-blue-600" />
                                    )}
                                    {result.kind === 'ready' && (
                                        <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                                    )}
                                    {['denied', 'not_found'].includes(
                                        result.kind,
                                    ) && (
                                        <XCircle className="mx-auto h-12 w-12 text-red-600" />
                                    )}
                                    <div className="font-display text-2xl font-semibold">
                                        {result.kind === 'done'
                                            ? 'Entrée validée'
                                            : result.kind === 'already'
                                              ? 'Déjà enregistré'
                                              : result.kind === 'ready'
                                                ? 'Invité reconnu'
                                                : result.kind === 'not_found'
                                                  ? 'QR non reconnu'
                                                  : 'Accès refusé'}
                                    </div>
                                    {result.guest && (
                                        <>
                                            <p className="text-lg font-medium">
                                                {result.guest.first_name}{' '}
                                                {result.guest.last_name}
                                            </p>
                                            <p className="text-sm text-stone-600">
                                                {companionText(result.guest)} ·{' '}
                                                {partySize(result.guest)} personne
                                                {partySize(result.guest) > 1
                                                    ? 's'
                                                    : ''}
                                            </p>
                                        </>
                                    )}
                                    {result.message && (
                                        <p className="text-sm text-red-700">
                                            {result.message}
                                        </p>
                                    )}
                                    {result.kind === 'denied' &&
                                        !result.message && (
                                            <p className="text-sm text-red-700">
                                                Le RSVP de cet invité n’est pas
                                                confirmé.
                                            </p>
                                        )}
                                    {result.kind === 'ready' && result.guest && (
                                        <Button
                                            className="h-12 w-full"
                                            disabled={checkInMutation.isPending}
                                            onClick={() =>
                                                checkInMutation.mutate({
                                                    guest: result.guest!,
                                                    method: result.method,
                                                })
                                            }
                                        >
                                            Valider l’entrée
                                        </Button>
                                    )}
                                    {['done', 'already'].includes(result.kind) &&
                                        result.guest?.table_id && (
                                            <TableMap
                                                tables={tables}
                                                roomPolygon={roomPolygon}
                                                highlightedTableId={
                                                    result.guest.table_id
                                                }
                                            />
                                        )}
                                </div>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid items-start gap-6 lg:grid-cols-2">
                    <QrScanner
                        onScan={(token) => lookupMutation.mutate(token)}
                        pending={lookupMutation.isPending}
                    />
                    <Card>
                        <CardContent className="space-y-4 pt-5">
                            <div className="flex items-center gap-2 font-medium text-stone-700">
                                <Search className="h-5 w-5 text-primary" />
                                Recherche manuelle
                            </div>
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Nom ou prénom…"
                                className="h-12"
                            />
                            {filtered.length > 0 && (
                                <div className="max-h-72 space-y-2 overflow-y-auto">
                                    {filtered.map((guest) => (
                                        <button
                                            key={guest.id}
                                            onClick={() => selectManual(guest)}
                                            className="flex w-full items-center justify-between rounded-xl border bg-white p-4 text-left hover:border-primary/50"
                                        >
                                            <span>
                                                <span className="block font-medium">
                                                    {guest.first_name}{' '}
                                                    {guest.last_name}
                                                </span>
                                                <span className="text-xs text-stone-500">
                                                    {companionText(guest)}
                                                </span>
                                            </span>
                                            {guest.checked_in ? (
                                                <span className="text-xs font-medium text-green-700">
                                                    Entré
                                                </span>
                                            ) : (
                                                <StatusBadge
                                                    status={guest.status}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <History className="h-5 w-5 text-primary" />
                            Dernières entrées
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {access?.recent.length ? (
                            <div className="divide-y">
                                {access.recent.map((checkIn) => (
                                    <div
                                        key={checkIn.id}
                                        className="flex items-center justify-between gap-3 py-3"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {checkIn.guest_name}
                                            </p>
                                            <p className="text-xs text-stone-500">
                                                {checkIn.party_size} personne
                                                {checkIn.party_size > 1
                                                    ? 's'
                                                    : ''}{' '}
                                                ·{' '}
                                                {new Date(
                                                    checkIn.checked_in_at,
                                                ).toLocaleTimeString('fr-FR', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                                {checkIn.operator_name
                                                    ? ` · ${checkIn.operator_name}`
                                                    : ''}
                                            </p>
                                        </div>
                                        {canManage && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={
                                                    revokeMutation.isPending
                                                }
                                                onClick={() =>
                                                    revokeMutation.mutate(
                                                        checkIn.id,
                                                    )
                                                }
                                            >
                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                Annuler
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="py-6 text-center text-sm text-stone-500">
                                Aucune entrée enregistrée pour le moment.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
