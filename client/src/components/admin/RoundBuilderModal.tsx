import React, { useState } from 'react';
import { X, Layers, Clock, Award, CheckCircle2, Code2, Check } from 'lucide-react';
import { createDynamicRound } from '../../services/api.js';

interface RoundBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onRoundCreated: () => void;
}

const ALL_LANGUAGES: { id: string; label: string; color: string }[] = [
  { id: 'python', label: 'Python 3', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'cpp', label: 'C++ (GCC)', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'java', label: 'Java 17', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'c', label: 'C (GCC)', color: 'bg-slate-500/20 text-slate-200 border-slate-500/40' },
  { id: 'javascript', label: 'JavaScript (Node)', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  { id: 'sql', label: 'SQL', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
];

export const RoundBuilderModal: React.FC<RoundBuilderModalProps> = ({
  isOpen,
  onClose,
  eventId,
  onRoundCreated
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'mcq' | 'debugging' | 'coding' | 'sql' | 'aptitude'>('debugging');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questionCount, setQuestionCount] = useState(3);
  const [totalMarks, setTotalMarks] = useState(100);
  const [passingMarks, setPassingMarks] = useState(0);
  const [negativeMarkValue, setNegativeMarkValue] = useState(0);
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(['python', 'cpp', 'java', 'c', 'javascript']);
  const [advancementQuota, setAdvancementQuota] = useState(15);
  const [tieResolutionStrategy, setTieResolutionStrategy] = useState<'expand' | 'strict' | 'manual'>('expand');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleLanguage = (langId: string) => {
    if (allowedLanguages.includes(langId)) {
      setAllowedLanguages(allowedLanguages.filter(l => l !== langId));
    } else {
      setAllowedLanguages([...allowedLanguages, langId]);
    }
  };

  const selectAll = () => {
    setAllowedLanguages(['python', 'cpp', 'java', 'c', 'javascript']);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a round title');
      return;
    }

    if ((type === 'coding' || type === 'debugging') && allowedLanguages.length === 0) {
      alert('Please select at least one permitted programming language for this round.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createDynamicRound(eventId, {
        title: title.trim(),
        description: description.trim(),
        type,
        durationMinutes,
        questionCount,
        totalMarks,
        passingMarks,
        negativeMarkValue,
        allowedLanguages: (type === 'coding' || type === 'debugging')
          ? allowedLanguages
          : (type === 'sql' ? ['sql'] : []),
        advancementQuota,
        advancementRule: 'top_n',
        tieResolutionStrategy
      });
      onRoundCreated();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add round');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Add Dynamic Round</h2>
              <p className="text-xs text-slate-400">Configure round type, permitted languages, and evaluation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Round Title</label>
            <input
              type="text"
              placeholder="e.g. Round 2: Core Bug Hunting"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Round Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'debugging', label: 'Debugging' },
                { id: 'coding', label: 'Algorithmic Coding' },
                { id: 'mcq', label: 'MCQ Quiz' },
                { id: 'sql', label: 'SQL Query' },
                { id: 'aptitude', label: 'Aptitude' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    const nextType = t.id as any;
                    setType(nextType);
                    if (nextType === 'sql') setAllowedLanguages(['sql']);
                    else if (nextType === 'coding' || nextType === 'debugging') {
                      if (allowedLanguages.length === 0 || allowedLanguages.includes('sql')) {
                        setAllowedLanguages(['python', 'cpp', 'java', 'c', 'javascript']);
                      }
                    }
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    type === t.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-950/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ALLOWED LANGUAGES */}
          {(type === 'coding' || type === 'debugging' || type === 'sql') && (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-cyan-400" /> Permitted Programming Languages
                </label>
                {type !== 'sql' && (
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold cursor-pointer"
                  >
                    Select All Standard
                  </button>
                )}
              </div>

              {type === 'sql' ? (
                <div className="text-xs text-purple-400 font-mono bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl">
                  SQL dialect active.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1">
                  {ALL_LANGUAGES.filter(l => l.id !== 'sql').map(lang => {
                    const isSelected = allowedLanguages.includes(lang.id);
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => toggleLanguage(lang.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? `${lang.color} shadow-sm`
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Code2 className="w-3.5 h-3.5 opacity-70" />
                        <span>{lang.label}</span>
                        {isSelected && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Description & Objective</label>
            <textarea
              rows={2}
              placeholder="Describe what candidates need to achieve in this round..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={180}
                value={durationMinutes}
                onChange={e => setDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-cyan-400" /> Total Marks
              </label>
              <input
                type="number"
                min={10}
                max={1000}
                value={totalMarks}
                onChange={e => setTotalMarks(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Target Question Count</label>
              <input
                type="number"
                min={1}
                max={50}
                value={questionCount}
                onChange={e => setQuestionCount(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Negative Marking / Question</label>
              <input
                type="number"
                min={0}
                step={0.25}
                value={negativeMarkValue}
                onChange={e => setNegativeMarkValue(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Upfront Advancement Quota & Fairness Rules */}
          <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                ⚡ Upfront Round Advancement Quota
              </span>
              <span className="text-[11px] text-cyan-400 font-mono font-bold">Auto-Cutoff</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Define how many top performers automatically advance from this stage (e.g. 25 candidates in R1 &rarr; top 15 advance to R2 &rarr; top 10 advance to Final Round). Set 0 for winner/final round.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Advancement Quota (Top N)
                </label>
                <input
                  type="number"
                  min={0}
                  max={500}
                  value={advancementQuota}
                  onChange={e => setAdvancementQuota(parseInt(e.target.value, 10) || 0)}
                  placeholder="e.g. 15"
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:border-cyan-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Cutoff Boundary Tie Policy
                </label>
                <select
                  value={tieResolutionStrategy}
                  onChange={e => setTieResolutionStrategy(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                >
                  <option value="expand">Academic Fairness (Expand Cutoff)</option>
                  <option value="strict">Strict Slicing (Top N Only)</option>
                  <option value="manual">Flag to Admin for Review</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-cyan-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Adding Round...' : 'Add Round'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
