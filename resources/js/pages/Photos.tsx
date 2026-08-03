import { usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    Camera,
    Check,
    Copy,
    Film,
    HardDrive,
    Link2,
    Loader2,
    RefreshCw,
    Star,
    Trash2,
    Upload,
} from 'lucide-react';
import { useState } from 'react';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const categories = [
    ['all', 'Tout'],
    ['ceremony', 'Cérémonie'],
    ['reception', 'Réception'],
    ['portraits', 'Portraits'],
    ['candid', 'Spontanées'],
    ['details', 'Détails'],
];

const bytes = (value = 0) => {
    if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} Ko`;
    if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} Mo`;
    return `${(value / 1024 ** 3).toFixed(2)} Go`;
};

const errorMessage = (error: unknown) => {
    if (!axios.isAxiosError(error)) return 'Une erreur est survenue.';
    const errors = error.response?.data?.errors;
    const first = errors ? Object.values(errors).flat()[0] : null;
    return typeof first === 'string'
        ? first
        : error.response?.data?.message || 'Une erreur est survenue.';
};

export default function Photos() {
    const workspace = (usePage().props as any).workspace;
    const org = workspace?.organization?.slug || '';
    const event = workspace?.event?.slug || '';
    const permissions: string[] = workspace?.permissions || [];
    const canManage =
        permissions.includes('*') || permissions.includes('media.manage');
    const canPublish =
        permissions.includes('*') || permissions.includes('media.publish');
    const base = `/api/organizations/${encodeURIComponent(org)}/events/${encodeURIComponent(event)}/media`;
    const client = useQueryClient();
    const [category, setCategory] = useState('all');
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');
    const query = useQuery({
        queryKey: ['tenant-media', workspace?.event?.id],
        queryFn: async () => (await axios.get(base)).data.data,
        enabled: Boolean(workspace),
    });
    const refresh = () =>
        client.invalidateQueries({
            queryKey: ['tenant-media', workspace?.event?.id],
        });
    const upload = useMutation({
        mutationFn: async (files: FileList) => {
            for (const file of Array.from(files)) {
                const form = new FormData();
                form.append('file', file);
                form.append(
                    'category',
                    category === 'all' ? 'other' : category,
                );
                await axios.post(base, form);
            }
        },
        onSuccess: () => {
            setError('');
            void refresh();
        },
        onError: (uploadError) => setError(errorMessage(uploadError)),
    });
    const update = useMutation({
        mutationFn: ({ id, data }: any) => axios.put(`${base}/${id}`, data),
        onSuccess: refresh,
    });
    const remove = useMutation({
        mutationFn: (id: string) => axios.delete(`${base}/${id}`),
        onSuccess: refresh,
    });
    const galleryLink = useMutation({
        mutationFn: (data: Record<string, boolean>) =>
            axios.post(`${base}/gallery-link`, data),
        onSuccess: () => {
            setError('');
            void refresh();
        },
        onError: (linkError) => setError(errorMessage(linkError)),
    });

    if (!workspace || query.isError) {
        return (
            <EmptyState
                icon={Camera}
                title="Galerie indisponible"
                description="Choisissez un événement avec le module Médias activé."
            />
        );
    }

    const data = query.data;
    const photos = (data?.photos || []).filter(
        (photo: any) => category === 'all' || photo.category === category,
    );
    const summary = data?.summary || {
        total: 0,
        used_bytes: 0,
        limit_bytes: 0,
        remaining_bytes: 0,
    };
    const usage =
        summary.limit_bytes > 0
            ? Math.min(100, (summary.used_bytes * 100) / summary.limit_bytes)
            : 0;

    const copyLink = async () => {
        if (!data?.gallery?.share_url) return;
        await navigator.clipboard.writeText(data.gallery.share_url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div>
            <PageHeader
                title="Photos & vidéos"
                subtitle={`${summary.total} média(s) · galerie de ${workspace.event.name}`}
            >
                {canManage && (
                    <label>
                        <Button
                            asChild
                            disabled={
                                upload.isPending || summary.limit_bytes <= 0
                            }
                        >
                            <span>
                                {upload.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Upload className="mr-2 h-4 w-4" />
                                )}
                                Ajouter des médias
                            </span>
                        </Button>
                        <Input
                            className="hidden"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/quicktime,video/webm"
                            multiple
                            onChange={(e) =>
                                e.target.files && upload.mutate(e.target.files)
                            }
                        />
                    </label>
                )}
            </PageHeader>

            <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_1.35fr]">
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <HardDrive className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-semibold">
                                        Stockage du pack
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Photos et vidéos originales
                                    </p>
                                </div>
                            </div>
                            <strong>
                                {bytes(summary.used_bytes)} /{' '}
                                {bytes(summary.limit_bytes)}
                            </strong>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${usage}%` }}
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Il reste {bytes(summary.remaining_bytes)}. Chaque
                            fichier utilise sa taille réelle.
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                            <Link2 className="h-5 w-5 text-primary" />
                            <div>
                                <p className="font-semibold">
                                    Lien de la galerie des invités
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Seuls les médias publiés sont visibles.
                                </p>
                            </div>
                        </div>
                        {data?.gallery ? (
                            <>
                                <div className="mt-4 flex gap-2">
                                    <Input
                                        readOnly
                                        value={data.gallery.share_url}
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={copyLink}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-emerald-600" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            galleryLink.mutate({
                                                allow_downloads:
                                                    !data.gallery
                                                        .allow_downloads,
                                            })
                                        }
                                    >
                                        {data.gallery.allow_downloads
                                            ? 'Désactiver les téléchargements'
                                            : 'Autoriser les téléchargements'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                            galleryLink.mutate({
                                                regenerate: true,
                                            })
                                        }
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Changer le lien
                                    </Button>
                                </div>
                            </>
                        ) : canPublish ? (
                            <Button
                                className="mt-4"
                                variant="outline"
                                onClick={() =>
                                    galleryLink.mutate({
                                        allow_downloads: true,
                                    })
                                }
                                disabled={galleryLink.isPending}
                            >
                                <Link2 className="mr-2 h-4 w-4" />
                                Créer le lien à partager
                            </Button>
                        ) : (
                            <p className="mt-4 text-sm text-muted-foreground">
                                Un responsable de publication peut créer ce
                                lien.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {error && (
                <div className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {error}
                </div>
            )}
            {summary.limit_bytes <= 0 && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    Activez un pack avec stockage pour pouvoir importer des
                    photos et vidéos.
                </div>
            )}

            <Tabs value={category} onValueChange={setCategory} className="mb-5">
                <TabsList>
                    {categories.map(([key, label]) => (
                        <TabsTrigger key={key} value={key}>
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            {!photos.length ? (
                <EmptyState
                    icon={Camera}
                    title="Aucun média"
                    description="Ajoutez les premières photos ou vidéos de cet événement."
                />
            ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {photos.map((photo: any) => (
                        <div
                            key={photo.id}
                            className="group relative aspect-square overflow-hidden rounded-xl bg-muted"
                        >
                            {photo.is_video ? (
                                <video
                                    src={photo.content_url}
                                    controls
                                    preload="metadata"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <img
                                    src={photo.content_url}
                                    alt={photo.caption || ''}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                />
                            )}
                            {photo.is_video && (
                                <div className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/60 p-2 text-white">
                                    <Film className="h-4 w-4" />
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 p-2 pt-8 opacity-0 transition-opacity group-hover:opacity-100">
                                {canPublish && (
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        onClick={() =>
                                            update.mutate({
                                                id: photo.id,
                                                data: {
                                                    action:
                                                        photo.status ===
                                                        'published'
                                                            ? 'unpublish'
                                                            : 'publish',
                                                },
                                            })
                                        }
                                    >
                                        <Star
                                            className={`h-4 w-4 ${photo.status === 'published' ? 'fill-amber-400 text-amber-400' : ''}`}
                                        />
                                    </Button>
                                )}
                                {canManage && (
                                    <Button
                                        size="icon"
                                        variant="destructive"
                                        onClick={() => remove.mutate(photo.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
