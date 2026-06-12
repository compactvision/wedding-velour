import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';

export function useWeddings() {
  return useQuery({
    queryKey: ['weddings'],
    queryFn: () => base44.entities.Wedding.list(),
    initialData: [],
  });
}

export function useActiveWedding() {
  const userWeddingId = (usePage().props as any).auth?.user?.wedding_id || null;
  const [activeWeddingId, setActiveWeddingId] = useState(() => {
    return userWeddingId || localStorage.getItem('activeWeddingId') || null;
  });

  const { data: weddings, isLoading } = useWeddings();

  useEffect(() => {
    if (userWeddingId && activeWeddingId !== userWeddingId) {
      setActiveWeddingId(userWeddingId);
    }
  }, [userWeddingId, activeWeddingId]);

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
    setActiveWeddingId: userWeddingId ? () => {} : setActiveWeddingId,
    isLoading,
  };
}
