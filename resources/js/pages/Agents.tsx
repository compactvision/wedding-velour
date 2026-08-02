import { Link, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
    Check,
    Copy,
    Mail,
    Plus,
    ShieldCheck,
    Trash2,
    UserCog,
    Users,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { TeamInvitation, TeamMember } from '@/api/tenantClient';
import { tenantTeam } from '@/api/tenantClient';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

function errorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) {
        return 'Impossible d’effectuer cette opération.';
    }

    const errors = error.response?.data?.errors;

    if (errors && typeof errors === 'object') {
        const first = Object.values(errors).flat()[0];

        if (typeof first === 'string') {
            return first;
        }
    }

    return error.response?.data?.message || 'Impossible d’effectuer cette opération.';
}

export default function Agents() {
    const workspace = (usePage().props as any).workspace;
    const eventId = workspace?.event?.id || null;
    const organizationSlug = workspace?.organization?.slug || '';
    const eventSlug = workspace?.event?.slug || '';
    const permissions: string[] = workspace?.permissions || [];
    const canManage =
        permissions.includes('*') || permissions.includes('team.manage');
    const queryClient = useQueryClient();
    const [inviteOpen, setInviteOpen] = useState(false);
    const [editing, setEditing] = useState<TeamMember | null>(null);
    const [form, setForm] = useState({
        email: '',
        phone: '',
        role_slug: '',
    });
    const [memberForm, setMemberForm] = useState({
        role_slug: '',
        status: 'active' as 'active' | 'suspended',
    });
    const [formError, setFormError] = useState('');
    const [invitationLink, setInvitationLink] = useState('');
    const [copied, setCopied] = useState(false);

    const teamQuery = useQuery({
        queryKey: ['tenant-team', eventId],
        queryFn: () => tenantTeam.get(organizationSlug, eventSlug),
        enabled: Boolean(eventId),
    });
    const team = teamQuery.data?.data;
    const roles = useMemo(() => team?.roles || [], [team?.roles]);

    const refresh = () =>
        queryClient.invalidateQueries({ queryKey: ['tenant-team', eventId] });

    const openInvitation = () => {
        setForm({
            email: '',
            phone: '',
            role_slug: roles[0]?.slug || '',
        });
        setFormError('');
        setInvitationLink('');
        setInviteOpen(true);
    };

    const openMember = (member: TeamMember) => {
        setMemberForm({
            role_slug: member.roles[0]?.slug || roles[0]?.slug || '',
            status: member.status,
        });
        setFormError('');
        setEditing(member);
    };

    const inviteMutation = useMutation({
        mutationFn: () =>
            tenantTeam.invite(organizationSlug, eventSlug, {
                email: form.email || undefined,
                phone: form.phone || undefined,
                role_slug: form.role_slug,
            }),
        onSuccess: (invitation) => {
            setInvitationLink(invitation.invitation_url || '');
            refresh();
        },
        onError: (error) => setFormError(errorMessage(error)),
    });

    const updateMutation = useMutation({
        mutationFn: () =>
            tenantTeam.updateMember(
                organizationSlug,
                eventSlug,
                editing!.id,
                memberForm,
            ),
        onSuccess: () => {
            setEditing(null);
            refresh();
        },
        onError: (error) => setFormError(errorMessage(error)),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) =>
            tenantTeam.cancelInvitation(organizationSlug, eventSlug, id),
        onSuccess: refresh,
    });

    const copyInvitation = async () => {
        await navigator.clipboard.writeText(invitationLink);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    if (!workspace) {
        return (
            <EmptyState
                icon={Users}
                title="Choisissez un événement"
                description="Activez un espace Planivo avant de gérer son équipe."
                actionLabel="Choisir un événement"
                onAction={() => window.location.assign('/onboarding')}
            />
        );
    }

    if (teamQuery.isError) {
        return (
            <EmptyState
                icon={ShieldCheck}
                title="Accès à l’équipe indisponible"
                description={errorMessage(teamQuery.error)}
                actionLabel="Retour à l’espace"
                onAction={() => window.location.assign('/workspace')}
            />
        );
    }

    return (
        <div>
            <PageHeader
                title="Équipe & accès"
                subtitle={`${workspace.event.name} · ${team?.members.length || 0} collaborateur${team?.members.length === 1 ? '' : 's'}`}
            >
                <Button variant="outline" asChild>
                    <Link href="/workspace">Aperçu événement</Link>
                </Button>
                {canManage && (
                    <Button onClick={openInvitation}>
                        <Plus className="mr-2 h-4 w-4" />
                        Inviter un collaborateur
                    </Button>
                )}
            </PageHeader>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(team?.members || []).map((member) => (
                    <Card
                        key={member.id}
                        className={member.status !== 'active' ? 'opacity-60' : ''}
                    >
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <CardTitle className="truncate text-base">
                                            {member.name}
                                        </CardTitle>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {member.email}
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    variant={
                                        member.status === 'active'
                                            ? 'default'
                                            : 'secondary'
                                    }
                                >
                                    {member.is_owner
                                        ? 'Propriétaire'
                                        : member.status === 'active'
                                          ? 'Actif'
                                          : 'Suspendu'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                                <span className="text-muted-foreground">Rôle</span>
                                <strong className="float-right">
                                    {member.is_owner
                                        ? 'Propriétaire'
                                        : member.roles[0]?.name || 'Sans rôle'}
                                </strong>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                                {member.is_owner
                                    ? 'Accès complet à l’organisation.'
                                    : `${member.permissions.length} permission${member.permissions.length > 1 ? 's' : ''} accordée${member.permissions.length > 1 ? 's' : ''}.`}
                            </p>
                            {canManage && !member.is_owner && (
                                <Button
                                    variant="outline"
                                    className="mt-4 w-full"
                                    onClick={() => openMember(member)}
                                >
                                    <UserCog className="mr-2 h-4 w-4" />
                                    Modifier l’accès
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {(team?.invitations.length || 0) > 0 && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Mail className="h-5 w-5 text-primary" />
                            Invitations en attente
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y">
                        {team?.invitations.map((invitation: TeamInvitation) => (
                            <div
                                key={invitation.id}
                                className="flex items-center justify-between gap-3 py-3"
                            >
                                <div>
                                    <p className="font-medium">
                                        {invitation.email || invitation.phone}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {roles.find(
                                            (role) =>
                                                role.slug ===
                                                invitation.role_slug,
                                        )?.name || invitation.role_slug}
                                        {' · expire le '}
                                        {new Date(
                                            invitation.expires_at,
                                        ).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                                {canManage && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        aria-label="Annuler l’invitation"
                                        onClick={() =>
                                            cancelMutation.mutate(invitation.id)
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Inviter un collaborateur</DialogTitle>
                    </DialogHeader>
                    {invitationLink ? (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                                Invitation créée. Envoyez ce lien privé au
                                collaborateur ; il expire dans 7 jours.
                            </div>
                            <div className="flex gap-2">
                                <Input readOnly value={invitationLink} />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={copyInvitation}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="team-email">E-mail</Label>
                                <Input
                                    id="team-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            email: event.target.value,
                                        })
                                    }
                                    placeholder="collaborateur@exemple.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="team-phone">
                                    Téléphone (si aucun e-mail)
                                </Label>
                                <Input
                                    id="team-phone"
                                    value={form.phone}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            phone: event.target.value,
                                        })
                                    }
                                    placeholder="+243…"
                                />
                            </div>
                            <div>
                                <Label>Rôle sur cet événement</Label>
                                <Select
                                    value={form.role_slug}
                                    onValueChange={(role_slug) =>
                                        setForm({ ...form, role_slug })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir un rôle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {roles.map((role) => (
                                            <SelectItem
                                                key={role.id}
                                                value={role.slug}
                                            >
                                                {role.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {formError && (
                                <p className="text-sm text-destructive">
                                    {formError}
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setInviteOpen(false)}
                        >
                            Fermer
                        </Button>
                        {!invitationLink && (
                            <Button
                                onClick={() => inviteMutation.mutate()}
                                disabled={
                                    (!form.email && !form.phone) ||
                                    !form.role_slug ||
                                    inviteMutation.isPending
                                }
                            >
                                Créer l’invitation
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(editing)} onOpenChange={() => setEditing(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Accès de {editing?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Rôle</Label>
                            <Select
                                value={memberForm.role_slug}
                                onValueChange={(role_slug) =>
                                    setMemberForm({
                                        ...memberForm,
                                        role_slug,
                                    })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {roles.map((role) => (
                                        <SelectItem
                                            key={role.id}
                                            value={role.slug}
                                        >
                                            {role.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <div>
                                <Label>Accès actif</Label>
                                <p className="text-xs text-muted-foreground">
                                    La suspension bloque immédiatement cet
                                    événement.
                                </p>
                            </div>
                            <Switch
                                checked={memberForm.status === 'active'}
                                onCheckedChange={(active) =>
                                    setMemberForm({
                                        ...memberForm,
                                        status: active
                                            ? 'active'
                                            : 'suspended',
                                    })
                                }
                            />
                        </div>
                        {formError && (
                            <p className="text-sm text-destructive">{formError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditing(null)}
                        >
                            Annuler
                        </Button>
                        <Button
                            onClick={() => updateMutation.mutate()}
                            disabled={
                                !memberForm.role_slug || updateMutation.isPending
                            }
                        >
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
