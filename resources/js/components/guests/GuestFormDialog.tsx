import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const roles = [
  { value: 'guest', label: 'Invité' },
  { value: 'bride', label: 'Mariée' },
  { value: 'groom', label: 'Marié' },
  { value: 'best_man', label: 'Témoin (H)' },
  { value: 'maid_of_honor', label: 'Témoin (F)' },
  { value: 'family', label: 'Famille' },
  { value: 'vip', label: 'VIP' },
];

export default function GuestFormDialog({ open, onOpenChange, guest, onSave }) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    role: 'guest', companions: 0, dietary_restrictions: ''
  });

  useEffect(() => {
    if (guest) {
      setForm({
        first_name: guest.first_name || '',
        last_name: guest.last_name || '',
        email: guest.email || '',
        phone: guest.phone || '',
        role: guest.role || 'guest',
        companions: guest.companions || 0,
        dietary_restrictions: guest.dietary_restrictions || '',
      });
    } else {
      setForm({ first_name: '', last_name: '', email: '', phone: '', role: 'guest', companions: 0, dietary_restrictions: '' });
    }
  }, [guest, open]);

  const handleSave = () => {
    onSave({ ...form, companions: Number(form.companions) || 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{guest ? 'Modifier l\'invité' : 'Ajouter un invité'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Prénom</Label>
            <Input value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} />
          </div>
          <div>
            <Label>Nom</Label>
            <Input value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
          <div>
            <Label>Rôle</Label>
            <Select value={form.role} onValueChange={v => setForm({...form, role: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Accompagnants</Label>
            <Input type="number" min={0} value={form.companions} onChange={e => setForm({...form, companions: e.target.value})} />
          </div>
          <div className="col-span-2">
            <Label>Restrictions alimentaires</Label>
            <Textarea value={form.dietary_restrictions} onChange={e => setForm({...form, dietary_restrictions: e.target.value})} placeholder="Allergies, végétarien..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={!form.first_name || !form.last_name}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}