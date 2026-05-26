import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Heart } from 'lucide-react';

export default function WeddingSelector({ weddings, activeWeddingId, onSelect }) {
  if (!weddings?.length) return null;

  return (
    <Select value={activeWeddingId || ''} onValueChange={onSelect}>
      <SelectTrigger className="w-[220px] bg-card">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-primary" fill="currentColor" />
          <SelectValue placeholder="Sélectionner un mariage" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {weddings.map(w => (
          <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}