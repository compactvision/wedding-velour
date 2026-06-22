import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useActiveWedding } from '@/hooks/useWedding';
import PageHeader from '@/components/shared/PageHeader';
import WeddingSelector from '@/components/shared/WeddingSelector';
import EmptyState from '@/components/shared/EmptyState';
import FloorPlanEditor from '@/components/tables/FloorPlanEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus, TableProperties, Users, Trash2, Pencil,
  UserPlus, QrCode, LayoutDashboard, List,
} from 'lucide-react';
import TableQRModal from '@/components/tables/TableQRModal';
import { cn } from '@/lib/utils';

// ─── TABLE FORM ─────────────────────────────────────────────────────────────
function TableFormDialog({ open, onOpenChange, table, onSave }) {
  const [form, setForm] = useState({
    name: '', capacity: 8, shape: 'round', category: 'other',
  });

  React.useEffect(() => {
    if (table) {
      setForm({
        name: table.name || '',
        capacity: table.capacity || 8,
        shape: table.shape || 'round',
        category: table.category || 'other',
      });
    } else {
      setForm({ name: '', capacity: 8, shape: 'round', category: 'other' });
    }
  }, [table, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            {table ? 'Modifier la table' : 'Nouvelle table'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nom</Label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Table des mariés"
            />
          </div>
          <div>
            <Label>Capacité</Label>
            <Input
              type="number" min={1}
              value={form.capacity}
              onChange={e => setForm({ ...form, capacity: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Forme</Label>
            <Select value={form.shape} onValueChange={v => setForm({ ...form, shape: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="round">Ronde</SelectItem>
                <SelectItem value="rectangular">Rectangulaire</SelectItem>
                <SelectItem value="oval">Ovale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Catégorie</Label>
            <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vip">VIP</SelectItem>
                <SelectItem value="family">Famille</SelectItem>
                <SelectItem value="friends">Amis</SelectItem>
                <SelectItem value="colleagues">Collègues</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ASSIGN GUEST ─────────────────────────────────────────────────────────
function AssignGuestDialog({ open, onOpenChange, table, guests, onAssign }) {
  const [selectedGuest, setSelectedGuest] = useState('');
  const unassigned = guests.filter(g => !g.table_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">
            Assigner un invité à {table?.name}
          </DialogTitle>
        </DialogHeader>
        <Select value={selectedGuest} onValueChange={setSelectedGuest}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un invité" /></SelectTrigger>
          <SelectContent>
            {unassigned.map(g => (
              <SelectItem key={g.id} value={g.id}>
                {g.first_name} {g.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => {
              onAssign(selectedGuest, table?.id);
              setSelectedGuest('');
              onOpenChange(false);
            }}
            disabled={!selectedGuest}
          >
            Assigner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CATEGORY COLOURS ──────────────────────────────────────────────────────
const categoryColors = {
  vip: 'border-amber-300 bg-amber-50',
  family: 'border-rose-300 bg-rose-50',
  friends: 'border-blue-300 bg-blue-50',
  colleagues: 'border-green-300 bg-green-50',
  other: 'border-border bg-card',
};

// ─── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function Tables() {
  const { weddings, activeWeddingId, setActiveWeddingId } = useActiveWedding();
  const queryClient = useQueryClient();

  const [view, setView] = useState<'list' | 'plan'>('list');
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const [assignTable, setAssignTable] = useState<any>(null);
  const [qrTable, setQrTable] = useState<any>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: tables = [] } = useQuery({
    queryKey: ['tables', activeWeddingId],
    queryFn: () => base44.entities.WeddingTable.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', activeWeddingId],
    queryFn: () => base44.entities.Guest.filter({ wedding_id: activeWeddingId }),
    enabled: !!activeWeddingId,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      base44.entities.WeddingTable.create({ ...data, wedding_id: activeWeddingId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', activeWeddingId] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => base44.entities.WeddingTable.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables', activeWeddingId] });
      setShowForm(false);
      setEditingTable(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => base44.entities.WeddingTable.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables', activeWeddingId] }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ guestId, tableId }: any) =>
      base44.entities.Guest.update(guestId, { table_id: tableId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guests', activeWeddingId] }),
  });

  const unassignMutation = useMutation({
    mutationFn: (guestId: string) =>
      base44.entities.Guest.update(guestId, { table_id: '' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['guests', activeWeddingId] }),
  });

  // ── Form save ─────────────────────────────────────────────────────────────
  const handleSave = (formData: any) => {
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // ── Floor plan: save all positions at once ────────────────────────────
  const handleSaveAllPositions = useCallback(
    async (positions: Record<string, { x: number; y: number }>) => {
      await Promise.all(
        Object.entries(positions).map(([id, { x, y }]) =>
          base44.entities.WeddingTable.update(id, { position_x: x, position_y: y })
        )
      );
      queryClient.invalidateQueries({ queryKey: ['tables', activeWeddingId] });
    },
    [activeWeddingId, queryClient]
  );

  // ── Room polygon – stored in localStorage ─────────────────────────────
  const polygonKey = `room_polygon_${activeWeddingId}`;
  const [roomPolygon, setRoomPolygon] = React.useState<{ x: number; y: number }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(polygonKey) || '[]');
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      setRoomPolygon(JSON.parse(localStorage.getItem(polygonKey) || '[]'));
    } catch {
      setRoomPolygon([]);
    }
  }, [activeWeddingId]);

  const handleSaveRoom = (polygon: { x: number; y: number }[]) => {
    localStorage.setItem(polygonKey, JSON.stringify(polygon));
    setRoomPolygon(polygon);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getTableGuests = (tableId: string) => guests.filter((g: any) => g.table_id === tableId);

  // Enrich tables for floor plan
  const enrichedTables = tables.map((t: any) => ({
    ...t,
    seated: getTableGuests(t.id).length,
  }));

  const totalSeated = guests.filter((g: any) => g.table_id).length;

  return (
    <div>
      <PageHeader
        title="Plan de salle"
        subtitle={`${tables.length} tables · ${totalSeated}/${guests.length} invités placés`}
      >
        <WeddingSelector
          weddings={weddings}
          activeWeddingId={activeWeddingId}
          onSelect={setActiveWeddingId}
        />
        <Button
          onClick={() => { setEditingTable(null); setShowForm(true); }}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" /> Ajouter une table
        </Button>
      </PageHeader>

      {/* View toggle */}
      {tables.length > 0 && (
        <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs value={view} onValueChange={(v: any) => setView(v)}>
            <TabsList className="min-w-max">
              <TabsTrigger value="list" className="gap-2">
                <List className="w-4 h-4" /> Liste
              </TabsTrigger>
              <TabsTrigger value="plan" className="gap-2">
                <LayoutDashboard className="w-4 h-4" /> Plan interactif
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* ── LIST VIEW ─────────────────────────────────────────────────────── */}
      {(view === 'list' || tables.length === 0) && (
        <>
          {tables.length === 0 ? (
            <EmptyState
              icon={TableProperties}
              title="Aucune table"
              description="Créez vos tables pour commencer à placer les invités"
              actionLabel="Créer une table"
              onAction={() => setShowForm(true)}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tables.map((table: any) => {
                const seated = getTableGuests(table.id);
                const isFull = seated.length >= (table.capacity || 8);
                return (
                  <Card
                    key={table.id}
                    className={cn(
                      'p-5 border-2 transition-all hover:shadow-md',
                      categoryColors[table.category as keyof typeof categoryColors] || categoryColors.other
                    )}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-display font-semibold text-lg">{table.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {table.shape} · {table.category}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-primary"
                          onClick={() => setQrTable(table)} title="QR Code menu"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setEditingTable(table); setShowForm(true); }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => deleteMutation.mutate(table.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className={cn('text-sm font-medium', isFull ? 'text-accent' : 'text-foreground')}>
                        {seated.length}/{table.capacity || 8}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', isFull ? 'bg-accent' : 'bg-primary')}
                          style={{ width: `${Math.min(100, (seated.length / (table.capacity || 8)) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {seated.map((g: any) => (
                        <div
                          key={g.id}
                          className="flex items-center justify-between text-sm bg-background/60 rounded-md px-2 py-1"
                        >
                          <span>{g.first_name} {g.last_name}</span>
                          <button
                            onClick={() => unassignMutation.mutate(g.id)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    {!isFull && (
                      <Button
                        variant="outline" size="sm" className="w-full"
                        onClick={() => setAssignTable(table)}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1" /> Assigner un invité
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── FLOOR PLAN VIEW ────────────────────────────────────────────────── */}
      {view === 'plan' && tables.length > 0 && (
        <FloorPlanEditor
          tables={enrichedTables}
          onUpdatePosition={(id, x, y) =>
            base44.entities.WeddingTable.update(id, { position_x: x, position_y: y })
          }
          onSaveAll={handleSaveAllPositions}
          roomPolygon={roomPolygon}
          onSaveRoom={handleSaveRoom}
        />
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <TableFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        table={editingTable}
        onSave={handleSave}
      />
      <AssignGuestDialog
        open={!!assignTable}
        onOpenChange={() => setAssignTable(null)}
        table={assignTable}
        guests={guests}
        onAssign={(guestId: string, tableId: string) =>
          assignMutation.mutate({ guestId, tableId })
        }
      />
      <TableQRModal
        open={!!qrTable}
        onOpenChange={() => setQrTable(null)}
        table={qrTable}
      />
    </div>
  );
}
