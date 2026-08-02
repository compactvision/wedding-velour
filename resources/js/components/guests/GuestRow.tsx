import { MoreHorizontal, Pencil, Trash2, QrCode } from 'lucide-react';
import React from 'react';
import StatusBadge from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';

const roleLabels = {
    guest: 'Invité',
    bride: 'Mariée',
    groom: 'Marié',
    best_man: 'Témoin (H)',
    maid_of_honor: 'Témoin (F)',
    family: 'Famille',
    vip: 'VIP',
};

export default function GuestRow({
    guest,
    preferences = [],
    onEdit,
    onDelete,
    onStatusChange,
    onShowQR = null,
    onInvite = null,
    readOnly = false,
}) {
    const handleInvite = onInvite || onShowQR;

    return (
        <tr className="border-b border-border/40 transition-colors hover:bg-muted/30">
            <td className="px-4 py-3">
                <div>
                    <p className="text-sm font-medium">
                        {guest.first_name} {guest.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {guest.email || '-'}
                    </p>
                </div>
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">
                {roleLabels[guest.role] || guest.role}
            </td>
            <td className="px-4 py-3">
                <StatusBadge status={guest.status} />
            </td>
            <td className="px-4 py-3 text-center text-sm">
                {guest.companions || 0}
            </td>
            <td className="max-w-[240px] px-4 py-3 text-sm text-muted-foreground">
                {preferences.length > 0 ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                className="flex max-w-full flex-wrap gap-1.5 text-left"
                            >
                                {preferences.slice(0, 2).map((preference) => (
                                    <span
                                        key={preference}
                                        className="max-w-[110px] truncate rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                    >
                                        {preference}
                                    </span>
                                ))}
                                {preferences.length > 2 && (
                                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                        +{preferences.length - 2}
                                    </span>
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent
                            side="top"
                            align="start"
                            className="max-w-xs bg-stone-950 p-3 text-left text-white"
                        >
                            <p className="mb-2 text-[10px] font-bold tracking-[0.18em] text-white/60 uppercase">
                                Goûts enregistrés
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {preferences.map((preference) => (
                                    <span
                                        key={preference}
                                        className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white"
                                    >
                                        {preference}
                                    </span>
                                ))}
                            </div>
                        </TooltipContent>
                    </Tooltip>
                ) : (
                    <span className="text-xs">Non renseigné</span>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-muted-foreground">
                {guest.phone || '-'}
            </td>
            <td className="px-4 py-3">
                {!readOnly && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            onClick={() => handleInvite(guest)}
                            title="Inviter / QR code"
                        >
                            <QrCode className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(guest)}>
                                    <Pencil className="mr-2 h-4 w-4" /> Modifier
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => handleInvite(guest)}
                                >
                                    <QrCode className="mr-2 h-4 w-4" />{' '}
                                    Invitation QR / Envoyer
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        onStatusChange(guest, 'confirmed')
                                    }
                                >
                                    Marquer Confirmé
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() =>
                                        onStatusChange(guest, 'declined')
                                    }
                                >
                                    Marquer Décliné
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => onDelete(guest)}
                                    className="text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />{' '}
                                    Supprimer
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </td>
        </tr>
    );
}
