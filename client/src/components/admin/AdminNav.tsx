import React from 'react';
import { Activity, PlaySquare, Trophy, Users, HelpCircle, Split, Award, Building2 } from 'lucide-react';

export type AdminTab =
  | 'events'
  | 'monitor'
  | 'control'
  | 'results'
  | 'participants'
  | 'questions'
  | 'tiebreak'
  | 'leaderboard';

interface AdminNavProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  hasTies?: boolean;
}

export const AdminNav: React.FC<AdminNavProps> = ({ activeTab, onTabChange, hasTies }) => {
  const tabs = [
    { id: 'events', label: 'Event Builder & Tenancy', icon: Building2 },
    { id: 'monitor', label: 'Live Monitoring', icon: Activity },
    { id: 'control', label: 'Competition & Rounds', icon: PlaySquare },
    { id: 'results', label: 'Round Results & Advance', icon: Award },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'questions', label: 'Question Bank', icon: HelpCircle },
    { id: 'tiebreak', label: 'Tie-Break Engine', icon: Split, badge: hasTies },
    { id: 'leaderboard', label: 'Final Leaderboard', icon: Trophy }
  ];

  return (
    <div className="border-b border-slate-800 bg-slate-950/90 sticky top-16 z-30 px-3 sm:px-6 backdrop-blur-md">
      <div className="flex space-x-2 overflow-x-auto scrollbar-none py-2.5">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id as AdminTab)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
              {t.badge && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
