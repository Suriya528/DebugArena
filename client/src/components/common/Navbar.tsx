import React from 'react';
import { Terminal, LogOut, Shield, User as UserIcon, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { ConnectionBadge } from './ConnectionBadge.js';

interface NavbarProps {
  roundTitle?: string;
  roundNumber?: number;
  timerFormatted?: string;
  isTimerUrgent?: boolean;
  proctoringMode?: boolean;
  violationCount?: number;
  violationLimit?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  roundTitle,
  roundNumber,
  timerFormatted,
  isTimerUrgent,
  proctoringMode,
  violationCount = 0,
  violationLimit = 3
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Round Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              DebugArena
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live Challenge
            </span>
          </div>
        </div>

        {roundTitle && (
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-800 text-sm">
            {roundNumber && (
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Round {roundNumber}
              </span>
            )}
            <span className="text-slate-300 font-medium truncate max-w-xs lg:max-w-md">
              {roundTitle}
            </span>
          </div>
        )}
      </div>

      {/* Center Timer & Proctoring Status (if active) */}
      <div className="flex items-center gap-3">
        {proctoringMode && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span>OA PROCTORING LOCKED</span>
            <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px]">
              STRIKES: {violationCount}/{violationLimit}
            </span>
          </div>
        )}

        {timerFormatted && (
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-base font-bold shadow-inner ${
              isTimerUrgent
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : 'bg-slate-900/90 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>{timerFormatted}</span>
          </div>
        )}
      </div>

      {/* Right User & Status */}
      <div className="flex items-center gap-3">
        <ConnectionBadge />

        {user && (
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
              <div className="text-[11px] text-slate-400 flex items-center justify-end gap-1 font-mono">
                {user.role === 'admin' ? (
                  <span className="text-amber-400 flex items-center gap-0.5">
                    <Shield className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span>@{user.username}</span>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
