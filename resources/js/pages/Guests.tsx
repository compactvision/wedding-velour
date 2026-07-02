import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GlassWater, MessageCircle, MoreHorizontal, Pencil, Plus, QrCode, Search, Trash2, Users } from 'lucide-react';
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import BulkWhatsappInviteDialog from '@/components/guests/BulkWhatsappInviteDialog';
import GuestFormDialog from '@/components/guests/GuestFormDialog';
import GuestInviteModal from '@/components/guests/GuestInviteModal';
import GuestRow from '@/components/guests/GuestRow';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveWedding } from '@/hooks/useWedding';
import { buildWhatsappInvitationLink } from '@/lib/guestInvitations';
import StatusBadge from '@/components/shared/StatusBadge';

export default function Guests() {
  const { weddings, activeWedding, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [inviteGuest, setInviteGuest] = useState(null);
  const [showBulkWhatsapp, setShowBulkWhatsapp] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', activeWeddingId],
    queryFn: () => base44.entities.Guest.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });
  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items', activeWeddingId],
    queryFn: () => base44.entities.MenuItem.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();

      return base44.entities.Guest.create({
        ...data,
        wedding_id: activeWeddingId,
        qr_code: generateId(),
        invitation_link: generateId()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', activeWeddingId] });
      setShowForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Guest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests', activeWeddingId] });
      setShowForm(false);
      setEditingGuest(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Guest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guests', activeWeddingId] }),
  });

  const handleSave = (formData) => {
    if (editingGuest) {
      updateMutation.mutate({ id: editingGuest.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    setShowForm(true);
  };
  const handleStatusChange = (guest, status) => updateMutation.mutate({ id: guest.id, data: { status } });

  const filteredGuests = guests.filter(g => {
    const matchesSearch = `${g.first_name} ${g.last_name} ${g.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;

    return matchesSearch && matchesStatus;
  });
  const whatsappRecipientCount = activeWedding
    ? guests.filter(guest => buildWhatsappInvitationLink(guest, activeWedding)).length
    : 0;
  const partySize = (guest) => 1 + (Number(guest.companions) || 0);
  const invitedPeople = guests.reduce((sum, guest) => sum + partySize(guest), 0);
  const confirmedPeople = guests
    .filter(g => g.status === 'confirmed')
    .reduce((sum, guest) => sum + partySize(guest), 0);
  const menuItemById = new Map(menuItems.map(item => [item.id, item]));
  const preferenceLabels = (guest) => (guest.menu_preferences || [])
    .map(id => menuItemById.get(id))
    .filter(Boolean)
    .map(item => `${item.emoji || '•'} ${item.name}`);

  return (
    <div>
      <PageHeader title="Invités" subtitle={`${invitedPeople} personnes · ${guests.length} fiches · ${confirmedPeople} confirmées`}>
        <WeddingSelector weddings={weddings} activeWeddingId={activeWeddingId} onSelect={setActiveWeddingId} />
        <Button
          variant="outline"
          disabled={!activeWedding || whatsappRecipientCount === 0}
          onClick={() => setShowBulkWhatsapp(true)}
        >
          <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp tous
        </Button>
        <Button onClick={() => {
          setEditingGuest(null);
          setShowForm(true);
        }}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher un invité..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="invited">Invité</SelectItem>
            <SelectItem value="confirmed">Confirmé</SelectItem>
            <SelectItem value="declined">Décliné</SelectItem>
            <SelectItem value="absent">Absent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Guest Table */}
      {filteredGuests.length === 0 ? (
        <EmptyState icon={Users} title="Aucun invité" description="Ajoutez votre premier invité pour commencer" actionLabel="Ajouter un invité" onAction={() => setShowForm(true)} />
      ) : (
        <Card className="hidden overflow-hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Nom</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Rôle</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Statut</th>
                  <th className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Accompagnants</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Préférences boissons</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Tél.</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map(guest => (
                  <GuestRow
                    key={guest.id}
                    guest={guest}
                    preferences={preferenceLabels(guest)}
                    onEdit={handleEdit}
                    onDelete={(g) => deleteMutation.mutate(g.id)}
                    onStatusChange={handleStatusChange}
                    onInvite={(g) => setInviteGuest(g)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filteredGuests.length > 0 && (
        <div className="grid gap-3 md:hidden">
          {filteredGuests.map(guest => (
            <Card key={guest.id} className="overflow-hidden border-border/70 bg-card">
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{guest.first_name} {guest.last_name}</p>
                    <StatusBadge status={guest.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{guest.phone || guest.email || 'Contact non renseigné'}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md bg-muted px-3 py-2">
                      <span className="block text-muted-foreground">Rôle</span>
                      <span className="font-medium capitalize">{guest.role || 'guest'}</span>
                    </div>
                    <div className="rounded-md bg-muted px-3 py-2">
                      <span className="block text-muted-foreground">Accomp.</span>
                      <span className="font-medium">{guest.companions || 0}</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-md bg-muted px-3 py-2 text-xs">
                    <span className="mb-1 flex items-center gap-1 text-muted-foreground">
                      <GlassWater className="h-3.5 w-3.5" /> Préférences boissons
                    </span>
                    {preferenceLabels(guest).length > 0 ? (
                      <span className="font-medium">{preferenceLabels(guest).join(', ')}</span>
                    ) : (
                      <span className="text-muted-foreground">Non renseigné</span>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 shrink-0">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setInviteGuest(guest)}>
                      <QrCode className="mr-2 h-4 w-4" /> Invitation / QR
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(guest)}>
                      <Pencil className="mr-2 h-4 w-4" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(guest, 'confirmed')}>
                      Marquer confirmé
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusChange(guest, 'declined')}>
                      Marquer décliné
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteMutation.mutate(guest.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="grid grid-cols-2 border-t bg-muted/30">
                <Button variant="ghost" className="h-12 rounded-none" onClick={() => setInviteGuest(guest)}>
                  <QrCode className="h-4 w-4" /> Inviter
                </Button>
                <Button variant="ghost" className="h-12 rounded-none" onClick={() => handleEdit(guest)}>
                  <Pencil className="h-4 w-4" /> Modifier
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <GuestFormDialog open={showForm} onOpenChange={setShowForm} guest={editingGuest} onSave={handleSave} />
      <GuestInviteModal
        open={!!inviteGuest}
        onOpenChange={() => setInviteGuest(null)}
        guest={inviteGuest}
        wedding={activeWedding}
      />
      <BulkWhatsappInviteDialog
        open={showBulkWhatsapp}
        onOpenChange={setShowBulkWhatsapp}
        guests={guests}
        wedding={activeWedding}
      />
    </div>
  );
}
