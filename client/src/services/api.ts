import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token and active event/college headers to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('debugarena_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeEventId = localStorage.getItem('debugarena_active_event_id');
  if (activeEventId) {
    config.headers['x-event-id'] = activeEventId;
  }
  const activeCollegeId = localStorage.getItem('debugarena_active_college_id');
  if (activeCollegeId) {
    config.headers['x-college-id'] = activeCollegeId;
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
  operationId?: string;
  seqId?: number;
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

// -------------------- MULTI-COLLEGE & DYNAMIC EVENT APIS --------------------

export async function getColleges() {
  const res = await api.get('/admin/events/colleges');
  return res.data.colleges;
}

export async function createCollege(data: {
  name: string;
  code: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactEmail?: string;
  website?: string;
}) {
  const res = await api.post('/admin/events/colleges', data);
  return res.data.college;
}

export async function getEvents(collegeId?: string) {
  const res = await api.get('/admin/events', { params: { collegeId } });
  return res.data.events;
}

export async function createEvent(data: any) {
  const res = await api.post('/admin/events', data);
  return res.data;
}

export async function getEventDetails(eventId: string) {
  const res = await api.get(`/admin/events/${eventId}`);
  return res.data;
}

export async function updateEvent(eventId: string, data: any) {
  const res = await api.put(`/admin/events/${eventId}`, data);
  return res.data.event;
}

export async function freezeEvent(eventId: string) {
  const res = await api.post(`/admin/events/${eventId}/freeze`);
  return res.data;
}

export async function unfreezeEvent(eventId: string, reason: string) {
  const res = await api.post(`/admin/events/${eventId}/unfreeze`, { reason });
  return res.data;
}

export async function createDynamicRound(eventId: string, roundData: any) {
  const res = await api.post(`/admin/events/${eventId}/rounds`, roundData);
  return res.data.round;
}

export async function updateDynamicRound(eventId: string, roundNumber: number, roundData: any) {
  const res = await api.put(`/admin/events/${eventId}/rounds/${roundNumber}`, roundData);
  return res.data.round;
}

export async function startDynamicRound(eventId: string, roundNumber: number) {
  const res = await api.post(`/admin/events/${eventId}/rounds/${roundNumber}/start`);
  return res.data;
}

export async function getEventAuditLogs(eventId: string) {
  const res = await api.get(`/admin/events/${eventId}/audit-logs`);
  return res.data.logs;
}
