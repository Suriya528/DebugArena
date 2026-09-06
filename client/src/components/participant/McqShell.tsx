import React, { useState, useEffect } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Check, RotateCcw, Send, AlertCircle, HelpCircle } from 'lucide-react';
import { Question, Attempt } from '../../types/index.js';
import { api, queueOfflineUpdate, generateOperationId, getNextSeqId } from '../../services/api.js';
import { useDebouncedCallback } from '../../hooks/useDebounce.js';

interface McqShellProps {
  questions: Question[];
  roundNumber: number;
  initialAttempts: Attempt[];
  initialMarkedForReview: string[];
  onSubmitRound: () => void;
  isSubmitting?: boolean;
}

export const McqShell: React.FC<McqShellProps> = ({
  questions,
  roundNumber,
  initialAttempts,
  initialMarkedForReview,
  onSubmitRound,
  isSubmitting
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number | null>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Set<string>>(new Set());
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set(initialMarkedForReview));
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saved' | 'saving' | 'offline'>>({});
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);

  // Initialize from attempts on mount or refresh
  useEffect(() => {
    const answers: Record<string, number | null> = {};
    const visited = new Set<string>();

    initialAttempts.forEach(att => {
      if (att.selectedOption !== null && att.selectedOption !== undefined) {
        answers[att.questionId] = att.selectedOption;
      }
      visited.add(att.questionId);
    });

    if (questions.length > 0) {
      visited.add(questions[0]._id);
    }

    setSelectedAnswers(answers);
    setVisitedQuestions(visited);
    setMarkedForReview(new Set(initialMarkedForReview));
  }, [initialAttempts, initialMarkedForReview, questions]);

  const currentQ = questions[currentIndex];

  // Mark current as visited whenever index changes
  useEffect(() => {
    if (currentQ) {
      setVisitedQuestions(prev => new Set(prev).add(currentQ._id));
    }
  }, [currentIndex, currentQ]);

  // Debounced save to backend with idempotent operation tracking
  const debouncedSave = useDebouncedCallback(
    async (questionId: string, optionIndex: number | null) => {
      setSaveStatus(prev => ({ ...prev, [questionId]: 'saving' }));
      const opId = generateOperationId();
      const seq = getNextSeqId();
      try {
        await api.post('/participant/save-answer', {
          questionId,
          roundNumber,
          selectedOption: optionIndex,
          operationId: opId,
          seqId: seq,
          clientTimestamp: Date.now()
        });
        setSaveStatus(prev => ({ ...prev, [questionId]: 'saved' }));
      } catch (err) {
        console.warn('Network issue saving answer, queuing offline:', err);
        queueOfflineUpdate({
          questionId,
          roundNumber,
          selectedOption: optionIndex,
          timestamp: Date.now(),
          operationId: opId,
          seqId: seq
        });
        setSaveStatus(prev => ({ ...prev, [questionId]: 'offline' }));
      }
    },
    800
  );

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQ) return;
    const qId = currentQ._id;
    setSelectedAnswers(prev => ({ ...prev, [qId]: optionIndex }));
    debouncedSave(qId, optionIndex);
  };

  const handleClearOption = () => {
    if (!currentQ) return;
    const qId = currentQ._id;
    setSelectedAnswers(prev => ({ ...prev, [qId]: null }));
    debouncedSave(qId, null);
  };

  const toggleMarkForReview = async () => {
    if (!currentQ) return;
    const qId = currentQ._id;
    const nextMarked = !markedForReview.has(qId);

    setMarkedForReview(prev => {
      const copy = new Set(prev);
      if (nextMarked) copy.add(qId);
      else copy.delete(qId);
      return copy;
    });

    try {
      await api.post('/participant/mark-review', {
        questionId: qId,
        roundNumber,
        marked: nextMarked
      });
    } catch (e) {
      console.warn('Failed to update review flag on server');
    }
  };

  // Status counters
  const totalCount = questions.length;
  const answeredCount = Object.values(selectedAnswers).filter(val => val !== null && val !== undefined).length;
  const markedCount = markedForReview.size;
  const notAnsweredCount = totalCount - answeredCount;

  if (!currentQ) {
    return (
      <div className="text-center py-20 text-slate-400">
        No questions loaded for this round.
      </div>
    );
  }

  const isCurrentAnswered = selectedAnswers[currentQ._id] !== null && selectedAnswers[currentQ._id] !== undefined;
  const isCurrentMarked = markedForReview.has(currentQ._id);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main Question Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-xl backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Question {currentIndex + 1} of {totalCount}
                </span>
                <span className="text-[11px] text-emerald-400/80 font-mono">
                  (0 negative marks)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {saveStatus[currentQ._id] === 'saving' && (
                  <span className="text-xs text-amber-400 animate-pulse font-mono">Saving...</span>
                )}
                {saveStatus[currentQ._id] === 'saved' && (
                  <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
                {saveStatus[currentQ._id] === 'offline' && (
                  <span className="text-xs text-rose-400 font-mono">Queued offline</span>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div className="mb-8">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-4">
                {currentQ.title}
              </h2>
              <div className="text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-mono bg-slate-950/70 p-4 sm:p-5 rounded-2xl border border-slate-800">
                {currentQ.prompt}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-8">
              {(currentQ.options || []).map((opt, oIndex) => {
                const isSelected = selectedAnswers[currentQ._id] === oIndex;
                const optionLabel = String.fromCharCode(65 + oIndex); // A, B, C, D

                return (
                  <button
                    key={oIndex}
                    onClick={() => handleSelectOption(oIndex)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                        : 'bg-slate-800/50 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-indigo-500 text-white shadow'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {optionLabel}
                    </div>
                    <span className="text-sm sm:text-base pt-0.5 leading-snug font-sans">
                      {opt}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMarkForReview}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                    isCurrentMarked
                      ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isCurrentMarked ? 'fill-purple-400' : ''}`} />
                  <span>{isCurrentMarked ? 'Marked for Review' : 'Mark for Review'}</span>
                </button>

                {isCurrentAnswered && (
                  <button
                    onClick={handleClearOption}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    debouncedSave.flush();
                    setCurrentIndex(prev => Math.max(0, prev - 1));
                  }}
                  disabled={currentIndex === 0}
                  className="p-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {currentIndex < totalCount - 1 ? (
                  <button
                    onClick={() => {
                      debouncedSave.flush();
                      setCurrentIndex(prev => Math.min(totalCount - 1, prev + 1));
                    }}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <span>Next Question</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      debouncedSave.flush();
                      setShowSubmitModal(true);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Review & Submit</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right / Question Navigator Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl backdrop-blur-md sticky top-24">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Question Palette</span>
              <span className="text-xs text-slate-400 font-mono">{currentIndex + 1}/{totalCount}</span>
            </h3>

            {/* Status Legend */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-6 p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-emerald-500 flex items-center justify-center text-[9px] text-white font-bold">✓</div>
                <span className="text-slate-300">Answered ({answeredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-slate-700 border border-slate-600" />
                <span className="text-slate-300">Unanswered ({notAnsweredCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md bg-purple-500/20 border border-purple-500 flex items-center justify-center">
                  <Bookmark className="w-2.5 h-2.5 text-purple-400 fill-purple-400" />
                </div>
                <span className="text-slate-300">Marked ({markedCount})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-md border-2 border-indigo-400 bg-indigo-500/30" />
                <span className="text-slate-300">Current</span>
              </div>
            </div>

            {/* Grid of question buttons */}
            <div className="grid grid-cols-5 gap-2.5 mb-6">
              {questions.map((q, idx) => {
                const isAns = selectedAnswers[q._id] !== null && selectedAnswers[q._id] !== undefined;
                const isMarked = markedForReview.has(q._id);
                const isCurrent = idx === currentIndex;
                const isVisited = visitedQuestions.has(q._id);

                let btnStyle = 'bg-slate-800/80 text-slate-400 border-slate-700'; // unvisited default
                if (isAns) {
                  btnStyle = 'bg-emerald-600 text-white border-emerald-500 font-bold shadow-sm shadow-emerald-900/40';
                } else if (isVisited) {
                  btnStyle = 'bg-amber-600/20 text-amber-300 border-amber-500/40';
                }

                return (
                  <button
                    key={q._id}
                    onClick={() => {
                      debouncedSave.flush();
                      setCurrentIndex(idx);
                    }}
                    className={`relative h-11 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer border ${btnStyle} ${
                      isCurrent ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 scale-105' : 'hover:scale-102'
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isMarked && (
                      <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-purple-500 flex items-center justify-center shadow">
                        <Bookmark className="w-2 h-2 text-white fill-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Submit Assessment Button */}
            <button
              onClick={() => {
                debouncedSave.flush();
                setShowSubmitModal(true);
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Submit Assessment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-indigo-400 mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <HelpCircle className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Submit Round 1?</h3>
                <p className="text-xs text-slate-400">Please review your question status before submitting.</p>
              </div>
            </div>

            <div className="space-y-2 mb-6 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                <span>Answered:</span>
                <span className="font-bold text-emerald-400">{answeredCount} of {totalCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800 text-slate-300">
                <span>Marked for Review:</span>
                <span className="font-bold text-purple-400">{markedCount}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-300">
                <span>Unanswered:</span>
                <span className="font-bold text-amber-400">{notAnsweredCount}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Once submitted, your responses will be locked and securely recorded on the server.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  debouncedSave.flush();
                  setShowSubmitModal(false);
                  onSubmitRound();
                }}
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
