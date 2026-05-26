import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, QrCode, ExternalLink } from 'lucide-react';

export default function TableQRModal({ open, onOpenChange, table }) {
  const qrRef = useRef(null);

  if (!table) return null;

  const url = `${window.location.origin}/table-menu?table=${table.id}`;

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 400, 480);
      ctx.drawImage(img, 50, 40, 300, 300);
      ctx.fillStyle = '#333';
      ctx.font = 'bold 22px serif';
      ctx.textAlign = 'center';
      ctx.fillText(table.name, 200, 380);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('Scannez pour commander', 200, 408);
      const link = document.createElement('a');
      link.download = `qr-${table.name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            QR Code — {table.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div ref={qrRef} className="p-4 bg-white rounded-2xl border-2 border-border shadow-sm">
            <QRCodeSVG
              value={url}
              size={220}
              level="H"
              includeMargin={false}
              fgColor="#2d1a0e"
              imageSettings={{
                src: "https://cdn-icons-png.flaticon.com/512/3917/3917702.png",
                x: undefined,
                y: undefined,
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          <div className="text-center">
            <p className="font-display font-semibold text-lg">{table.name}</p>
            <p className="text-xs text-muted-foreground mt-1">Scannez pour voir le menu et commander</p>
          </div>

          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => window.open(url, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-1" /> Tester
            </Button>
            <Button className="flex-1" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-1" /> Télécharger
            </Button>
          </div>

          <p className="text-xs text-muted-foreground break-all text-center px-2 bg-muted rounded-lg py-2 w-full">
            {url}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}