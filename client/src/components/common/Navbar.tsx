import React, { useState } from 'react';
import { Terminal, LogOut, Shield, User as UserIcon, Clock, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { ConnectionBadge } from './ConnectionBadge.js';
import { PasskeyProfileModal } from '../admin/PasskeyProfileModal.js';

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
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);

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
      <div className="flex items-center gap-2 sm:gap-3">
        {proctoringMode && (
          <>
            {/* Desktop Proctoring Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span>OA PROCTORING LOCKED</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px]">
                STRIKES: {violationCount}/{violationLimit}
              </span>
            </div>

            {/* Mobile Adaptive Strike Indicator */}
            <div
              className={`flex lg:hidden items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border ${
                violationCount > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700'
              }`}
              title={`Proctoring Armed - Strike ${violationCount} of ${violationLimit}`}
            >
              <Shield className={`w-3.5 h-3.5 ${violationCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
              <span>{violationCount}/{violationLimit}</span>
            </div>
          </>
        )}

        {timerFormatted && (
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl font-mono text-xs sm:text-base font-bold shadow-inner shrink-0 ${
              isTimerUrgent
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : 'bg-slate-900/90 text-indigo-300 border border-indigo-500/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400 shrink-0" />
            <span>{timerFormatted}</span>
          </div>
        )}
      </div>

      {/* Right User & Status */}
      <div className="flex items-center gap-2 sm:gap-3">
        <ConnectionBadge />

        {user && (
          <div className="flex items-center gap-1.5 sm:gap-2.5 pl-1.5 sm:pl-2 border-l border-slate-800">
            {/* Organizer Profile & Security Passkey Access */}
            {user.role !== 'participant' ? (
              <button
                type="button"
                onClick={() => setIsPasskeyModalOpen(true)}
                className="group flex items-center gap-2 sm:gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-xl sm:rounded-2xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/50 transition-all cursor-pointer shadow-sm text-left"
                title="Organizer Profile & Passkey Settings"
              >
                <div className="w-7 h-7 rounded-lg sm:rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-inner shrink-0">
                  {user.name ? user.name[0].toUpperCase() : 'A'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5 leading-tight">
                    <span className="truncate max-w-[120px]">{user.name}</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25">
                      Admin
                    </span>
                  </div>
                  <div className="text-[10px] flex items-center gap-1 font-mono mt-0.5">
                    {user.hasPasskey ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Passkey Active
                      </span>
                    ) : (
                      <span className="text-amber-400/90 group-hover:text-amber-300 flex items-center gap-1">
                        <Key className="w-2.5 h-2.5 text-amber-400" />
                        Set Passkey
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ) : (
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-white leading-tight">{user.name}</div>
                <div className="text-[11px] text-slate-400 font-mono">@{user.username}</div>
              </div>
            )}

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Organizer Profile & Security Passkey Modal */}
      {user && user.role !== 'participant' && (
        <PasskeyProfileModal
          isOpen={isPasskeyModalOpen}
          onClose={() => setIsPasskeyModalOpen(false)}
        />
      )}
    </header>
  );
};
