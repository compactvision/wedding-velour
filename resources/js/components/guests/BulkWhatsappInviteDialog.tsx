import { CheckCircle2, Copy, MessageCircle, Send, Users } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { buildWhatsappInvitationLink, normalizeWhatsappPhone } from '@/lib/guestInvitations';

export default function BulkWhatsappInviteDialog({ open, onOpenChange, guests = [], wedding }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const recipients = useMemo(() => {
    if (!wedding) {
      return [];
    }

    return guests
      .map(guest => ({
        guest,
        phone: normalizeWhatsappPhone(guest.phone),
        link: buildWhatsappInvitationLink(guest, wedding),
      }))
      .filter(item => item.phone && item.link);
  }, [guests, wedding]);

  const current = recipients[currentIndex];
  const sentCount = Math.min(currentIndex, recipients.length);

  const handleOpenNext = () => {
    if (!current) {
      return;
    }

    window.open(current.link, '_blank', 'noopener,noreferrer');
    setCurrentIndex(index => Math.min(index + 1, recipients.length));
  };

  const handleCopyAll = async () => {
    const text = recipients
      .map(({ guest, link }) => `${guest.first_name || ''} ${guest.last_name || ''}: ${link}`.trim())
      .join('\n');

    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      document.execCommand('copy');
      textArea.remove();
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenChange = (nextOpen) => {
    onOpenChange(nextOpen);

    if (!nextOpen) {
      setCurrentIndex(0);
      setCopied(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Invitations WhatsApp
          </DialogTitle>
          <DialogDescription>
            {recipients.length} invité{recipients.length > 1 ? 's' : ''} avec téléphone valide
          </DialogDescription>
        </DialogHeader>

        {recipients.length === 0 ? (
          <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
            Aucun invité avec téléphone et lien d'invitation.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/40 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium">{sentCount}/{recipients.length} ouverts</span>
                <span className="text-muted-foreground">{Math.round((sentCount / recipients.length) * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-green-500 transition-all"
                  style={{ width: `${(sentCount / recipients.length) * 100}%` }}
                />
              </div>
            </div>

            {current ? (
              <div className="rounded-md border p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-green-50 p-2 text-green-700">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{current.guest.first_name} {current.guest.last_name}</p>
                    <p className="text-sm text-muted-foreground">{current.phone}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                Toutes les invitations WhatsApp ont été ouvertes.
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
                disabled={!current}
                onClick={handleOpenNext}
              >
                {current ? <Send className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {current ? 'Ouvrir le message' : 'Terminé'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleCopyAll}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié' : 'Copier les liens'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
