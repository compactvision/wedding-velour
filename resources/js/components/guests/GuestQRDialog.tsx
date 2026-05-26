import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { Heart, Download, Mail, MessageCircle, Phone, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function GuestQRDialog({ open, onOpenChange, guest, wedding }) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);

  if (!guest) return null;

  const inviteUrl = `${window.location.origin}/invitation?invite=${guest.invitation_link}`;
  const guestName = `${guest.first_name} ${guest.last_name}`;
  const weddingTitle = wedding?.title || 'le mariage';
  const weddingDate = wedding?.date ? new Date(wedding.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

  const emailBody = encodeURIComponent(
    `Cher(e) ${guestName},\n\nVous êtes cordialement invité(e) à ${weddingTitle}${weddingDate ? ` le ${weddingDate}` : ''}.\n\nCliquez sur ce lien pour confirmer votre présence :\n${inviteUrl}\n\nNous comptons sur vous !\n\nAvec toute notre affection 💕`
  );
  const emailSubject = encodeURIComponent(`Invitation à ${weddingTitle}`);

  const whatsappText = encodeURIComponent(
    `💌 Bonjour ${guest.first_name} ! Vous êtes invité(e) à ${weddingTitle}${weddingDate ? ` le ${weddingDate}` : ''}. Confirmez votre présence ici : ${inviteUrl}`
  );

  const smsText = encodeURIComponent(
    `Invitation ${weddingTitle}: Confirmez votre présence -> ${inviteUrl}`
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const a = document.createElement('a');
      a.download = `invitation-${guest.first_name}-${guest.last_name}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Heart className="w-4 h-4 text-primary" fill="currentColor" />
            Invitation de {guestName}
          </DialogTitle>
        </DialogHeader>

        {/* QR Code */}
        <div className="flex flex-col items-center py-4 bg-gradient-to-b from-primary/5 to-background rounded-xl border border-primary/10">
          <div ref={qrRef} className="bg-white p-3 rounded-xl shadow-md">
            <QRCodeSVG
              value={inviteUrl}
              size={180}
              fgColor="#1a1209"
              bgColor="#ffffff"
              level="M"
              imageSettings={{ src: '', excavate: false }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center px-4">
            Scannez ce QR code pour accéder à l'invitation
          </p>
        </div>

        {/* Link copy */}
        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground truncate">
            {inviteUrl}
          </div>
          <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>

        {/* Send options */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Envoyer l'invitation via</p>
          
          <a
            href={`mailto:${guest.email || ''}?subject=${emailSubject}&body=${emailBody}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">{guest.email || 'Aucun email renseigné'}</p>
            </div>
          </a>

          <a
            href={`https://wa.me/${(guest.phone || '').replace(/\s|\+|-/g, '')}?text=${whatsappText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium">WhatsApp</p>
              <p className="text-xs text-muted-foreground">{guest.phone || 'Aucun numéro renseigné'}</p>
            </div>
          </a>

          <a
            href={`sms:${guest.phone || ''}?body=${smsText}`}
            className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
              <Phone className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">SMS</p>
              <p className="text-xs text-muted-foreground">{guest.phone || 'Aucun numéro renseigné'}</p>
            </div>
          </a>
        </div>

        <Button variant="outline" className="w-full" onClick={downloadQR}>
          <Download className="w-4 h-4 mr-2" />
          Télécharger le QR code
        </Button>
      </DialogContent>
    </Dialog>
  );
}