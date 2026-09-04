import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token from localStorage to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('debugarena_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Offline Queue Management
const QUEUE_KEY = 'debugarena_offline_queue';

export interface OfflineUpdate {
  questionId: string;
  roundNumber: number;
  selectedOption?: number | null;
  code?: string;
  language?: string;
  timestamp: number;
}

export function queueOfflineUpdate(update: OfflineUpdate) {
  try {
    const existing: OfflineUpdate[] = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    // Filter out previous pending updates for same question
    const filtered = existing.filter(item => item.questionId !== update.questionId);
    filtered.push(update);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent('debugarena_queue_change', { detail: { count: filtered.length } }));
  } catch (e) {
    console.error('Failed to write to offline queue:', e);
  }
}

export function getOfflineQueue(): OfflineUpdate[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
  window.dispatchEvent(new CustomEvent('debugarena_queue_change', { detail: { count: 0 } }));
}

export async function flushOfflineQueue(): Promise<number> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  try {
    const res = await api.post('/participant/sync-batch', { updates: queue });
    if (res.data.success) {
      clearOfflineQueue();
      return queue.length;
    }
  } catch (err) {
    console.warn('Could not flush offline queue yet, will retry on reconnect.');
  }
  return 0;
}

// Automatically flush queue when network comes back online
window.addEventListener('online', () => {
  console.log('🌐 Network online detected. Syncing offline changes...');
  flushOfflineQueue();
});
