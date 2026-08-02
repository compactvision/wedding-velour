import {
    Mail,
    MessageCircle,
    Phone,
    QrCode,
    Copy,
    CheckCircle2,
    Loader2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
    buildInvitationUrl,
    buildWhatsappInvitationLink,
    normalizeWhatsappPhone,
} from '@/lib/guestInvitations';
import { cn } from '@/lib/utils';

export default function GuestInviteModal({
    open,
    onOpenChange,
    guest,
    wedding,
}) {
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(null); // 'email' | 'copied'

    if (!guest || !wedding) {
        return null;
    }

    const inviteUrl = buildInvitationUrl(guest.invitation_link);
    const whatsappPhone = normalizeWhatsappPhone(guest.phone);
    const whatsappLink = buildWhatsappInvitationLink(guest, wedding);
    const smsText = encodeURIComponent(
        `Invitation ${wedding.title} - ${guest.first_name}, confirmez votre présence : ${inviteUrl}`,
    );

    const handleSendEmail = () => {
        if (!guest.email) {
            return;
        }

        setSending(true);
        const subject = encodeURIComponent(`Invitation — ${wedding.title}`);
        const body = encodeURIComponent(
            [
                `Bonjour ${guest.first_name} ${guest.last_name},`,
                '',
                `Vous êtes invité(e) à l’événement « ${wedding.title} ».`,
                wedding.date
                    ? `Date : ${new Date(wedding.date).toLocaleDateString('fr-FR', { dateStyle: 'long' })}`
                    : '',
                wedding.venue ? `Lieu : ${wedding.venue}` : '',
                '',
                `Confirmez votre présence : ${inviteUrl}`,
            ]
                .filter(Boolean)
                .join('\n'),
        );

        window.location.href = `mailto:${guest.email}?subject=${subject}&body=${body}`;
        setSending(false);
        setSent('email');
        setTimeout(() => setSent(null), 3000);
    };

    const handleCopy = () => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(inviteUrl).catch(() => undefined);
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = inviteUrl;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            document.execCommand('copy');
            textArea.remove();
        }

        setSent('copied');
        setTimeout(() => setSent(null), 2000);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 font-display">
                        <QrCode className="h-5 w-5 text-primary" />
                        Invitation — {guest.first_name} {guest.last_name}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="qr" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="qr">QR Code</TabsTrigger>
                        <TabsTrigger value="send">Envoyer</TabsTrigger>
                    </TabsList>

                    {/* QR Tab */}
                    <TabsContent
                        value="qr"
                        className="flex flex-col items-center gap-4 pt-4"
                    >
                        <div className="rounded-2xl border-2 border-border bg-white p-4 shadow-sm">
                            <QRCodeSVG
                                value={inviteUrl}
                                size={200}
                                level="H"
                                fgColor="#3d2b1f"
                            />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold">
                                {guest.first_name} {guest.last_name}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Scannez pour confirmer la présence
                            </p>
                        </div>
                        <div className="flex w-full gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleCopy}
                            >
                                {sent === 'copied' ? (
                                    <CheckCircle2 className="mr-1 h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="mr-1 h-4 w-4" />
                                )}
                                {sent === 'copied'
                                    ? 'Copié !'
                                    : 'Copier le lien'}
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Send Tab */}
                    <TabsContent value="send" className="space-y-3 pt-4">
                        {/* Email */}
                        <Button
                            className="h-12 w-full justify-start gap-3"
                            variant={guest.email ? 'default' : 'secondary'}
                            disabled={!guest.email || sending}
                            onClick={handleSendEmail}
                        >
                            {sending ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : sent === 'email' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-300" />
                            ) : (
                                <Mail className="h-5 w-5" />
                            )}
                            <div className="text-left">
                                <div className="font-medium">
                                    {sent === 'email'
                                        ? 'Email préparé !'
                                        : 'Préparer un Email'}
                                </div>
                                <div className="text-xs opacity-70">
                                    {guest.email || 'Aucun email renseigné'}
                                </div>
                            </div>
                        </Button>

                        {/* WhatsApp */}
                        <a
                            href={whatsappLink || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                                !whatsappLink &&
                                    'pointer-events-none opacity-50',
                            )}
                        >
                            <Button
                                className="h-12 w-full justify-start gap-3 bg-green-500 text-white hover:bg-green-600"
                                disabled={!whatsappLink}
                            >
                                <MessageCircle className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-medium">
                                        Envoyer par WhatsApp
                                    </div>
                                    <div className="text-xs opacity-70">
                                        {whatsappPhone ||
                                            'Aucun téléphone renseigné'}
                                    </div>
                                </div>
                            </Button>
                        </a>

                        {/* SMS */}
                        <a
                            href={`sms:${guest.phone || ''}?body=${smsText}`}
                            className={cn(
                                !guest.phone &&
                                    'pointer-events-none opacity-50',
                            )}
                        >
                            <Button
                                variant="outline"
                                className="h-12 w-full justify-start gap-3"
                                disabled={!guest.phone}
                            >
                                <Phone className="h-5 w-5" />
                                <div className="text-left">
                                    <div className="font-medium">
                                        Envoyer par SMS
                                    </div>
                                    <div className="text-xs opacity-70">
                                        {guest.phone ||
                                            'Aucun téléphone renseigné'}
                                    </div>
                                </div>
                            </Button>
                        </a>

                        {/* Copy link */}
                        <div className="border-t border-border pt-2">
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 text-muted-foreground"
                                onClick={handleCopy}
                            >
                                {sent === 'copied' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                ) : (
                                    <Copy className="h-4 w-4" />
                                )}
                                {sent === 'copied'
                                    ? 'Lien copié !'
                                    : "Copier le lien d'invitation"}
                            </Button>
                            <p className="mt-1 px-3 text-xs break-all text-muted-foreground">
                                {inviteUrl}
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
