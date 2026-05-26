import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';

export function useWeddings() {
  return useQuery({
    queryKey: ['weddings'],
    queryFn: () => base44.entities.Wedding.list('-created_date'),
    initialData: [],
  });
}

export function useActiveWedding() {
  const [activeWeddingId, setActiveWeddingId] = useState(() => {
    return localStorage.getItem('activeWeddingId') || null;
  });

  const { data: weddings, isLoading } = useWeddings();

  useEffect(() => {
    if (!activeWeddingId && weddings?.length > 0) {
      setActiveWeddingId(weddings[0].id);
    }
  }, [weddings, activeWeddingId]);

  useEffect(() => {
    if (activeWeddingId) {
      localStorage.setItem('activeWeddingId', activeWeddingId);
    }
  }, [activeWeddingId]);

  const activeWedding = weddings?.find(w => w.id === activeWeddingId) || weddings?.[0] || null;

  return {
    weddings,
    activeWedding,
    activeWeddingId: activeWedding?.id,
    setActiveWeddingId,
    isLoading,
  };
}