import React, { useState } from 'react';
import { X, Layers, Clock, Award, CheckCircle2 } from 'lucide-react';
import { createDynamicRound } from '../../services/api.js';

interface RoundBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onRoundCreated: () => void;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a round title');
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
        negativeMarkValue
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Add Dynamic Round</h2>
              <p className="text-xs text-slate-400">Configure round type, duration, marks, and evaluation</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
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
                  onClick={() => setType(t.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
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
