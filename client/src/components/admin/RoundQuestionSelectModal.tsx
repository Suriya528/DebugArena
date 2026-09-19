import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Search,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Trash2,
  Lock
} from 'lucide-react';
import { DynamicRound, QuestionTemplate } from '../../types/index.js';
import { getQuestionBank, getQuestionsByIds, updateRoundQuestions } from '../../services/api.js';

interface RoundQuestionSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: DynamicRound;
  eventId: string;
  onSaved: (updatedRound: DynamicRound) => void;
}

export const RoundQuestionSelectModal: React.FC<RoundQuestionSelectModalProps> = ({
  isOpen,
  onClose,
  round,
  eventId,
  onSaved
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'browse' | 'review'>('browse');

  // Persistent Selected Questions State across pages/filters
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMap, setSelectedMap] = useState<Map<string, QuestionTemplate>>(new Map());

  // Pagination & Filters for Bank browsing
  const [questions, setQuestions] = useState<QuestionTemplate[]>([]);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalMatching, setTotalMatching] = useState<number>(0);
  const [grandTotalType, setGrandTotalType] = useState<number>(0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);

  // Expanded items for previewing prompt/code
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Loading & Saving States
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requiredCount = round.questionCount || (round.type === 'mcq' ? 10 : 3);
  const selectedCount = selectedIds.length;
  const isComplete = selectedCount === requiredCount;
  const missingCount = Math.max(0, requiredCount - selectedCount);

  // Ref to track latest selected IDs without triggering fetchBankQuestions
  const selectedIdsRef = useRef<string[]>(selectedIds);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  // Track initialization to avoid wiping local selections on parent re-renders
  const lastRoundKeyRef = useRef<string | null>(null);

  // Initialize selected IDs and load initial question data when modal opens
  useEffect(() => {
    if (!isOpen) {
      lastRoundKeyRef.current = null;
      return;
    }

    const currentRoundKey = `${round._id || ''}_${round.roundNumber}`;
    if (lastRoundKeyRef.current === currentRoundKey) {
      return;
    }
    lastRoundKeyRef.current = currentRoundKey;

    const initialIds = Array.isArray(round.selectedQuestionIds)
      ? round.selectedQuestionIds.map(id => id.toString())
      : [];

    setSelectedIds(initialIds);
    setErrorMessage(null);
    setPage(1);
    setSearchQuery('');
    setDifficultyFilter('');
    setTopicFilter('');
    setActiveSubTab('browse');

    // If there are existing selected IDs, fetch their full objects for the review drawer
    if (initialIds.length > 0) {
      getQuestionsByIds(initialIds)
        .then((res: any) => {
          const map = new Map<string, QuestionTemplate>();
          if (Array.isArray(res.questions)) {
            res.questions.forEach((q: QuestionTemplate) => map.set(q._id.toString(), q));
          }
          setSelectedMap(map);
        })
        .catch(err => {
          console.warn('Failed to pre-fetch selected questions details:', err);
        });
    } else {
      setSelectedMap(new Map());
    }
  }, [isOpen, round._id, round.roundNumber, round.selectedQuestionIds]);

  // Fetch paginated bank questions matching round type
  const fetchBankQuestions = useCallback(async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      setErrorMessage(null);

      // Unified coding type: Coding rounds accept both standard & debug coding problems
      let queryType = round.type;
      if (round.type === 'mcq') queryType = 'mcq';
      else if (round.type === 'coding' || round.type === 'debugging') queryType = 'coding';
      else if (round.type === 'sql') queryType = 'sql';

      const res = await getQuestionBank({
        page,
        limit,
        type: queryType,
        difficulty: difficultyFilter || undefined,
        topic: topicFilter || undefined,
        search: searchQuery.trim() || undefined,
        targetEventId: eventId,
        currentRoundNumber: round.roundNumber
      });

      setQuestions(res.questions || []);
      setTotalPages(res.totalPages || 1);
      setTotalMatching(res.totalCount || 0);
      setGrandTotalType(res.countsByType?.[queryType] || res.totalCount || 0);
      if (res.topics) setAvailableTopics(res.topics);

      // Hydrate selectedMap with full objects from fetched questions without triggering refetch
      setSelectedMap(prev => {
        const next = new Map(prev);
        if (Array.isArray(res.questions)) {
          res.questions.forEach((q: QuestionTemplate) => {
            const qid = q._id.toString();
            if (selectedIdsRef.current.includes(qid)) {
              next.set(qid, q);
            }
          });
        }
        return next;
      });
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to load questions from Question Bank');
    } finally {
      setLoading(false);
    }
  }, [isOpen, page, limit, round.type, round.roundNumber, difficultyFilter, topicFilter, searchQuery, eventId]);

  useEffect(() => {
    fetchBankQuestions();
  }, [fetchBankQuestions]);

  // Toggle question selection
  const handleToggleSelect = (question: QuestionTemplate) => {
    const qid = question._id.toString();
    const isCurrentlySelected = selectedIds.includes(qid);

    if (isCurrentlySelected) {
      setSelectedIds(prev => prev.filter(id => id !== qid));
      setSelectedMap(prev => {
        const next = new Map(prev);
        next.delete(qid);
        return next;
      });
    } else {
      if (selectedIds.length >= requiredCount) {
        return;
      }
      setSelectedIds(prev => [...prev, qid]);
      setSelectedMap(prev => {
        const next = new Map(prev);
        next.set(qid, question);
        return next;
      });
    }
  };

  // Remove question from review drawer
  const handleRemoveFromReview = (qid: string) => {
    setSelectedIds(prev => prev.filter(id => id !== qid));
    setSelectedMap(prev => {
      const next = new Map(prev);
      next.delete(qid);
      return next;
    });
  };

  // Save selected questions
  const handleSave = async () => {
    if (selectedIds.length !== requiredCount) {
      setErrorMessage(`Please select exactly ${requiredCount} questions. Currently ${selectedIds.length} selected.`);
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);
      const res = await updateRoundQuestions(eventId, round.roundNumber, selectedIds);
      if (res.success) {
        onSaved({
          ...round,
          selectedQuestionIds: selectedIds,
          assignedQuestionCount: selectedIds.length,
          targetQuestionCount: requiredCount,
          missingQuestionCount: 0,
          isQuestionReady: true
        });
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to save question selection for this round');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Strip */}
        <div className="p-5 sm:p-6 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                R{round.roundNumber}
              </span>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                SELECT QUESTIONS FOR ROUND {round.roundNumber}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {round.type === 'debugging' ? 'CODING' : round.type}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {round.title} • Target Quota: <strong className="text-white">{requiredCount} questions</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors self-end sm:self-auto cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counter & Status Bar */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Live Quota Pill */}
            <div
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-2 transition-all ${
                isComplete
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm shadow-amber-500/20'
              }`}
            >
              {isComplete ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>✓ {selectedCount} / {requiredCount} SELECTED (READY)</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>
                    SELECTED: {selectedCount} / {requiredCount} — ({missingCount} more required)
                  </span>
                </>
              )}
            </div>

            {/* Sub-tab Switcher: Browse vs Selected Review */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveSubTab('browse')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'browse'
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Browse Bank ({totalMatching})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('review')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeSubTab === 'review'
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Selected Review</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  isComplete ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-amber-300'
                }`}>
                  {selectedCount}
                </span>
              </button>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {round.type === 'mcq' && 'Single-choice question library'}
            {(round.type === 'coding' || round.type === 'debugging') && 'Algorithmic code & debugging assessment library'}
            {round.type === 'sql' && 'Database queries library'}
          </div>
        </div>

        {/* Shortage Error Banner (if bank has fewer questions than required) */}
        {grandTotalType > 0 && grandTotalType < requiredCount && (
          <div className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-200">Insufficient Questions in Master Question Bank:</strong>
              <p className="mt-0.5 text-rose-300/90 leading-relaxed">
                This round requires <strong>{requiredCount} {round.type === 'debugging' ? 'CODING' : round.type.toUpperCase()}</strong> questions, but only <strong>{grandTotalType}</strong> questions of this type exist in the Master Question Bank. Please create or import more questions in the Master Question Bank before finalizing this round.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic API Error Banner */}
        {errorMessage && (
          <div className="mx-5 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {activeSubTab === 'browse' ? (
            <>
              {/* Search and Filters Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pb-2 border-b border-slate-800/80">
                {/* Search box */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder={`Search ${round.type.toUpperCase()} questions by title, prompt, topic...`}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={difficultyFilter}
                    onChange={e => {
                      setDifficultyFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">All Difficulties</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>

                  {availableTopics.length > 0 && (
                    <select
                      value={topicFilter}
                      onChange={e => {
                        setTopicFilter(e.target.value);
                        setPage(1);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer max-w-[160px]"
                    >
                      <option value="">All Topics</option>
                      {availableTopics.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  )}

                  <select
                    value={limit}
                    onChange={e => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                  </select>
                </div>
              </div>

              {/* Questions List */}
              {loading ? (
                <div className="py-16 text-center text-xs font-mono text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <div>Loading questions from Master Question Bank...</div>
                </div>
              ) : questions.length === 0 ? (
                <div className="py-16 text-center text-xs font-mono text-slate-500 space-y-2">
                  <HelpCircle className="w-8 h-8 mx-auto text-slate-600" />
                  <div>No {round.type.toUpperCase()} questions matched the active search or filters.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map(q => {
                    const qid = q._id.toString();
                    const isSelected = selectedIds.includes(qid);
                    const isAssignedOtherRound = Boolean(q.isUsedInTargetEventOtherRound);
                    const isMaxReached = selectedCount >= requiredCount && !isSelected;
                    const isDisabled = isAssignedOtherRound || isMaxReached;

                    return (
                      <div
                        key={qid}
                        className={`p-4 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-950/20 border-indigo-500/50 shadow-md shadow-indigo-950/20'
                            : isAssignedOtherRound
                            ? 'bg-slate-950/30 border-slate-800/40 opacity-60'
                            : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Checkbox */}
                          <div className="pt-0.5 shrink-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => handleToggleSelect(q)}
                              className={`w-4 h-4 rounded cursor-pointer transition-all ${
                                isSelected ? 'accent-indigo-600' : 'cursor-pointer'
                              } ${isDisabled ? 'cursor-not-allowed opacity-40' : ''}`}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1.5 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className="font-bold text-white text-sm hover:text-indigo-300 transition-colors cursor-pointer"
                                onClick={() => !isDisabled && handleToggleSelect(q)}
                              >
                                {q.title}
                              </span>

                              {/* Unified Type & Mode Badges */}
                              {(q.type === 'coding' || q.type === 'debugging') && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                  CODING
                                </span>
                              )}
                              {(q.codingMode === 'debug' || q.type === 'debugging') && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20">
                                  DEBUG
                                </span>
                              )}
                              {q.type === 'mcq' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                  MCQ
                                </span>
                              )}
                              {q.type === 'sql' && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  SQL
                                </span>
                              )}

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

                              {/* Cross-round duplication badge */}
                              {isAssignedOtherRound && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Already assigned to Round {q.targetEventOtherRoundNumber}
                                </span>
                              )}

                              {/* Global Event Usage Tag */}
                              {q.usedInEvents && q.usedInEvents.length > 0 && (
                                <span className="text-[10px] font-mono text-cyan-400/90 px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                                  Used in {q.usedInEvents.length} event(s)
                                </span>
                              )}
                            </div>

                            {/* Prompt snippet */}
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-sans">
                              {q.prompt?.replace(/[#*`]/g, '')}
                            </p>

                            {/* Expandable Preview Toggle */}
                            <button
                              type="button"
                              onClick={() => setExpandedId(expandedId === qid ? null : qid)}
                              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono pt-1 cursor-pointer"
                            >
                              {expandedId === qid ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              <span>{expandedId === qid ? 'Hide Details' : 'Preview Details'}</span>
                            </button>

                            {/* Expanded Details Preview */}
                            {expandedId === qid && (
                              <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono">
                                <div>
                                  <strong className="text-slate-300">Prompt:</strong>
                                  <div className="p-2.5 rounded bg-slate-950 mt-1 whitespace-pre-wrap text-slate-300 font-sans text-xs border border-slate-800">
                                    {q.prompt}
                                  </div>
                                </div>

                                {q.options && q.options.length > 0 && (
                                  <div className="space-y-1">
                                    <strong className="text-slate-300">Options:</strong>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                      {q.options.map((opt, oIdx) => (
                                        <div
                                          key={oIdx}
                                          className={`p-2 rounded border text-xs ${
                                            opt.isCorrect
                                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                                              : 'bg-slate-950 border-slate-800 text-slate-400'
                                          }`}
                                        >
                                          {opt.isCorrect && '✓ '}
                                          {opt.text}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {q.testCases && q.testCases.length > 0 && (
                                  <div>
                                    <strong className="text-slate-300">Test Cases: {q.testCases.length}</strong>
                                    <div className="mt-1 space-y-1">
                                      {q.testCases.slice(0, 2).map((tc, tcIdx) => (
                                        <div key={tcIdx} className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                                          <span>Input: {tc.input || '(empty)'}</span> → <span>Output: {tc.output}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-800 font-mono text-xs">
                  <div className="text-slate-400">
                    Page {page} of {totalPages} ({totalMatching} total)
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
                            page === pageNum
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800/80 text-slate-400 hover:text-white'
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
            </>
          ) : (
            /* Selected Questions Review Drawer (Inspection across all pages) */
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  Reviewing all {selectedCount} questions selected across pages for this round.
                </span>
                {selectedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Clear all selected questions for this round?')) {
                        setSelectedIds([]);
                        setSelectedMap(new Map());
                      }
                    }}
                    className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {selectedCount === 0 ? (
                <div className="py-16 text-center text-xs font-mono text-slate-500 space-y-2">
                  <Layers className="w-8 h-8 mx-auto text-slate-600" />
                  <div>No questions have been selected yet.</div>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('browse')}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    Browse Question Bank
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedIds.map((qid, idx) => {
                    const q = selectedMap.get(qid);
                    return (
                      <div
                        key={qid}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/30 flex items-center justify-between gap-3 text-left font-mono text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-bold text-white truncate text-xs">
                              {q?.title || `Question ID: ${qid}`}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              {(q?.codingMode === 'debug' || q?.type === 'debugging') && (
                                <span className="uppercase text-fuchsia-400 font-bold">DEBUG</span>
                              )}
                              {q?.difficulty && (
                                <span className="uppercase text-amber-400">{q.difficulty}</span>
                              )}
                              {q?.topic && (
                                <>
                                  <span>•</span>
                                  <span>{q.topic}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromReview(qid)}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                          title="Remove from round"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-mono text-slate-400">
            {isComplete ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                Quota satisfied: {selectedCount} of {requiredCount} questions configured.
              </span>
            ) : (
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Incomplete configuration: {missingCount} more question{missingCount === 1 ? '' : 's'} required.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isComplete || saving}
              onClick={handleSave}
              className={`px-5 py-2 rounded-xl font-mono text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Selection'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
