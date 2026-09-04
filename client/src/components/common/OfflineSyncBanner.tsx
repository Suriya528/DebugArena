import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle, Database } from 'lucide-react';
import { getOfflineQueue, flushOfflineQueue } from '../../services/api.js';

export const OfflineSyncBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queueCount, setQueueCount] = useState<number>(() => getOfflineQueue().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      flushOfflineQueue().then((flushed) => {
        setIsSyncing(false);
        setQueueCount(getOfflineQueue().length);
        if (flushed > 0) {
          setSyncSuccessMessage(`Synced ${flushed} offline action(s) successfully!`);
          setTimeout(() => setSyncSuccessMessage(null), 4000);
        }
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChange = (e: any) => {
      setQueueCount(e.detail?.count || 0);
      if (e.detail?.status === 'syncing') {
        setIsSyncing(true);
      } else if (e.detail?.status === 'flushed') {
        setIsSyncing(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('debugarena_queue_change', handleQueueChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('debugarena_queue_change', handleQueueChange);
    };
  }, []);

  const handleManualSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    const flushed = await flushOfflineQueue();
    setIsSyncing(false);
    setQueueCount(getOfflineQueue().length);
    if (flushed > 0) {
      setSyncSuccessMessage(`Synced ${flushed} queued action(s) successfully!`);
      setTimeout(() => setSyncSuccessMessage(null), 4000);
    }
  };

  // If online, no queued items, and no temporary message, hide banner
  if (isOnline && queueCount === 0 && !syncSuccessMessage && !isSyncing) {
    return null;
  }

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-full shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-2 border"
      style={{
        backgroundColor: !isOnline
          ? 'rgba(127, 29, 29, 0.9)'
          : syncSuccessMessage
          ? 'rgba(6, 78, 59, 0.9)'
          : 'rgba(30, 41, 59, 0.9)',
        borderColor: !isOnline
          ? 'rgba(239, 68, 68, 0.4)'
          : syncSuccessMessage
          ? 'rgba(16, 185, 129, 0.4)'
          : 'rgba(99, 102, 241, 0.4)'
      }}
    >
      {!isOnline ? (
        <>
          <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-xs font-semibold text-red-100">
            Network Offline &bull; {queueCount} action{queueCount === 1 ? '' : 's'} queued in local storage (Do not close tab)
          </span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
          <span className="text-xs font-semibold text-indigo-100">
            Syncing {queueCount} queued action{queueCount === 1 ? '' : 's'} to server...
          </span>
        </>
      ) : syncSuccessMessage ? (
        <>
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-100">{syncSuccessMessage}</span>
        </>
      ) : queueCount > 0 ? (
        <>
          <Database className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium text-amber-100">
            {queueCount} pending change{queueCount === 1 ? '' : 's'} stored locally
          </span>
          <button
            onClick={handleManualSync}
            className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 transition-colors"
          >
            Sync Now
          </button>
        </>
      ) : null}
    </div>
  );
};
