import { useEffect, useRef, useState } from 'react';

function playOrderChime() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const now = context.currentTime;
  const notes = [659.25, 783.99, 987.77];

  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + index * 0.13;
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.3);
  });

  window.setTimeout(() => context.close(), 1000);
}

export function useOrderNotificationSound(orders: any[]) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('orderSoundEnabled') === 'true');
  const knownPendingIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentPendingIds = new Set(
      orders.filter(order => order.status === 'pending').map(order => order.id)
    );

    if (knownPendingIds.current === null) {
      knownPendingIds.current = currentPendingIds;
      return;
    }

    const hasNewOrder = [...currentPendingIds].some(id => !knownPendingIds.current?.has(id));
    if (enabled && hasNewOrder) {
      playOrderChime();
    }

    knownPendingIds.current = currentPendingIds;
  }, [enabled, orders]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem('orderSoundEnabled', String(next));
    if (next) playOrderChime();
  };

  return { soundEnabled: enabled, toggleSound: toggle };
}
