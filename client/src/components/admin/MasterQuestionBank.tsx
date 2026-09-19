import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle,
  Code2,
  Database,
  Plus,
  Trash2,
  Pencil,
  Search,
  Filter,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  BookOpen,
  Check,
  X,
  Lock,
  ArrowUpDown,
  Building2,
  Calendar
} from 'lucide-react';
import { QuestionTemplate } from '../../types/index.js';
import { getQuestionBank, deleteQuestionTemplate, api } from '../../services/api.js';
import { AddQuestionModal } from './AddQuestionModal.js';
import { QuestionImportModal } from './QuestionImportModal.js';

export const MasterQuestionBank: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [topics, setTopics] = useState<string[]>([]);

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals & Active Selections
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<QuestionTemplate | null>(null);
  const [viewingDetails, setViewingDetails] = useState<QuestionTemplate | null>(null);

  // Deletion Error Modal State (HTTP 409 Conflict)
  const [deleteError, setDeleteError] = useState<{ message: string; usedIn: any[] } | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [seedingBank, setSeedingBank] = useState<boolean>(false);

  // Load questions
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getQuestionBank({
        page,
        limit,
        type: activeCategory !== 'all' ? activeCategory : undefined,
        difficulty: selectedDifficulty || undefined,
        topic: selectedTopic || undefined,
        search: searchQuery.trim() || undefined,
        sortBy,
        sortOrder
      });

      setQuestions(res.questions || []);
      setTotalCount(res.totalCount || 0);
      setTotalPages(res.totalPages || 1);
      setGrandTotal(res.grandTotal || 0);
      setCountsByType(res.countsByType || {});
      if (res.topics) setTopics(res.topics);
    } catch (err: any) {
      console.error('Failed to load Master Question Bank:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeCategory, selectedDifficulty, selectedTopic, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Handle Delete Question
  const handleDeleteQuestion = async (q: QuestionTemplate) => {
    if (!confirm(`Permanently delete question "${q.title}" from the Master Question Bank?`)) {
      return;
    }

    try {
      setIsDeletingId(q._id);
      await deleteQuestionTemplate(q._id);
      loadQuestions();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDeleteError({
          message: err.response.data?.error || 'Cannot delete this question because it is in use by event rounds.',
          usedIn: err.response.data?.usedIn || []
        });
      } else {
        alert(err.response?.data?.error || 'Failed to delete question template.');
      }
    } finally {
      setIsDeletingId(null);
    }
  };

  // Seed default questions
  const handleSeedDefaults = async () => {
    if (!confirm('Re-seed standard curated library across MCQs, Coding, SQL, and Debugging?')) return;
    try {
      setSeedingBank(true);
      await api.post('/admin/questions/bank/seed-defaults');
      await loadQuestions();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to seed default questions');
    } finally {
      setSeedingBank(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Questions', count: grandTotal, icon: BookOpen },
    { id: 'mcq', label: 'MCQs', count: countsByType['mcq'] || 0, icon: HelpCircle },
    { id: 'coding', label: 'Coding', count: countsByType['coding'] || 0, icon: Code2 },
    { id: 'sql', label: 'SQL', count: countsByType['sql'] || 0, icon: Database },
    { id: 'debugging', label: 'Debugging', count: countsByType['debugging'] || 0, icon: Sparkles },
    { id: 'aptitude', label: 'Aptitude', count: countsByType['aptitude'] || 0, icon: Layers }
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-200 text-left">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Master Question Bank
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              Global repository of all assessment questions. Questions configured here are available across all tournament rounds.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seedingBank}
              className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Re-seed standard curated library"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seedingBank ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{seedingBank ? 'Seeding...' : 'Seed Defaults'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <UploadCloud className="w-4 h-4 text-cyan-400" />
              <span>Bulk Import</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Question</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          {categories.map(c => {
            const Icon = c.icon;
            const isSelected = activeCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setActiveCategory(c.id);
                  setPage(1);
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-mono font-bold truncate">{c.label}</span>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="text-xl font-black text-white">{c.count}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs shadow-md">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search all questions by title, prompt, topic, tags..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDifficulty}
            onChange={e => {
              setSelectedDifficulty(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>

          {topics.length > 0 && (
            <select
              value={selectedTopic}
              onChange={e => {
                setSelectedTopic(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[150px]"
            >
              <option value="">All Topics</option>
              {topics.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={e => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="createdAt">Sort: Newest</option>
            <option value="title">Sort: Title</option>
            <option value="difficulty">Sort: Difficulty</option>
            <option value="topic">Sort: Topic</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
            title={`Sort Order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>

          <select
            value={limit}
            onChange={e => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
          </select>
        </div>
      </div>

      {/* Questions Table / Cards */}
      {loading ? (
        <div className="py-24 text-center text-xs font-mono text-slate-400 space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div>Accessing Master Question Bank...</div>
        </div>
      ) : questions.length === 0 ? (
        <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <HelpCircle className="w-10 h-10 mx-auto text-slate-600" />
          <h3 className="text-base font-bold text-white">No questions found</h3>
          <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
            No questions matched your current category or search criteria. Try modifying your filters or click "Seed Defaults" to load curated challenges.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => {
            const qid = q._id.toString();
            const usedCount = q.usedInEvents ? q.usedInEvents.length : 0;

            return (
              <div
                key={qid}
                className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
              >
                {/* Left info */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white text-sm sm:text-base truncate">
                      {q.title}
                    </span>

                    {/* Type Badge */}
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      {q.type}
                    </span>

                    {/* Difficulty Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        q.difficulty === 'easy'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : q.difficulty === 'hard'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {q.difficulty}
                    </span>

                    {/* Topic Badge */}
                    {q.topic && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                        {q.topic}
                      </span>
                    )}

                    {/* Used In Events Indicator (Key Requirement) */}
                    {usedCount > 0 ? (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                        <Building2 className="w-3 h-3 text-cyan-400" />
                        <span>
                          Used in {usedCount} event{usedCount === 1 ? '' : 's'}:{' '}
                          {q.usedInEvents!.slice(0, 2).map(u => `${u.eventName} (R${u.roundNumber})`).join(', ')}
                          {usedCount > 2 && ` +${usedCount - 2} more`}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
                        Unassigned / Available
                      </span>
                    )}
                  </div>

                  {/* Prompt preview */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                    {q.prompt?.replace(/[#*`]/g, '')}
                  </p>

                  {/* Skill tags */}
                  {q.skillTags && q.skillTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {q.skillTags.slice(0, 4).map((tag, idx) => (
                        <span key={idx} className="text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800/80">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right action buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center font-mono">
                  <button
                    type="button"
                    onClick={() => setViewingDetails(q)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="View details & preview test cases"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTemplate(q);
                      setIsAddModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Edit question template"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    disabled={isDeletingId === qid}
                    onClick={() => handleDeleteQuestion(q)}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete question from Master Question Bank"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between font-mono text-xs">
          <div className="text-slate-400">
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalCount)} of {totalCount} questions
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    page === pageNum ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {isAddModalOpen && (
        <AddQuestionModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingTemplate(null);
          }}
          onQuestionAdded={() => {
            setIsAddModalOpen(false);
            setEditingTemplate(null);
            loadQuestions();
          }}
          editingTemplate={editingTemplate}
        />
      )}

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <QuestionImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={() => {
            setIsImportModalOpen(false);
            loadQuestions();
          }}
        />
      )}

      {/* View Details Modal */}
      {viewingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden font-mono">
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{viewingDetails.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300">
                    {viewingDetails.type}
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Topic: {viewingDetails.topic} • Difficulty: {viewingDetails.difficulty} • Marks: {viewingDetails.marks || 10}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingDetails(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-left">
              <div>
                <strong className="text-slate-300">Prompt:</strong>
                <div className="mt-1 p-3.5 rounded-xl bg-slate-950 border border-slate-800 whitespace-pre-wrap text-slate-200 font-sans leading-relaxed">
                  {viewingDetails.prompt}
                </div>
              </div>

              {viewingDetails.options && viewingDetails.options.length > 0 && (
                <div className="space-y-1">
                  <strong className="text-slate-300">Multiple Choice Options:</strong>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {viewingDetails.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-xl border ${
                          opt.isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-bold'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {opt.isCorrect ? '✓ ' : '• '} {opt.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingDetails.explanation && (
                <div>
                  <strong className="text-slate-300">Explanation:</strong>
                  <div className="mt-1 p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-sans">
                    {viewingDetails.explanation}
                  </div>
                </div>
              )}

              {viewingDetails.testCases && viewingDetails.testCases.length > 0 && (
                <div>
                  <strong className="text-slate-300">Test Cases ({viewingDetails.testCases.length}):</strong>
                  <div className="mt-1 space-y-1.5">
                    {viewingDetails.testCases.map((tc, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                        <div>Input: {tc.input || '(empty)'}</div>
                        <div>Output: {tc.output}</div>
                        {tc.isHidden && <span className="text-[10px] text-amber-400 font-bold">[Hidden Test Case]</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingDetails.usedInEvents && viewingDetails.usedInEvents.length > 0 && (
                <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-1.5">
                  <strong className="text-cyan-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    Assigned Tournaments:
                  </strong>
                  <div className="space-y-1 text-slate-300 text-[11px]">
                    {viewingDetails.usedInEvents.map((u, uIdx) => (
                      <div key={uIdx}>
                        • <strong>{u.eventName}</strong> ({u.eventCode}) — Round {u.roundNumber} ({u.roundTitle})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defensive Deletion Error Modal (HTTP 409 Conflict) */}
      {deleteError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-rose-500/40 shadow-2xl space-y-4 font-mono text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white">Cannot Delete Question</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {deleteError.message}
            </p>

            {deleteError.usedIn && deleteError.usedIn.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-[11px] text-amber-300">
                <div className="font-bold text-slate-400 uppercase text-[10px]">Active Round Assignments:</div>
                {deleteError.usedIn.map((u, idx) => (
                  <div key={idx}>• {u.eventName} (Round {u.roundNumber})</div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteError(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
