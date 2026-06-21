import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Plus, Search, Users } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveWedding } from '@/hooks/useWedding';
import { buildWhatsappInvitationLink } from '@/lib/guestInvitations';

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

  return (
    <div>
      <PageHeader title="Invités" subtitle={`${guests.length} invités · ${guests.filter(g => g.status === 'confirmed').length} confirmés`}>
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
          <SelectTrigger className="w-[160px]">
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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Nom</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Rôle</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Statut</th>
                  <th className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">+1</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4">Tél.</th>
                  <th className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground py-3 px-4 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map(guest => (
                  <GuestRow
                    key={guest.id}
                    guest={guest}
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
