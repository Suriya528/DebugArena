import React, { useState, useEffect } from 'react';
import {
  Activity,
  Users,
  ShieldAlert,
  CheckCircle2,
  Server,
  Stethoscope,
  RefreshCw
} from 'lucide-react';
import { useRealtime } from '../../context/SocketContext.js';
import { api } from '../../services/api.js';
import { PreEventCheckModal } from './PreEventCheckModal.js';

interface LiveEvent {
  id: string;
  type: 'submit' | 'run' | 'violation' | 'connect' | 'disconnect' | 'round';
  message: string;
  time: string;
  badge?: string;
  statusColor?: string;
}

interface LiveMonitorProps {
  eventId?: string;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ eventId }) => {
  const { socket } = useRealtime();
  const [onlineParticipants, setOnlineParticipants] = useState<any[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [pulse, setPulse] = useState<any>(null);
  const [selectedRound] = useState<number>(1);
  const [isPreCheckOpen, setIsPreCheckOpen] = useState<boolean>(false);

  const fetchPulse = async () => {
    try {
      const pulseRes = await api.get('/admin/control-room/pulse', {
        params: { eventId, roundNumber: selectedRound }
      });
      setPulse(pulseRes.data);
    } catch (err) {
      console.error('Failed to fetch control room pulse:', err);
    }
  };

  useEffect(() => {
    fetchPulse();
    const interval = setInterval(fetchPulse, 5000);
    return () => clearInterval(interval);
  }, [eventId, selectedRound]);

  useEffect(() => {
    if (!socket) return;

    // Online users list initial
    socket.on('admin:online_users', (users: any[]) => {
      setOnlineParticipants(users);
    });

    socket.on('admin:user_connected', (user: any) => {
      setOnlineParticipants(prev => {
        if (prev.some(u => u.user?.userId === user.userId)) return prev;
        return [...prev, { user, lastActive: new Date() }];
      });
      addEvent({
        type: 'connect',
        message: `${user.name} (@${user.username}) connected to portal.`,
        statusColor: 'text-emerald-400'
      });
    });

    socket.on('admin:user_disconnected', (user: any) => {
      setOnlineParticipants(prev => prev.filter(u => u.user?.userId !== user.userId));
      addEvent({
        type: 'disconnect',
        message: `${user.username} disconnected.`,
        statusColor: 'text-slate-400'
      });
    });

    socket.on('admin:run_code', (data: any) => {
      addEvent({
        type: 'run',
        message: `@${data.username} executed code (${data.language}): ${data.resultsSummary}`,
        badge: data.language.toUpperCase(),
        statusColor: 'text-cyan-400'
      });
    });

    socket.on('admin:submit_code', (data: any) => {
      addEvent({
        type: 'submit',
        message: `@${data.username} submitted code. Score: ${data.score} pts (${data.passedCount}/${data.totalCount} tests passed)`,
        badge: `+${data.score} pts`,
        statusColor: 'text-emerald-400'
      });
      fetchPulse();
    });

    socket.on('admin:violation_logged', (data: any) => {
      addEvent({
        type: 'violation',
        message: `🚨 SECURITY STRIKE: @${data.username} triggered ${data.type} (Strike ${data.violationCount})`,
        badge: `Strike ${data.violationCount}`,
        statusColor: 'text-rose-400'
      });
      fetchPulse();
    });

    socket.on('admin:participant_submitted', (data: any) => {
      addEvent({
        type: 'round',
        message: `🏁 Participant finalized Round ${data.roundNumber}! Total Score: ${data.totalScore} pts (${Math.floor(data.timeTakenSeconds / 60)}m ${data.timeTakenSeconds % 60}s)`,
        badge: `${data.totalScore} pts`,
        statusColor: 'text-amber-400'
      });
      fetchPulse();
    });

    return () => {
      socket.off('admin:online_users');
      socket.off('admin:user_connected');
      socket.off('admin:user_disconnected');
      socket.off('admin:run_code');
      socket.off('admin:submit_code');
      socket.off('admin:violation_logged');
      socket.off('admin:participant_submitted');
    };
  }, [socket]);

  const addEvent = (eventData: Omit<LiveEvent, 'id' | 'time'>) => {
    const newEvent: LiveEvent = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString(),
      ...eventData
    };
    setEvents(prev => [newEvent, ...prev.slice(0, 99)]);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 text-left">
      {/* 1. Top Control Room Master Status Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-600/30 shrink-0">
            <Activity className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Live Control Room
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Telemetry & Live Competition Control Room
            </h1>
            <p className="text-xs text-slate-400">
              Real-time participant pulse, active submission stream, and proctoring telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Pre-Event Readiness Inspector Button */}
          <button
            onClick={() => setIsPreCheckOpen(true)}
            className="flex-1 sm:flex-none py-2.5 px-3 sm:px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer whitespace-nowrap"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Pre-Event Health Check</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchPulse}
            className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer shrink-0"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. System Pulse Hardware & Participation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Active Taking Test</div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">{pulse?.counts?.activeParticipants ?? onlineParticipants.length}</div>
            <div className="text-[10px] text-slate-500 font-mono truncate">Of {pulse?.counts?.totalParticipants ?? onlineParticipants.length} registered</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Finalized / Submitted</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">{pulse?.counts?.submittedParticipants ?? 0}</div>
            <div className="text-[10px] text-slate-500 font-mono truncate">Submissions locked</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold shrink-0">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Suspicious Strikes</div>
            <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">{pulse?.counts?.suspiciousEvents ?? 0}</div>
            <div className="text-[10px] text-slate-500 font-mono truncate">Proctoring alerts</div>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 border border-slate-800 flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold shrink-0">
            <Server className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">Judge & DB Pulse</div>
            <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">{pulse?.system?.dbLatencyMs ?? 4}ms</div>
            <div className="text-[10px] text-slate-500 font-mono truncate">Sandbox: {pulse?.system?.judgeStatus ?? 'ready'}</div>
          </div>
        </div>
      </div>

      {/* 3. Real-Time Telemetry Event Stream & Online Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Event Stream */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" /> Live Audit & Submission Telemetry
            </h3>
            <span className="text-[11px] font-mono text-slate-500">{events.length} events recorded</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Awaiting real-time candidate socket events...
              </div>
            ) : (
              events.map(ev => (
                <div
                  key={ev.id}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-slate-500">{ev.time}</span>
                    <span className={ev.statusColor || 'text-slate-300'}>{ev.message}</span>
                  </div>
                  {ev.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300">
                      {ev.badge}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Online Candidates Grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Connected Candidates
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">{onlineParticipants.length} online</span>
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {onlineParticipants.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No participants currently connected to portal.
              </div>
            ) : (
              onlineParticipants.map((entry, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <div className="font-bold text-white">{entry.user?.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">@{entry.user?.username}</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-lg">
                    R{entry.currentRound || 1}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pre-Event System Health Modal */}
      <PreEventCheckModal isOpen={isPreCheckOpen} onClose={() => setIsPreCheckOpen(false)} />
    </div>
  );
};
