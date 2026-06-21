import { Mail, MessageCircle, Phone, QrCode, Copy, CheckCircle2, Loader2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  buildInvitationUrl,
  buildWhatsappInvitationLink,
  normalizeWhatsappPhone,
} from '@/lib/guestInvitations';
import { cn } from '@/lib/utils';

export default function GuestInviteModal({ open, onOpenChange, guest, wedding }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // 'email' | 'copied'

  if (!guest || !wedding) {
    return null;
  }

  const inviteUrl = buildInvitationUrl(guest.invitation_link);
  const whatsappPhone = normalizeWhatsappPhone(guest.phone);
  const whatsappLink = buildWhatsappInvitationLink(guest, wedding);
  const smsText = encodeURIComponent(
    `Invitation mariage ${wedding.title} - ${guest.first_name}, confirmez votre présence : ${inviteUrl}`
  );

  const handleSendEmail = async () => {
    if (!guest.email) {
      return;
    }

    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: guest.email,
      subject: `💍 Invitation au mariage de ${wedding.title}`,
      body: `
        <div style="font-family: Georgia, serif; max-width: 500px; margin: auto; padding: 40px; text-align: center; background: #fffdf9; border: 1px solid #e8d5b7;">
          <div style="color: #b8860b; font-size: 30px; margin-bottom: 10px;">💍</div>
          <h1 style="font-size: 28px; color: #3d2b1f; margin-bottom: 4px;">${wedding.title}</h1>
          <p style="color: #888; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 30px;">Vous êtes cordialement invité(e)</p>
          
          <p style="color: #555; font-size: 15px;">Cher(e) <strong>${guest.first_name} ${guest.last_name}</strong>,</p>
          <p style="color: #555; font-size: 14px; line-height: 1.7;">Nous avons l'immense joie de vous convier à notre mariage et serions honorés de partager ce jour unique avec vous.</p>
          
          ${wedding.date ? `<p style="color: #3d2b1f; font-weight: bold; margin-top: 20px;">📅 ${new Date(wedding.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
          ${wedding.venue ? `<p style="color: #555;">📍 ${wedding.venue}</p>` : ''}
          
          <a href="${inviteUrl}" style="display: inline-block; margin-top: 28px; padding: 14px 36px; background: #b8860b; color: white; text-decoration: none; border-radius: 6px; font-size: 15px; font-family: sans-serif;">
            Confirmer ma présence
          </a>
          
          <p style="color: #bbb; font-size: 12px; margin-top: 30px;">Avec tout notre amour ❤️</p>
        </div>
      `
    });
    setSending(false);
    setSent('email');
    setTimeout(() => setSent(null), 3000);
  };

  const handleCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(inviteUrl).catch(() => undefined);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = inviteUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
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
          <DialogTitle className="font-display flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Invitation — {guest.first_name} {guest.last_name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="qr" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="send">Envoyer</TabsTrigger>
          </TabsList>

          {/* QR Tab */}
          <TabsContent value="qr" className="flex flex-col items-center gap-4 pt-4">
            <div className="p-4 bg-white rounded-2xl border-2 border-border shadow-sm">
              <QRCodeSVG
                value={inviteUrl}
                size={200}
                level="H"
                fgColor="#3d2b1f"
              />
            </div>
            <div className="text-center">
              <p className="font-semibold">{guest.first_name} {guest.last_name}</p>
              <p className="text-xs text-muted-foreground mt-1">Scannez pour confirmer la présence</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
                {sent === 'copied' ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {sent === 'copied' ? 'Copié !' : 'Copier le lien'}
              </Button>
            </div>
          </TabsContent>

          {/* Send Tab */}
          <TabsContent value="send" className="space-y-3 pt-4">
            {/* Email */}
            <Button
              className="w-full h-12 justify-start gap-3"
              variant={guest.email ? "default" : "secondary"}
              disabled={!guest.email || sending}
              onClick={handleSendEmail}
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> :
               sent === 'email' ? <CheckCircle2 className="w-5 h-5 text-green-300" /> :
               <Mail className="w-5 h-5" />}
              <div className="text-left">
                <div className="font-medium">{sent === 'email' ? 'Email envoyé !' : 'Envoyer par Email'}</div>
                <div className="text-xs opacity-70">{guest.email || 'Aucun email renseigné'}</div>
              </div>
            </Button>

            {/* WhatsApp */}
            <a
              href={whatsappLink || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(!whatsappLink && "pointer-events-none opacity-50")}
            >
              <Button className="w-full h-12 justify-start gap-3 bg-green-500 hover:bg-green-600 text-white" disabled={!whatsappLink}>
                <MessageCircle className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Envoyer par WhatsApp</div>
                  <div className="text-xs opacity-70">{whatsappPhone || 'Aucun téléphone renseigné'}</div>
                </div>
              </Button>
            </a>

            {/* SMS */}
            <a
              href={`sms:${guest.phone || ''}?body=${smsText}`}
              className={cn(!guest.phone && "pointer-events-none opacity-50")}
            >
              <Button variant="outline" className="w-full h-12 justify-start gap-3" disabled={!guest.phone}>
                <Phone className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">Envoyer par SMS</div>
                  <div className="text-xs opacity-70">{guest.phone || 'Aucun téléphone renseigné'}</div>
                </div>
              </Button>
            </a>

            {/* Copy link */}
            <div className="pt-2 border-t border-border">
              <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground" onClick={handleCopy}>
                {sent === 'copied' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {sent === 'copied' ? 'Lien copié !' : 'Copier le lien d\'invitation'}
              </Button>
              <p className="text-xs text-muted-foreground break-all px-3 mt-1">{inviteUrl}</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
