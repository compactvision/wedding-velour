import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Mail, QrCode } from 'lucide-react';

const roleLabels = {
  guest: 'Invité',
  bride: 'Mariée',
  groom: 'Marié',
  best_man: 'Témoin (H)',
  maid_of_honor: 'Témoin (F)',
  family: 'Famille',
  vip: 'VIP',
};

export default function GuestRow({ guest, onEdit, onDelete, onStatusChange, onShowQR, onInvite }) {
  const handleInvite = onInvite || onShowQR;
  return (
    <tr className="border-b border-border/40 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-sm">{guest.first_name} {guest.last_name}</p>
          <p className="text-xs text-muted-foreground">{guest.email || '-'}</p>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{roleLabels[guest.role] || guest.role}</td>
      <td className="py-3 px-4"><StatusBadge status={guest.status} /></td>
      <td className="py-3 px-4 text-sm text-center">{guest.companions || 0}</td>
      <td className="py-3 px-4 text-sm text-muted-foreground">{guest.phone || '-'}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleInvite(guest)} title="Inviter / QR code">
            <QrCode className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(guest)}>
                <Pencil className="w-4 h-4 mr-2" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleInvite(guest)}>
                <QrCode className="w-4 h-4 mr-2" /> Invitation QR / Envoyer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(guest, 'confirmed')}>
                Marquer Confirmé
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange(guest, 'declined')}>
                Marquer Décliné
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(guest)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}