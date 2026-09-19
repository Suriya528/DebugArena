import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Pencil,
  Eye,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  UploadCloud,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Building2,
  ExternalLink,
  Code2,
  Database,
  HelpCircle
} from 'lucide-react';
import { QuestionTemplate } from '../../types/index.js';
import { getQuestionBank, deleteQuestionTemplate, api } from '../../services/api.js';
import { AddQuestionModal } from './AddQuestionModal.js';
import { QuestionImportModal } from './QuestionImportModal.js';

export const MasterQuestionBank: React.FC = () => {
  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedUsage, setSelectedUsage] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);

  // Data
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [countsByType, setCountsByType] = useState<Record<string, number>>({
    mcq: 0,
    coding: 0,
    sql: 0,
    debugging: 0,
    aptitude: 0
  });

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [seedingBank, setSeedingBank] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<QuestionTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<QuestionTemplate | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Deletion Conflict State (HTTP 409)
  const [deleteError, setDeleteError] = useState<{ message: string; usedIn: any[] } | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Active language tab in details view
  const [detailActiveLang, setDetailActiveLang] = useState<string>('java');
  const [detailCodeMode, setDetailCodeMode] = useState<'starter' | 'solution'>('starter');

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Main data loader
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const params: any = {
        page,
        limit,
        sortBy,
        sortOrder,
        exactType: 'true'
      };

      if (selectedType !== 'all') params.type = selectedType;
      if (selectedDifficulty !== 'all') params.difficulty = selectedDifficulty;
      if (selectedUsage !== 'all') params.usage = selectedUsage;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getQuestionBank(params);

      setQuestions(res.questions || []);
      setTotalCount(res.totalCount || 0);
      setTotalPages(res.totalPages || 1);
      setGrandTotal(res.grandTotal || 0);
      if (res.countsByType) {
        setCountsByType(prev => ({ ...prev, ...res.countsByType }));
      }
    } catch (err: any) {
      console.error('Failed to load Master Question Bank:', err);
      setFetchError('Unable to load questions. Please check your connection or retry.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, selectedType, selectedDifficulty, selectedUsage, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Handle question created or updated
  const handleQuestionSaved = (savedQuestion?: QuestionTemplate) => {
    // Reset filters and page to ensure the newly added question appears immediately
    setPage(1);
    setSortBy('createdAt');
    setSortOrder('desc');
    setSearchQuery('');
    setSelectedDifficulty('all');
    setSelectedUsage('all');

    if (savedQuestion && savedQuestion.type) {
      // If user had filtered by an unrelated type, reset to all so the new question is visible
      if (selectedType !== 'all' && selectedType !== savedQuestion.type) {
        setSelectedType('all');
      }
    }

    // Refresh questions immediately from persistent backend state
    loadQuestions();
    showToast(editingTemplate ? 'Question updated successfully.' : 'Question added successfully.');
  };

  // Handle delete
  const handleDelete = async (q: QuestionTemplate) => {
    if (!confirm(`Permanently delete "${q.title}" from the Master Question Bank?`)) {
      return;
    }

    try {
      setIsDeletingId(q._id);
      await deleteQuestionTemplate(q._id);
      showToast('Question deleted successfully.');
      loadQuestions();
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDeleteError({
          message: err.response.data?.error || 'Cannot delete this question because it is in use by tournament rounds.',
          usedIn: err.response.data?.usedIn || []
        });
      } else {
        showToast(err.response?.data?.error || 'Failed to delete question.', 'error');
      }
    } finally {
      setIsDeletingId(null);
    }
  };

  // Seed defaults
  const handleSeedDefaults = async () => {
    if (!confirm('Re-seed the standard curated library (MCQ, Coding, SQL, Debugging)?')) return;
    try {
      setSeedingBank(true);
      await api.post('/admin/questions/bank/seed-defaults');
      showToast('Curated library synchronized successfully.');
      await loadQuestions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to seed default questions.', 'error');
    } finally {
      setSeedingBank(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'mcq':
        return 'MCQ';
      case 'coding':
      case 'debugging':
        return 'Coding / Debugging';
      case 'sql':
        return 'SQL';
      case 'aptitude':
        return 'Aptitude';
      default:
        return type.toUpperCase();
    }
  };

  const getDifficultyClass = (diff: string) => {
    switch (diff) {
      case 'easy':
        return 'text-[#22C55E]';
      case 'hard':
        return 'text-[#EF4444]';
      case 'medium':
      default:
        return 'text-[#F59E0B]';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F3F4F6] text-left selection:bg-neutral-800 selection:text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className={`px-4 py-2.5 rounded-lg border shadow-xl flex items-center gap-2.5 text-xs font-medium ${
            toast.type === 'error'
              ? 'bg-[#171B21] border-[#EF4444]/40 text-[#EF4444]'
              : 'bg-[#171B21] border-[#252A31] text-[#F3F4F6]'
          }`}>
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#F3F4F6]">
              Question Bank
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Manage reusable questions for all events and rounds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seedingBank}
              className="px-3 py-1.5 rounded-lg bg-[#111418] hover:bg-[#171B21] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#252A31] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              title="Re-seed standard questions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seedingBank ? 'animate-spin' : ''}`} />
              <span>{seedingBank ? 'Seeding...' : 'Seed Defaults'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#111418] hover:bg-[#171B21] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#252A31] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#E5E7EB] text-black text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4 text-black" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* Compact Summary Strip */}
        <div className="bg-[#111418] border border-[#252A31] rounded-xl px-4 py-3 flex flex-wrap items-center gap-4 sm:gap-8 text-xs">
          <button
            type="button"
            onClick={() => {
              setSelectedType('all');
              setPage(1);
            }}
            className={`flex items-center gap-2 transition-colors cursor-pointer ${
              selectedType === 'all' ? 'text-[#F3F4F6] font-semibold' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            <span className="text-[#6B7280]">Total Questions</span>
            <span className="font-mono text-sm">{grandTotal}</span>
          </button>

          <div className="h-3 w-[1px] bg-[#252A31] hidden sm:block" />

          <button
            type="button"
            onClick={() => {
              setSelectedType('mcq');
              setPage(1);
            }}
            className={`flex items-center gap-2 transition-colors cursor-pointer ${
              selectedType === 'mcq' ? 'text-[#F3F4F6] font-semibold' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            <span className="text-[#6B7280]">MCQ</span>
            <span className="font-mono text-sm">{countsByType.mcq || 0}</span>
          </button>

          <div className="h-3 w-[1px] bg-[#252A31] hidden sm:block" />

          <button
            type="button"
            onClick={() => {
              setSelectedType('coding');
              setPage(1);
            }}
            className={`flex items-center gap-2 transition-colors cursor-pointer ${
              selectedType === 'coding' || selectedType === 'debugging' ? 'text-[#F3F4F6] font-semibold' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            <span className="text-[#6B7280]">Coding / Debugging</span>
            <span className="font-mono text-sm">{(countsByType.coding || 0) + (countsByType.debugging || 0)}</span>
          </button>

          <div className="h-3 w-[1px] bg-[#252A31] hidden sm:block" />

          <button
            type="button"
            onClick={() => {
              setSelectedType('sql');
              setPage(1);
            }}
            className={`flex items-center gap-2 transition-colors cursor-pointer ${
              selectedType === 'sql' ? 'text-[#F3F4F6] font-semibold' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            <span className="text-[#6B7280]">SQL</span>
            <span className="font-mono text-sm">{countsByType.sql || 0}</span>
          </button>
        </div>

        {/* Toolbar: Search, Filters & Controls */}
        <div className="bg-[#111418] border border-[#252A31] rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search questions by title, prompt, topic, tags..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none focus:border-[#4B5563]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F3F4F6]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type */}
            <select
              value={selectedType}
              onChange={e => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#4B5563] cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="mcq">MCQ</option>
              <option value="coding">Coding / Debugging</option>
              <option value="sql">SQL</option>
              <option value="aptitude">Aptitude</option>
            </select>

            {/* Difficulty */}
            <select
              value={selectedDifficulty}
              onChange={e => {
                setSelectedDifficulty(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#4B5563] cursor-pointer"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            {/* Usage */}
            <select
              value={selectedUsage}
              onChange={e => {
                setSelectedUsage(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#4B5563] cursor-pointer"
            >
              <option value="all">All Usage</option>
              <option value="used">Used in Tournaments</option>
              <option value="unused">Unused</option>
            </select>

            {/* Page Size Limit */}
            <select
              value={limit}
              onChange={e => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1.5 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#9CA3AF] focus:outline-none focus:border-[#4B5563] cursor-pointer"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* Main Table / States Container */}
        <div className="bg-[#111418] border border-[#252A31] rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            /* Skeleton Loading State (Section 19) */
            <div className="divide-y divide-[#252A31]">
              <div className="px-4 py-3 bg-[#171B21] flex items-center justify-between text-xs text-[#9CA3AF]">
                <div className="w-1/3 h-4 bg-[#252A31] rounded animate-pulse" />
                <div className="w-1/6 h-4 bg-[#252A31] rounded animate-pulse hidden sm:block" />
                <div className="w-1/6 h-4 bg-[#252A31] rounded animate-pulse hidden sm:block" />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-[#171B21] rounded w-3/4 animate-pulse" />
                    <div className="h-3 bg-[#171B21]/60 rounded w-1/2 animate-pulse" />
                  </div>
                  <div className="w-16 h-5 bg-[#171B21] rounded animate-pulse" />
                  <div className="w-16 h-5 bg-[#171B21] rounded animate-pulse hidden sm:block" />
                  <div className="w-20 h-6 bg-[#171B21] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : fetchError ? (
            /* Error State (Section 20) */
            <div className="py-16 text-center space-y-3">
              <p className="text-xs text-[#9CA3AF]">{fetchError}</p>
              <button
                type="button"
                onClick={loadQuestions}
                className="px-3 py-1.5 rounded-lg bg-[#171B21] hover:bg-[#252A31] text-xs font-medium text-[#F3F4F6] border border-[#252A31] transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : questions.length === 0 ? (
            /* Empty State (Section 18) */
            <div className="py-16 text-center space-y-3">
              <h3 className="text-sm font-medium text-[#F3F4F6]">No questions yet.</h3>
              <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto">
                Create your first question to build the master question bank.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplate(null);
                    setIsAddModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#FFFFFF] hover:bg-[#E5E7EB] text-black text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>
          ) : (
            /* Clean Admin Table (Sections 6, 7, 8, 9, 10) */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#171B21] text-[#9CA3AF] border-b border-[#252A31] font-medium text-[11px]">
                    <th className="py-2.5 px-4 font-medium">Question</th>
                    <th className="py-2.5 px-3 font-medium w-24">Type</th>
                    <th className="py-2.5 px-3 font-medium w-24">Difficulty</th>
                    <th className="py-2.5 px-3 font-medium w-28">Usage</th>
                    <th className="py-2.5 px-3 font-medium w-28 hidden md:table-cell">Updated</th>
                    <th className="py-2.5 px-4 font-medium w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252A31]">
                  {questions.map(q => {
                    const usedCount = q.usedInEvents ? q.usedInEvents.length : 0;
                    return (
                      <tr
                        key={q._id}
                        className="hover:bg-[#171B21]/60 transition-colors group"
                      >
                        {/* Question Title & Prompt Snippet */}
                        <td className="py-3 px-4 max-w-md">
                          <button
                            type="button"
                            onClick={() => {
                              setViewingTemplate(q);
                              if (q.allowedLanguages && q.allowedLanguages.length > 0) {
                                setDetailActiveLang(q.allowedLanguages[0]);
                              }
                            }}
                            className="text-left group-hover:text-white transition-colors cursor-pointer block"
                          >
                            <span className="font-medium text-[#F3F4F6] block truncate">
                              {q.title}
                            </span>
                            {q.prompt && (
                              <span className="text-[11px] text-[#9CA3AF] block truncate mt-0.5 max-w-xl font-mono opacity-80">
                                {q.prompt.replace(/[#*`\n]/g, ' ')}
                              </span>
                            )}
                          </button>
                        </td>

                        {/* Type Badge */}
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#171B21] border border-[#252A31] text-[#D1D5DB] inline-block">
                            {getTypeBadge(q.type)}
                          </span>
                        </td>

                        {/* Difficulty */}
                        <td className="py-3 px-3">
                          <span className={`text-[11px] font-medium capitalize ${getDifficultyClass(q.difficulty)}`}>
                            {q.difficulty}
                          </span>
                        </td>

                        {/* Usage */}
                        <td className="py-3 px-3">
                          {usedCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setViewingTemplate(q);
                              }}
                              className="text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] transition-colors cursor-pointer flex items-center gap-1"
                              title={q.usedInEvents?.map(u => `${u.eventName} (R${u.roundNumber})`).join('\n')}
                            >
                              <span>{usedCount} {usedCount === 1 ? 'event' : 'events'}</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#6B7280]">Unused</span>
                          )}
                        </td>

                        {/* Updated Date */}
                        <td className="py-3 px-3 text-[11px] text-[#6B7280] hidden md:table-cell font-mono">
                          {formatDate(q.updatedAt || q.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setViewingTemplate(q);
                                if (q.allowedLanguages && q.allowedLanguages.length > 0) {
                                  setDetailActiveLang(q.allowedLanguages[0]);
                                }
                              }}
                              className="p-1.5 rounded text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#252A31] transition-colors cursor-pointer"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingTemplate(q);
                                setIsAddModalOpen(true);
                              }}
                              className="p-1.5 rounded text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#252A31] transition-colors cursor-pointer"
                              title="Edit Question"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              disabled={isDeletingId === q._id}
                              onClick={() => handleDelete(q)}
                              className="p-1.5 rounded text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#252A31] transition-colors cursor-pointer disabled:opacity-50"
                              title="Delete Question"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls (Section 13) */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-[#171B21] border-t border-[#252A31] flex items-center justify-between text-xs text-[#9CA3AF]">
              <div>
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-[#111418] border border-[#252A31] text-[#9CA3AF] hover:text-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  &lt; Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 rounded text-xs font-mono transition-colors cursor-pointer ${
                        page === pageNum
                          ? 'bg-[#FFFFFF] text-black font-semibold'
                          : 'bg-[#111418] border border-[#252A31] text-[#9CA3AF] hover:text-[#F3F4F6]'
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
                  className="px-2.5 py-1 rounded bg-[#111418] border border-[#252A31] text-[#9CA3AF] hover:text-[#F3F4F6] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  Next &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Question Modal */}
      {isAddModalOpen && (
        <AddQuestionModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingTemplate(null);
          }}
          onQuestionAdded={handleQuestionSaved}
          editingTemplate={editingTemplate}
          initialType={selectedType !== 'all' ? (selectedType as any) : 'coding'}
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
            showToast('Questions imported successfully.');
          }}
        />
      )}

      {/* Question Details Modal (Section 16) */}
      {viewingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#111418] border border-[#252A31] rounded-2xl shadow-2xl my-8 max-h-[90vh] flex flex-col text-left overflow-hidden">
            <div className="px-6 py-4 bg-[#171B21] border-b border-[#252A31] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#F3F4F6]">
                    {viewingTemplate.title}
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#111418] border border-[#252A31] text-[#D1D5DB]">
                    {getTypeBadge(viewingTemplate.type)}
                  </span>
                  <span className={`text-[11px] font-medium capitalize ${getDifficultyClass(viewingTemplate.difficulty)}`}>
                    {viewingTemplate.difficulty}
                  </span>
                </div>
                <div className="text-xs text-[#9CA3AF] mt-0.5">
                  Topic: {viewingTemplate.topic} • Marks: {viewingTemplate.marks || 20} • Solve Time: {viewingTemplate.expectedSolveTimeMinutes || 15}m
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingTemplate(null)}
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#252A31] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs text-[#F3F4F6]">
              {/* Problem Statement */}
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-[#9CA3AF]">Problem Statement</div>
                <div className="p-3.5 rounded-lg bg-[#171B21] border border-[#252A31] whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#F3F4F6]">
                  {viewingTemplate.prompt}
                </div>
              </div>

              {/* Formats & Constraints */}
              {(viewingTemplate.inputFormat || viewingTemplate.outputFormat || viewingTemplate.constraints) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {viewingTemplate.inputFormat && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-[#9CA3AF]">Input Format</div>
                      <div className="p-2.5 rounded-lg bg-[#171B21] border border-[#252A31] font-mono text-[11px] whitespace-pre-wrap">
                        {viewingTemplate.inputFormat}
                      </div>
                    </div>
                  )}
                  {viewingTemplate.outputFormat && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-[#9CA3AF]">Output Format</div>
                      <div className="p-2.5 rounded-lg bg-[#171B21] border border-[#252A31] font-mono text-[11px] whitespace-pre-wrap">
                        {viewingTemplate.outputFormat}
                      </div>
                    </div>
                  )}
                  {viewingTemplate.constraints && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-medium text-[#9CA3AF]">Constraints</div>
                      <div className="p-2.5 rounded-lg bg-[#171B21] border border-[#252A31] font-mono text-[11px] whitespace-pre-wrap">
                        {viewingTemplate.constraints}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MCQ Options */}
              {viewingTemplate.options && viewingTemplate.options.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-[#9CA3AF]">Options</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewingTemplate.options.map((opt, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                          opt.isCorrect
                            ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-[#22C55E] font-medium'
                            : 'bg-[#171B21] border-[#252A31] text-[#9CA3AF]'
                        }`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + idx)}.</span>
                        <span>{opt.text}</span>
                        {opt.isCorrect && <span className="ml-auto text-[10px] uppercase font-bold text-[#22C55E]">Correct</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation */}
              {viewingTemplate.explanation && (
                <div className="space-y-1">
                  <div className="text-[11px] font-medium text-[#9CA3AF]">Explanation</div>
                  <div className="p-3 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#9CA3AF]">
                    {viewingTemplate.explanation}
                  </div>
                </div>
              )}

              {/* Code Inspection (Starter Code vs Reference Solution) */}
              {((viewingTemplate.starterCode && Object.keys(viewingTemplate.starterCode).length > 0) ||
                (viewingTemplate.solutionCode && Object.keys(viewingTemplate.solutionCode).length > 0)) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailCodeMode('starter')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          detailCodeMode === 'starter'
                            ? 'bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/40 shadow-sm'
                            : 'bg-[#171B21] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#252A31]'
                        }`}
                      >
                        Starter / Buggy Code
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailCodeMode('solution')}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                          detailCodeMode === 'solution'
                            ? 'bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 shadow-sm'
                            : 'bg-[#171B21] text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#252A31]'
                        }`}
                      >
                        <span>Reference Solution</span>
                        <span className="text-[10px] bg-[#10B981]/30 text-[#A7F3D0] px-1.5 py-0.5 rounded font-mono">
                          Admin Only
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="border border-[#252A31] rounded-lg overflow-hidden bg-[#171B21]">
                    <div className="flex items-center justify-between bg-[#111418] border-b border-[#252A31] px-2 py-1 gap-1">
                      <div className="flex items-center gap-1">
                        {['c', 'cpp', 'python', 'java', 'javascript'].map(lang => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => setDetailActiveLang(lang)}
                            className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                              detailActiveLang === lang
                                ? 'bg-[#171B21] text-[#F3F4F6] font-semibold border border-[#252A31]'
                                : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                            }`}
                          >
                            {lang === 'cpp' ? 'C++' : lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-[#6B7280] px-2 hidden sm:inline">
                        {detailCodeMode === 'starter' ? 'Buggy / Starter implementation' : 'Verified Judge Reference Implementation'}
                      </span>
                    </div>
                    <pre className="p-3 text-xs font-mono text-[#F3F4F6] overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-64">
                      {detailCodeMode === 'starter'
                        ? ((viewingTemplate.starterCode && (viewingTemplate.starterCode[detailActiveLang] || viewingTemplate.starterCode[detailActiveLang.toLowerCase()])) ||
                          Object.values(viewingTemplate.starterCode || {})[0] ||
                          '// No starter code available for this language')
                        : ((viewingTemplate.solutionCode && ((viewingTemplate.solutionCode as any)[detailActiveLang] || (viewingTemplate.solutionCode as any)[detailActiveLang.toLowerCase()])) ||
                          '// No reference solution available for this language')}
                    </pre>
                  </div>
                </div>
              )}

              {/* Test Cases */}
              {viewingTemplate.testCases && viewingTemplate.testCases.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-medium text-[#9CA3AF]">
                    Test Cases ({viewingTemplate.testCases.length})
                  </div>
                  <div className="space-y-1.5 max-h-52 overflow-y-auto">
                    {viewingTemplate.testCases.map((tc, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#171B21] border border-[#252A31] font-mono text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="text-[#9CA3AF]">Input: <span className="text-[#F3F4F6]">{tc.input || '(empty)'}</span></div>
                          <div className="text-[#9CA3AF]">Output: <span className="text-[#F3F4F6]">{tc.output}</span></div>
                        </div>
                        {tc.isHidden && (
                          <span className="text-[10px] text-[#F59E0B] font-medium border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-1.5 py-0.5 rounded self-start sm:self-auto">
                            Hidden
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigned Tournaments */}
              {viewingTemplate.usedInEvents && viewingTemplate.usedInEvents.length > 0 && (
                <div className="p-3 rounded-lg bg-[#171B21] border border-[#252A31] space-y-1">
                  <div className="text-[11px] font-medium text-[#9CA3AF] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Assigned Tournaments:</span>
                  </div>
                  <div className="space-y-0.5 text-[#F3F4F6] text-[11px]">
                    {viewingTemplate.usedInEvents.map((u, idx) => (
                      <div key={idx}>
                        • <strong>{u.eventName}</strong> ({u.eventCode}) — Round {u.roundNumber} ({u.roundTitle})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-[#171B21] border-t border-[#252A31] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setEditingTemplate(viewingTemplate);
                  setViewingTemplate(null);
                  setIsAddModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#111418] hover:bg-[#252A31] text-[#F3F4F6] border border-[#252A31] text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Question</span>
              </button>

              <button
                type="button"
                onClick={() => setViewingTemplate(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#252A31] hover:bg-[#374151] text-[#F3F4F6] text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Defensive Deletion Conflict Modal (Section 17) */}
      {deleteError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-[#111418] border border-[#EF4444]/40 shadow-2xl space-y-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center border border-[#EF4444]/20">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#F3F4F6]">Cannot Delete Question</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              {deleteError.message}
            </p>

            {deleteError.usedIn && deleteError.usedIn.length > 0 && (
              <div className="p-3 rounded-lg bg-[#171B21] border border-[#252A31] space-y-1 text-xs text-[#F59E0B]">
                <div className="font-medium text-[#9CA3AF] text-[10px] uppercase">Active Round Assignments:</div>
                {deleteError.usedIn.map((u, idx) => (
                  <div key={idx}>• {u.eventName} (Round {u.roundNumber})</div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteError(null)}
                className="px-4 py-2 rounded-lg bg-[#171B21] hover:bg-[#252A31] text-[#F3F4F6] text-xs font-medium border border-[#252A31] transition-colors cursor-pointer"
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
