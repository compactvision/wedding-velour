import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { TableProperties, Download, ExternalLink } from 'lucide-react';

export default function TableQRDialog({ open, onOpenChange, table }) {
  const qrRef = useRef(null);

  if (!table) return null;

  const menuUrl = `${window.location.origin}/table-menu?table=${table.id}`;

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
      a.download = `qr-${table.name.replace(/\s/g, '-')}.png`;
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
            <TableProperties className="w-4 h-4 text-primary" />
            QR Code — {table.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6 bg-gradient-to-b from-primary/5 to-background rounded-xl border border-primary/10">
          <div ref={qrRef} className="bg-white p-4 rounded-xl shadow-md mb-4">
            <QRCodeSVG
              value={menuUrl}
              size={200}
              fgColor="#1a1209"
              bgColor="#ffffff"
              level="M"
            />
          </div>
          <p className="text-sm font-semibold text-center">{table.name}</p>
          <p className="text-xs text-muted-foreground mt-1 text-center px-4">
            Placez ce QR code sur la table. Les invités scanneront pour commander.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={downloadQR}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
          <Button className="flex-1" asChild>
            <a href={menuUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir le menu
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}