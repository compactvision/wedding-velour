import { Link, router } from '@inertiajs/react';
import { CalendarDays, CheckCircle2, ShieldCheck, Users } from 'lucide-react';
import React, { useState } from 'react';
import BrandLogo from '@/components/shared/BrandLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
    invitation: {
        organization: string;
        event: string | null;
        invited_by: string | null;
        recipient: string | null;
        role: string | null;
        status: string;
        expires_at: string;
    };
    token: string;
};

export default function TeamInvitation({ invitation, token }: Props) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const [expired] = useState(
        () =>
            invitation.status !== 'pending' ||
            new Date(invitation.expires_at).getTime() < Date.now(),
    );

    const accept = () => {
        setPending(true);
        setError('');
        router.post(
            `/team/invitations/${encodeURIComponent(token)}`,
            {},
            {
                onError: (errors) => {
                    setError(
                        Object.values(errors)[0] ||
                            'Cette invitation ne peut pas être acceptée.',
                    );
                    setPending(false);
                },
                onFinish: () => setPending(false),
            },
        );
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-stone-50 p-5">
            <Card className="w-full max-w-lg overflow-hidden shadow-lg">
                <div className="bg-primary px-6 py-7 text-primary-foreground">
                    <BrandLogo variant="full" className="mx-auto h-24 w-56" />
                </div>
                <CardContent className="space-y-5 p-7 text-center">
                    {expired ? (
                        <ShieldCheck className="mx-auto h-12 w-12 text-stone-400" />
                    ) : (
                        <Users className="mx-auto h-12 w-12 text-primary" />
                    )}
                    <div>
                        <h1 className="font-display text-2xl font-semibold">
                            {expired
                                ? 'Invitation indisponible'
                                : `Rejoignez ${invitation.organization}`}
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {expired
                                ? 'Cette invitation a expiré ou a déjà été utilisée.'
                                : `${invitation.invited_by || 'Un organisateur'} vous invite à collaborer sur ${invitation.event || 'un événement Planivo'}.`}
                        </p>
                    </div>
                    {!expired && (
                        <>
                            <div className="space-y-3 rounded-xl bg-muted p-4 text-left text-sm">
                                <div className="flex items-center gap-3">
                                    <CalendarDays className="h-4 w-4 text-primary" />
                                    <span>{invitation.event}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    <span>Rôle : {invitation.role}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                    <span>Destinataire : {invitation.recipient}</span>
                                </div>
                            </div>
                            {error && (
                                <p className="text-sm text-destructive">{error}</p>
                            )}
                            <Button
                                className="h-12 w-full"
                                onClick={accept}
                                disabled={pending}
                            >
                                Accepter et rejoindre l’équipe
                            </Button>
                        </>
                    )}
                    <Button variant="ghost" asChild>
                        <Link href="/workspace">Retour à Planivo</Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
