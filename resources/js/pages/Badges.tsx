import { usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    IdCard,
    Printer,
    QrCode,
    ShieldCheck,
    ShieldX,
    LayoutTemplate,
    Plus,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useState } from 'react';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Badge as StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const errorMessage = (error: unknown) => {
    if (!axios.isAxiosError(error)) {
        return '';
    }

    const errors = error.response?.data?.errors;

    return errors
        ? Object.values(errors).flat().join(' ')
        : error.response?.data?.message || '';
};

export default function Badges() {
    const workspace = (usePage().props as any).workspace;
    const permissions: string[] = workspace?.permissions || [];
    const canManage =
        permissions.includes('*') || permissions.includes('badges.manage');
    const canIssue =
        permissions.includes('*') || permissions.includes('badges.issue');
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const base = `/api/organizations/${encodeURIComponent(organizationSlug)}/events/${encodeURIComponent(eventSlug)}/badges`;
    const queryClient = useQueryClient();
    const [template, setTemplate] = useState({
        name: '',
        format: 'portrait',
        primary_color: '#B98235',
        show_qr: true,
        show_organization: true,
    });
    const [issuance, setIssuance] = useState({
        subject: '',
        badge_template_id: '',
        holder_role: '',
    });

    const query = useQuery({
        queryKey: ['badges', workspace?.event?.id],
        queryFn: async () => (await axios.get(base)).data.data,
        enabled: Boolean(workspace),
    });
    const refresh = () =>
        queryClient.invalidateQueries({
            queryKey: ['badges', workspace?.event?.id],
        });
    const createTemplate = useMutation({
        mutationFn: () => axios.post(`${base}/templates`, template),
        onSuccess: (response) => {
            setTemplate({
                name: '',
                format: 'portrait',
                primary_color: '#B98235',
                show_qr: true,
                show_organization: true,
            });
            setIssuance((current) => ({
                ...current,
                badge_template_id: response.data.data.id,
            }));
            refresh();
        },
    });
    const issue = useMutation({
        mutationFn: () => {
            const [source_type, source_id] = issuance.subject.split(':');

            return axios.post(`${base}/issue`, {
                source_type,
                source_id,
                badge_template_id: issuance.badge_template_id || null,
                holder_role: issuance.holder_role || null,
            });
        },
        onSuccess: () => {
            setIssuance((current) => ({
                ...current,
                subject: '',
                holder_role: '',
            }));
            refresh();
        },
    });
    const revoke = useMutation({
        mutationFn: (id: string) => axios.put(`${base}/${id}/revoke`),
        onSuccess: refresh,
    });

    if (!workspace || query.isError) {
        return (
            <EmptyState
                icon={IdCard}
                title="Badges indisponibles"
                description="Choisissez un événement avec le module Badges activé."
            />
        );
    }

    const data = query.data;
    const candidates = [
        ...(data?.candidates.guests || []).map((entry: any) => ({
            ...entry,
            value: `guest:${entry.id}`,
            group: 'Invités',
        })),
        ...(data?.candidates.tickets || []).map((entry: any) => ({
            ...entry,
            value: `ticket:${entry.id}`,
            group: 'Billets',
        })),
    ];

    return (
        <div>
            <div className="print:hidden">
                <PageHeader
                    title="Badges"
                    subtitle={`${workspace.event.name} · création, QR et contrôle des accréditations`}
                >
                    {null}
                </PageHeader>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                        ['Badges créés', data?.summary.total || 0, IdCard],
                        ['Actifs', data?.summary.issued || 0, ShieldCheck],
                        ['Révoqués', data?.summary.revoked || 0, ShieldX],
                        [
                            'Modèles actifs',
                            data?.summary.templates || 0,
                            LayoutTemplate,
                        ],
                    ].map(([label, value, Icon]: any) => (
                        <Card key={label} className="p-4">
                            <div className="flex items-center gap-3">
                                <Icon className="h-5 w-5 text-primary" />
                                <div>
                                    <div className="text-lg font-bold">
                                        {value}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {label}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Nouveau modèle</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {canManage ? (
                                <>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div>
                                            <Label>Nom</Label>
                                            <Input
                                                value={template.name}
                                                onChange={(event) =>
                                                    setTemplate({
                                                        ...template,
                                                        name: event.target
                                                            .value,
                                                    })
                                                }
                                                placeholder="Accueil VIP"
                                            />
                                        </div>
                                        <div>
                                            <Label>Format</Label>
                                            <Select
                                                value={template.format}
                                                onValueChange={(format) =>
                                                    setTemplate({
                                                        ...template,
                                                        format,
                                                    })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="portrait">
                                                        Portrait
                                                    </SelectItem>
                                                    <SelectItem value="landscape">
                                                        Paysage
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Couleur</Label>
                                            <Input
                                                type="color"
                                                value={template.primary_color}
                                                onChange={(event) =>
                                                    setTemplate({
                                                        ...template,
                                                        primary_color:
                                                            event.target.value,
                                                    })
                                                }
                                                className="h-10"
                                            />
                                        </div>
                                        <div>
                                            <Label>Options</Label>
                                            <div className="flex h-10 items-center gap-4 text-sm">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            template.show_qr
                                                        }
                                                        onChange={(event) =>
                                                            setTemplate({
                                                                ...template,
                                                                show_qr:
                                                                    event.target
                                                                        .checked,
                                                            })
                                                        }
                                                    />{' '}
                                                    QR
                                                </label>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            template.show_organization
                                                        }
                                                        onChange={(event) =>
                                                            setTemplate({
                                                                ...template,
                                                                show_organization:
                                                                    event.target
                                                                        .checked,
                                                            })
                                                        }
                                                    />{' '}
                                                    Organisation
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        disabled={
                                            !template.name ||
                                            createTemplate.isPending
                                        }
                                        onClick={() => createTemplate.mutate()}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Créer le modèle
                                    </Button>
                                    {createTemplate.isError && (
                                        <p className="text-sm text-destructive">
                                            {errorMessage(createTemplate.error)}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Vous pouvez consulter les modèles sans les
                                    modifier.
                                </p>
                            )}
                            <div className="space-y-2">
                                {data?.templates.map((entry: any) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-center justify-between rounded-xl border p-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="h-8 w-2 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        entry.primary_color,
                                                }}
                                            />
                                            <div>
                                                <div className="font-semibold">
                                                    {entry.name}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {entry.format === 'portrait'
                                                        ? 'Portrait'
                                                        : 'Paysage'}{' '}
                                                    ·{' '}
                                                    {entry.show_qr
                                                        ? 'QR visible'
                                                        : 'Sans QR'}
                                                </div>
                                            </div>
                                        </div>
                                        <StatusBadge variant="outline">
                                            {entry.status === 'active'
                                                ? 'Actif'
                                                : 'Archivé'}
                                        </StatusBadge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Émettre un badge</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {canIssue ? (
                                <>
                                    <div>
                                        <Label>
                                            Invité ou détenteur de billet
                                        </Label>
                                        <Select
                                            value={issuance.subject}
                                            onValueChange={(subject) =>
                                                setIssuance({
                                                    ...issuance,
                                                    subject,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Sélectionner une personne" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {candidates.map(
                                                    (entry: any) => (
                                                        <SelectItem
                                                            key={entry.value}
                                                            value={entry.value}
                                                        >
                                                            {entry.name} ·{' '}
                                                            {entry.group}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Modèle</Label>
                                        <Select
                                            value={issuance.badge_template_id}
                                            onValueChange={(
                                                badge_template_id,
                                            ) =>
                                                setIssuance({
                                                    ...issuance,
                                                    badge_template_id,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Badge standard" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {data?.templates
                                                    .filter(
                                                        (entry: any) =>
                                                            entry.status ===
                                                            'active',
                                                    )
                                                    .map((entry: any) => (
                                                        <SelectItem
                                                            key={entry.id}
                                                            value={entry.id}
                                                        >
                                                            {entry.name}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Fonction ou catégorie</Label>
                                        <Input
                                            value={issuance.holder_role}
                                            onChange={(event) =>
                                                setIssuance({
                                                    ...issuance,
                                                    holder_role:
                                                        event.target.value,
                                                })
                                            }
                                            placeholder="VIP, Presse, Équipe…"
                                        />
                                    </div>
                                    <Button
                                        disabled={
                                            !issuance.subject || issue.isPending
                                        }
                                        onClick={() => issue.mutate()}
                                    >
                                        <IdCard className="mr-2 h-4 w-4" />
                                        Générer le badge
                                    </Button>
                                    {issue.isError && (
                                        <p className="text-sm text-destructive">
                                            {errorMessage(issue.error)}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Vous ne disposez pas du droit d’émettre des
                                    badges.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card className="mt-5 border-0 shadow-none print:m-0">
                <CardHeader className="print:hidden">
                    <div className="flex items-center justify-between">
                        <CardTitle>Badges générés</CardTitle>
                        <Button
                            variant="outline"
                            disabled={!data?.badges.length}
                            onClick={() => window.print()}
                        >
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimer
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid gap-5 p-0 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-2">
                    {data?.badges.map((entry: any) => {
                        const visual = entry.template || {
                            primary_color: '#B98235',
                            show_qr: true,
                            show_organization: true,
                            format: 'portrait',
                        };

                        return (
                            <div
                                key={entry.id}
                                className={`relative overflow-hidden rounded-2xl border bg-white text-slate-950 shadow-sm print:break-inside-avoid ${entry.status === 'revoked' ? 'opacity-55' : ''}`}
                            >
                                <div
                                    className="h-3"
                                    style={{
                                        backgroundColor: visual.primary_color,
                                    }}
                                />
                                <div
                                    className={`grid items-center gap-4 p-5 ${visual.format === 'landscape' ? 'grid-cols-[1fr_auto]' : 'text-center'}`}
                                >
                                    <div
                                        className={
                                            visual.format === 'portrait'
                                                ? 'text-center'
                                                : ''
                                        }
                                    >
                                        {visual.show_organization && (
                                            <div
                                                className="mb-5 text-xs font-bold tracking-[0.18em] uppercase"
                                                style={{
                                                    color: visual.primary_color,
                                                }}
                                            >
                                                {workspace.organization.name}
                                            </div>
                                        )}
                                        <div className="text-xl font-black">
                                            {entry.holder_name}
                                        </div>
                                        <div className="mt-1 text-sm text-slate-500">
                                            {entry.holder_role ||
                                                (entry.source_type === 'guest'
                                                    ? 'Invité'
                                                    : 'Participant')}
                                        </div>
                                        <div className="mt-4 text-xs font-semibold text-slate-400">
                                            {workspace.event.name}
                                        </div>
                                    </div>
                                    {visual.show_qr && (
                                        <div
                                            className={`flex justify-center ${visual.format === 'portrait' ? 'mt-4' : ''}`}
                                        >
                                            <QRCodeSVG
                                                value={entry.code}
                                                size={112}
                                                level="M"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <QrCode className="h-3 w-3" />
                                        {entry.code.slice(0, 10).toUpperCase()}
                                    </span>
                                    {entry.status === 'revoked' ? (
                                        <StatusBadge variant="destructive">
                                            Révoqué
                                        </StatusBadge>
                                    ) : (
                                        canIssue && (
                                            <Button
                                                className="print:hidden"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    revoke.mutate(entry.id)
                                                }
                                            >
                                                Révoquer
                                            </Button>
                                        )
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {!data?.badges.length && (
                        <div className="col-span-full rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground print:hidden">
                            Aucun badge généré pour le moment.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
