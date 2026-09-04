import React, { useState, useEffect } from 'react';
import { HelpCircle, Code2, Plus, Trash2, Edit, ChevronDown, ChevronUp, Check, Eye } from 'lucide-react';
import { Question } from '../../types/index.js';
import { api } from '../../services/api.js';

export const QuestionManager: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/questions', { params: { roundNumber: selectedRound } });
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedRound]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/admin/questions/${id}`);
      setQuestions(prev => prev.filter(q => q._id !== id));
    } catch (err) {
      alert('Failed to delete question');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            Competition Question Repository
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin master view with answer keys and full hidden test suites.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          {[1, 2, 3, 99].map(r => (
            <button
              key={r}
              onClick={() => setSelectedRound(r)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedRound === r
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {r === 99 ? 'Tie-Breaker' : `Round ${r}`}
            </button>
          ))}
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
            No questions configured for this round.
          </div>
        ) : (
          questions.map((q, idx) => {
            const isExpanded = expandedId === q._id;

            return (
              <div
                key={q._id}
                className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition-all"
              >
                {/* Accordion Bar */}
                <div
                  onClick={() => toggleExpand(q._id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-850 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-white">{q.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono">
                        <span className="uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {q.type}
                        </span>
                        <span>•</span>
                        <span>{q.marks} Marks</span>
                        {q.testCases && (
                          <>
                            <span>•</span>
                            <span>{q.testCases.length} Test Cases</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(q._id);
                      }}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-800 bg-slate-950/60 space-y-4 text-xs font-mono">
                    <div>
                      <div className="text-slate-400 font-bold uppercase mb-1">Problem Prompt:</div>
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap font-sans">
                        {q.prompt}
                      </div>
                    </div>

                    {/* MCQ Options Details */}
                    {q.type === 'mcq' && q.options && (
                      <div>
                        <div className="text-slate-400 font-bold uppercase mb-2">Options & Key:</div>
                        <div className="space-y-1.5">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = (q as any).correctOptionIndex === oIdx;
                            return (
                              <div
                                key={oIdx}
                                className={`p-2.5 rounded-lg flex items-center justify-between border ${
                                  isCorrect
                                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 font-bold'
                                    : 'bg-slate-900 border-slate-800 text-slate-300 font-sans'
                                }`}
                              >
                                <span>
                                  {String.fromCharCode(65 + oIdx)}. {opt}
                                </span>
                                {isCorrect && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-black text-[10px] font-bold">
                                    CORRECT KEY
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Coding Test Cases Details */}
                    {q.type === 'coding' && q.testCases && (
                      <div>
                        <div className="text-slate-400 font-bold uppercase mb-2">
                          Test Suite (Visible & Hidden):
                        </div>
                        <div className="space-y-2">
                          {q.testCases.map((tc, tcIdx) => (
                            <div
                              key={tcIdx}
                              className={`p-3 rounded-xl border ${
                                tc.isHidden
                                  ? 'bg-slate-900/90 border-indigo-500/30'
                                  : 'bg-slate-900 border-slate-800'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-1 text-[11px]">
                                <span className="font-bold text-white">
                                  Case #{tcIdx + 1} ({tc.isHidden ? '🔒 HIDDEN' : '👁️ VISIBLE'})
                                </span>
                                <span className="text-slate-400">{tc.weight} Points</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <div>
                                  <span className="text-slate-500 text-[10px]">Input:</span>
                                  <pre className="bg-slate-950 p-1.5 rounded text-slate-200 whitespace-pre">
                                    {tc.input || '(empty)'}
                                  </pre>
                                </div>
                                <div>
                                  <span className="text-slate-500 text-[10px]">Expected Output:</span>
                                  <pre className="bg-slate-950 p-1.5 rounded text-emerald-400 whitespace-pre">
                                    {tc.expectedOutput}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
