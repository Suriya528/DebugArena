import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Code2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Dna,
  Sparkles,
  Layers,
  Search,
  BookOpen,
  Send,
  AlertOctagon,
  Clock,
  Award
} from 'lucide-react';
import { Question } from '../../types/index.js';
import { api } from '../../services/api.js';
import { VariantPreviewModal } from './VariantPreviewModal.js';

export const QuestionManager: React.FC = () => {
  const [activeView, setActiveView] = useState<'round_questions' | 'question_bank'>('question_bank');

  // Round questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Question bank state
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bankLoading, setBankLoading] = useState<boolean>(false);

  // Variant preview modal state
  const [previewTemplate, setPreviewTemplate] = useState<{ id: string; title: string } | null>(null);

  const fetchRoundQuestions = async () => {
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

  const fetchQuestionBank = async () => {
    try {
      setBankLoading(true);
      const res = await api.get('/admin/questions/bank', {
        params: {
          topic: selectedTopic || undefined,
          difficulty: selectedDifficulty || undefined,
          search: searchQuery || undefined
        }
      });
      setBankQuestions(res.data.questions || []);
      setTopics(res.data.topics || []);
    } catch (err) {
      console.error('Failed to load question bank:', err);
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'round_questions') {
      fetchRoundQuestions();
    } else {
      fetchQuestionBank();
    }
  }, [activeView, selectedRound, selectedTopic, selectedDifficulty]);

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

  const handleDeployToRound = async (templateId: string, roundNumber: number) => {
    try {
      await api.post(`/admin/questions/bank/${templateId}/deploy-to-round`, { roundNumber });
      alert(`Question deployed to Round ${roundNumber}!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to deploy question');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-left">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                <Dna className="w-3 h-3" /> Universal Question Engine & Bank
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Question Bank & DNA Studio</h1>
            <p className="text-xs text-slate-400">
              Parametric Question DNA mutation, Bug DNA taxonomy, and central repository
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveView('question_bank')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'question_bank'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Question Bank & DNA Studio</span>
          </button>
          <button
            onClick={() => setActiveView('round_questions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'round_questions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Active Round Deployments</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: QUESTION BANK & QUESTION DNA STUDIO */}
      {activeView === 'question_bank' ? (
        <div className="space-y-6">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-80 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search topics, skill tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fetchQuestionBank(); }}
                className="bg-transparent text-xs text-white focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Topics ({topics.length})</option>
                {topics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Question Bank Cards */}
          {bankLoading ? (
            <div className="text-center py-20 text-slate-500 font-mono text-sm">Loading Question Bank...</div>
          ) : bankQuestions.length === 0 ? (
            <div className="text-center py-16 text-slate-500 bg-slate-900/60 rounded-3xl border border-slate-800">
              No questions found matching your filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bankQuestions.map(item => (
                <div
                  key={item._id}
                  className="rounded-3xl bg-slate-900 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl shadow-slate-950/40"
                >
                  <div>
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                        {item.topic}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        {item.language}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.difficulty === 'easy'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : item.difficulty === 'hard'
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {item.difficulty}
                      </span>
                      {item.hasDnaMutation && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 animate-pulse">
                          <Dna className="w-3 h-3" /> Question DNA
                        </span>
                      )}
                      {item.dnaConfig?.bugCategory && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertOctagon className="w-2.5 h-2.5" /> Bug: {item.dnaConfig.bugCategory.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-white mb-2">{item.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{item.prompt}</p>

                    {/* Skill Tags */}
                    {item.skillTags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {item.skillTags.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" /> {item.expectedSolveTimeMinutes}m
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="w-3 h-3 text-slate-500" /> {item.marks} pts
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Preview Variants Button (USP) */}
                      {item.hasDnaMutation && (
                        <button
                          onClick={() => setPreviewTemplate({ id: item._id, title: item.title })}
                          className="py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Dna className="w-3.5 h-3.5" />
                          <span>Preview DNA Variants (USP)</span>
                        </button>
                      )}

                      {/* Deploy to Round Dropdown */}
                      <select
                        onChange={e => {
                          if (e.target.value) {
                            handleDeployToRound(item._id, parseInt(e.target.value, 10));
                            e.target.value = '';
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3 rounded-xl cursor-pointer focus:outline-none"
                      >
                        <option value="">Deploy to Round ▼</option>
                        <option value="1">Deploy to Round 1 (MCQ)</option>
                        <option value="2">Deploy to Round 2 (Coding)</option>
                        <option value="3">Deploy to Round 3 (Coding)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: ACTIVE ROUND DEPLOYMENTS */
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              {[1, 2, 3, 99].map(r => (
                <button
                  key={r}
                  onClick={() => setSelectedRound(r)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedRound === r
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                  }`}
                >
                  {r === 99 ? 'Tie-Breaker' : `Round ${r}`}
                </button>
              ))}
            </div>
            <div className="text-xs font-mono text-slate-400">Total in Round: {questions.length}</div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-16 text-slate-500">Loading round questions...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16 text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
                No questions deployed for this round.
              </div>
            ) : (
              questions.map((q, idx) => {
                const isExpanded = expandedId === q._id;
                return (
                  <div key={q._id} className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg transition-all">
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 font-mono">
                              {q.type}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[11px] text-slate-400 font-mono">{q.marks} Marks</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(q._id); }}
                          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 border-t border-slate-800/80 bg-slate-950/50 space-y-4 text-xs">
                        <div>
                          <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[11px] mb-1">Problem Statement</h4>
                          <div className="text-slate-300 font-mono whitespace-pre-wrap bg-slate-950 p-4 rounded-xl border border-slate-800/60 leading-relaxed">
                            {q.prompt}
                          </div>
                        </div>

                        {q.type === 'mcq' && q.options && (
                          <div>
                            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[11px] mb-2">Options</h4>
                            <div className="grid sm:grid-cols-2 gap-2">
                              {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                                  {opt}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {q.testCases && q.testCases.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[11px] mb-2">Test Suite</h4>
                            <div className="grid sm:grid-cols-2 gap-2 font-mono">
                              {q.testCases.map((tc, tcIdx) => (
                                <div key={tcIdx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                                  <div className="text-[10px] text-slate-500 mb-1">Case #{tcIdx + 1} {tc.isHidden && '(Hidden)'}</div>
                                  <div>In: {tc.input?.replace(/\n/g, ' ')}</div>
                                  <div className="text-emerald-400">Out: {tc.expectedOutput?.replace(/\n/g, ' ')}</div>
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
      )}

      {/* Variant Preview Modal (USP) */}
      {previewTemplate && (
        <VariantPreviewModal
          isOpen={Boolean(previewTemplate)}
          onClose={() => setPreviewTemplate(null)}
          templateId={previewTemplate.id}
          templateTitle={previewTemplate.title}
        />
      )}
    </div>
  );
};
