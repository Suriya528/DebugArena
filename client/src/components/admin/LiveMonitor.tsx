import React, { useState, useEffect } from 'react';
import { Activity, Users, ShieldAlert, CheckCircle2, Play, Send, Zap } from 'lucide-react';
import { useRealtime } from '../../context/SocketContext.js';

interface LiveEvent {
  id: string;
  type: 'submit' | 'run' | 'violation' | 'connect' | 'disconnect' | 'round';
  message: string;
  time: string;
  badge?: string;
  statusColor?: string;
}

export const LiveMonitor: React.FC = () => {
  const { socket } = useRealtime();
  const [onlineParticipants, setOnlineParticipants] = useState<any[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);

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
    });

    socket.on('admin:violation_logged', (data: any) => {
      addEvent({
        type: 'violation',
        message: `🚨 SECURITY STRIKE: @${data.username} triggered ${data.type} (Strike ${data.violationCount})`,
        badge: `Strike ${data.violationCount}`,
        statusColor: 'text-rose-400'
      });
    });

    socket.on('admin:participant_submitted', (data: any) => {
      addEvent({
        type: 'round',
        message: `🏁 Participant finalized Round ${data.roundNumber}! Total Score: ${data.totalScore} pts (${Math.floor(data.timeTakenSeconds / 60)}m ${data.timeTakenSeconds % 60}s)`,
        badge: `${data.totalScore} pts`,
        statusColor: 'text-amber-400'
      });
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

  const addEvent = (event: Omit<LiveEvent, 'id' | 'time'>) => {
    const newEntry: LiveEvent = {
      ...event,
      id: Math.random().toString(),
      time: new Date().toLocaleTimeString()
    };
    setEvents(prev => [newEntry, ...prev.slice(0, 99)]);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Top Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Live Connected Participants
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {onlineParticipants.length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Events In Current Session
            </div>
            <div className="text-3xl font-extrabold text-white mt-1">
              {events.length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-indigo-400" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Active Violations Flagged
            </div>
            <div className="text-3xl font-extrabold text-rose-400 mt-1">
              {events.filter(e => e.type === 'violation').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Online Participants */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-emerald-400" />
            Online Competitors ({onlineParticipants.length})
          </h2>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {onlineParticipants.length === 0 ? (
              <div className="text-xs text-slate-500 py-10 text-center">
                No participants currently connected.
              </div>
            ) : (
              onlineParticipants.map((p, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <div className="text-xs font-bold text-white">
                      {p.user?.name || 'Participant'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      @{p.user?.username}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Active</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Real-Time Stream */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-400" />
            Live Assessment Event Feed
          </h2>

          <div className="flex-1 space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {events.length === 0 ? (
              <div className="text-xs text-slate-500 py-14 text-center">
                Waiting for participant activity... Run/Submit events will stream here live.
              </div>
            ) : (
              events.map(ev => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3 text-xs font-mono"
                >
                  <div className="flex items-start gap-2.5">
                    {ev.type === 'submit' && <Send className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {ev.type === 'run' && <Play className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
                    {ev.type === 'violation' && (
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                    )}
                    {ev.type === 'round' && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {(ev.type === 'connect' || ev.type === 'disconnect') && (
                      <Users className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}

                    <div>
                      <span className={ev.statusColor || 'text-slate-200'}>{ev.message}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ev.badge && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                        {ev.badge}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">{ev.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
