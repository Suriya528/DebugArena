import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useRealtime } from '../../context/SocketContext.js';
import { getOfflineQueue } from '../../services/api.js';

export const ConnectionBadge: React.FC = () => {
  const { isConnected } = useRealtime();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState<number>(getOfflineQueue().length);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueChange = (e: any) => setOfflineCount(e.detail?.count || 0);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('debugarena_queue_change', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('debugarena_queue_change', handleQueueChange);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
        <WifiOff className="w-3.5 h-3.5 animate-pulse" />
        <span>Offline {offlineCount > 0 && `(${offlineCount} pending)`}</span>
      </div>
    );
  }

  if (offlineCount > 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing {offlineCount} answers</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Gateway Reconnecting</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <span className="w-2 h-2 rounded-full bg-emerald-400" />
      <Wifi className="w-3 h-3 text-emerald-400" />
      <span className="hidden sm:inline">Live Connected</span>
    </div>
  );
};
