import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';

const roles = {
  admin: 'Administrateur',
  manager: 'Manager',
  server: 'Serveur',
  door: 'Agent à la porte',
};

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'server',
  wedding_id: '',
  is_active: true,
};

export default function Agents() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [formError, setFormError] = useState('');

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => (await axios.get('/api/agents')).data,
  });
  const { data: weddings = [] } = useQuery({
    queryKey: ['weddings'],
    queryFn: () => base44.entities.Wedding.list(),
  });

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      name: editing.name,
      email: editing.email,
      password: '',
      role: editing.role,
      wedding_id: editing.wedding_id || '',
      is_active: editing.is_active,
    } : emptyForm);
    setFormError('');
  }, [editing, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, wedding_id: form.wedding_id || null };
      if (editing) return axios.put(`/api/agents/${editing.id}`, payload);
      return axios.post('/api/agents', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setOpen(false);
      setEditing(null);
    },
    onError: (error: any) => {
      const errors = error.response?.data?.errors;
      setFormError(errors ? Object.values(errors).flat().join(' ') : 'Impossible d’enregistrer cet agent.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`/api/agents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  return (
    <div>
      <PageHeader title="Équipe & accès" subtitle="Créez les comptes et limitez chaque agent à sa mission.">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel agent
        </Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent: any) => (
          <Card key={agent.id} className={!agent.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                  </div>
                </div>
                <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                  {agent.is_active ? 'Actif' : 'Désactivé'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm">
                <span>Rôle</span>
                <strong>{roles[agent.role] || agent.role}</strong>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setEditing(agent); setOpen(true); }}>
                  <UserCog className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => window.confirm(`Supprimer le compte de ${agent.name} ?`) && deleteMutation.mutate(agent.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Modifier l’agent' : 'Créer un agent'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom complet</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div>
              <Label>{editing ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe'}</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={role => setForm({ ...form, role })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(roles).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mariage attribué</Label>
              <Select value={form.wedding_id || 'all'} onValueChange={wedding_id => setForm({ ...form, wedding_id: wedding_id === 'all' ? '' : wedding_id })}>
                <SelectTrigger><SelectValue placeholder="Tous les mariages" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mariages</SelectItem>
                  {weddings.map((wedding: any) => <SelectItem key={wedding.id} value={wedding.id}>{wedding.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div><Label>Compte actif</Label><p className="text-xs text-muted-foreground">Un compte désactivé ne peut plus se connecter.</p></div>
              <Switch checked={form.is_active} onCheckedChange={is_active => setForm({ ...form, is_active })} />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name || !form.email || (!editing && form.password.length < 8) || saveMutation.isPending}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
