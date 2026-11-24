import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg pointer-events-none whitespace-nowrap"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Offline Mode · Ready to Play</span>
    </div>
  );
};
