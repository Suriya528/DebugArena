import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  CheckSquare,
  Square,
  ArrowRight,
  UserCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  Zap,
  Sparkles,
  Download,
  Search,
  Layers,
  Trophy,
  CheckCircle2,
  XCircle,
  FileQuestion,
  Code,
  Terminal,
  Database,
  Send,
  Save,
  AlertTriangle
} from 'lucide-react';
import { RoundResultRow, DynamicRound } from '../../types/index.js';
import { api, autoAdvanceParticipants, saveRoundResultsDraft, publishRoundResults } from '../../services/api.js';

interface RoundResultsViewProps {
  eventId?: string;
  rounds?: DynamicRound[];
  onNavigateToStandings?: () => void;
}

export const RoundResultsView: React.FC<RoundResultsViewProps> = ({
  eventId,
  rounds: propRounds,
  onNavigateToStandings
}) => {
  const [eventRounds, setEventRounds] = useState<DynamicRound[]>(propRounds || []);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [results, setResults] = useState<RoundResultRow[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  const [quota, setQuota] = useState<number>(15);
  const [tieStrategy, setTieStrategy] = useState<'expand' | 'strict'>('expand');
  const [advancementSummary, setAdvancementSummary] = useState<string | null>(null);
  const [roundMeta, setRoundMeta] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'advanced' | 'eliminated' | 'submitted'>('all');
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState<boolean>(false);
  const [resultsMeta, setResultsMeta] = useState<{
    isRoundEnded?: boolean;
    endedAt?: string | null;
    isReadyForPublication?: boolean;
    readyForPublicationAt?: string | null;
    publishedCount?: number;
    draftSelectedCount?: number;
    draftNotSelectedCount?: number;
  } | null>(null);

  // Keep eventRounds in sync with props and clamp selectedRound
  useEffect(() => {
    if (propRounds && propRounds.length > 0) {
      setEventRounds(propRounds);
      if (!propRounds.some(r => r.roundNumber === selectedRound)) {
        setSelectedRound(propRounds[0].roundNumber || 1);
      }
    }
  }, [propRounds, eventId]);

  const fetchResults = async (targetRound = selectedRound) => {
    try {
      setLoading(true);
      const url = eventId
        ? `/admin/rounds/${targetRound}/results?eventId=${encodeURIComponent(eventId)}`
        : `/admin/rounds/${targetRound}/results`;
      const res = await api.get(url);
      setResults(res.data.results || []);
      setRoundMeta(res.data.roundMeta || null);
      setResultsMeta(res.data.meta || null);

      if (res.data.rounds && res.data.rounds.length > 0) {
        setEventRounds(res.data.rounds);
        if (!res.data.rounds.some((r: any) => r.roundNumber === targetRound)) {
          setSelectedRound(res.data.rounds[0].roundNumber || 1);
        }
      }

      // Pre-select already advanced or draft/published selected users if any
      const alreadyAdvanced = new Set<string>();
      (res.data.results || []).forEach((r: RoundResultRow) => {
        if ((r.status === 'advanced' || r.selectionStatus === 'SELECTED' || r.draftSelection === 'SELECTED') && r.userId?._id) {
          alreadyAdvanced.add(r.userId._id);
        }
      });
      setSelectedUserIds(alreadyAdvanced);
    } catch (err) {
      console.error('Failed to load round results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Determine configured quota and tie strategy for this round
    const currentRoundConfig = eventRounds.find(r => r.roundNumber === selectedRound);
    if (currentRoundConfig?.advancementQuota && currentRoundConfig.advancementQuota > 0) {
      setQuota(currentRoundConfig.advancementQuota);
    } else {
      setQuota(selectedRound === 1 ? 15 : selectedRound === 2 ? 10 : 5);
    }

    if (currentRoundConfig?.tieResolutionStrategy === 'strict') {
      setTieStrategy('strict');
    } else {
      setTieStrategy('expand');
    }

    setAdvancementSummary(null);
    fetchResults(selectedRound);
  }, [selectedRound, eventId, eventRounds.length]);

  // Round Navigation metadata
  const currentRound = eventRounds.find(r => r.roundNumber === selectedRound) || roundMeta;
  const isFinalStage = eventRounds.length > 0
    ? selectedRound >= eventRounds.length
    : selectedRound >= 3;
  const nextRound = eventRounds.find(r => r.roundNumber === selectedRound + 1);

  const getRoundTypeBadge = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'mcq':
      case 'aptitude':
        return {
          label: 'MCQ Quiz',
          color: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
          icon: FileQuestion
        };
      case 'coding':
        return {
          label: 'Live Coding',
          color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: Code
        };
      case 'debugging':
        return {
          label: 'Code Debugging',
          color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
          icon: Terminal
        };
      case 'sql':
        return {
          label: 'Database SQL',
          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: Database
        };
      default:
        return {
          label: type?.toUpperCase() || 'ASSESSMENT',
          color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
          icon: Layers
        };
    }
  };

  // Filtered Results
  const filteredResults = useMemo(() => {
    return results.filter(row => {
      const name = row.userId?.name?.toLowerCase() || '';
      const username = row.userId?.username?.toLowerCase() || '';
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || username.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'advanced') return row.status === 'advanced';
      if (statusFilter === 'eliminated') return row.status === 'eliminated';
      if (statusFilter === 'submitted') return row.status === 'submitted' || !row.status;
      return true;
    });
  }, [results, searchTerm, statusFilter]);

  // Current Stage Statistics
  const stats = useMemo(() => {
    const total = results.length;
    const advanced = results.filter(r => r.status === 'advanced').length;
    const eliminated = results.filter(r => r.status === 'eliminated').length;
    const scores = results.map(r => r.totalScore || 0);
    const avgScore = total > 0 ? (scores.reduce((a, b) => a + b, 0) / total).toFixed(1) : '0';
    const topScore = scores.length > 0 ? Math.max(...scores) : 0;
    return { total, advanced, eliminated, avgScore, topScore };
  }, [results]);

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const selectTopN = (n: number) => {
    const topIds = filteredResults.slice(0, n).map(r => r.userId?._id).filter(Boolean);
    setSelectedUserIds(new Set(topIds));
  };

  const selectAllFiltered = () => {
    const allIds = filteredResults.map(r => r.userId?._id).filter(Boolean);
    setSelectedUserIds(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  // Automated Cutoff Advancement
  const handleAutoAdvanceByQuota = async () => {
    if (results.length === 0) {
      alert('No participants found in this stage to advance.');
      return;
    }

    const nextStageName = nextRound?.title ? `Stage ${selectedRound + 1} (${nextRound.title})` : `Stage ${selectedRound + 1}`;

    if (
      !confirm(
        `Execute Auto-Advancement for Stage ${selectedRound} (${currentRound?.title || 'Current Stage'})?\n\n` +
        `• Target Quota: Top ${quota} participants\n` +
        `• Destination: ${nextStageName}\n` +
        `• Ranking: Score (High to Low) -> Time (Fastest) -> Anti-Cheat Strikes\n` +
        `• Tie-Break Rule: ${tieStrategy === 'expand' ? 'Expand Cutoff (Fairness)' : 'Strict Slicing'}\n\n` +
        `Top candidates will be marked ADVANCED and all remaining participants in this stage will be marked ELIMINATED.`
      )
    ) {
      return;
    }

    setIsAdvancing(true);
    try {
      const data = await autoAdvanceParticipants(selectedRound, {
        quota,
        tieStrategy,
        eventId
      });
      setAdvancementSummary(data.message);
      alert(data.message || 'Auto-advancement successfully executed!');
      await fetchResults();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to auto-advance participants');
    } finally {
      setIsAdvancing(false);
    }
  };

  // Manual Selection Advancement
  const handleAdvance = async () => {
    const count = selectedUserIds.size;
    if (count === 0) {
      alert('Please select at least one participant using the checkboxes.');
      return;
    }

    const nextStageName = nextRound?.title ? `Stage ${selectedRound + 1} (${nextRound.title})` : `Stage ${selectedRound + 1}`;

    if (
      !confirm(
        `Advance ${count} selected participant(s) to ${nextStageName}?\n\n` +
        `All other participants in this stage who are not selected will be marked ELIMINATED.`
      )
    ) {
      return;
    }

    setIsAdvancing(true);
    try {
      const res = await api.post(`/admin/rounds/${selectedRound}/advance`, {
        participantIds: Array.from(selectedUserIds),
        eventId
      });
      alert(res.data.message || 'Advancement completed!');
      await fetchResults();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to advance participants');
    } finally {
      setIsAdvancing(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (results.length === 0) return;
    const stageTitle = currentRound?.title || `Stage_${selectedRound}`;
    const headers = ['Rank', 'Name', 'Username', 'Score', 'Time (Seconds)', 'Status', 'Strikes', 'Submitted At'];
    const csvRows = [
      headers.join(','),
      ...results.map(r => [
        r.rank,
        `"${(r.userId?.name || '').replace(/"/g, '""')}"`,
        `"${(r.userId?.username || '').replace(/"/g, '""')}"`,
        r.totalScore,
        r.timeTakenSeconds,
        r.status || 'submitted',
        r.violationCount || 0,
        r.submittedAt ? new Date(r.submittedAt).toLocaleString() : 'In Progress'
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Stage_${selectedRound}_${stageTitle.replace(/\s+/g, '_')}_Results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Draft: Persist selection decisions privately (participants cannot see)
  const handleSaveDraft = async () => {
    if (selectedUserIds.size === 0) {
      alert('Please select at least one participant before saving draft.');
      return;
    }
    setIsSavingDraft(true);
    try {
      // Mark selected as SELECTED, all others as NOT_SELECTED
      const selections = results.map(r => ({
        participantId: r.userId._id,
        selection: selectedUserIds.has(r.userId._id) ? 'SELECTED' as const : 'NOT_SELECTED' as const
      }));
      await saveRoundResultsDraft(selectedRound, selections, eventId);
      alert(`Draft saved! ${selectedUserIds.size} selected, ${results.length - selectedUserIds.size} not selected.`);
      await fetchResults();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save draft selections.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Publish Results: Make results visible to participants
  const handlePublishResults = async () => {
    setShowPublishConfirm(false);
    setIsPublishing(true);
    try {
      const selections = results.map(r => ({
        participantId: r.userId._id,
        selection: selectedUserIds.has(r.userId._id) ? ('SELECTED' as const) : ('NOT_SELECTED' as const)
      }));
      const data = await publishRoundResults(selectedRound, eventId, selections);
      alert(data.message || 'Results published successfully! Participants can now see their selection status.');
      await fetchResults();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to publish results.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Build rounds list for tabs
  const displayRounds = eventRounds.length > 0
    ? eventRounds
    : (propRounds && propRounds.length > 0)
    ? propRounds
    : (!eventId
        ? [
            { roundNumber: 1, title: 'Round 1 (MCQ)', type: 'mcq' },
            { roundNumber: 2, title: 'Round 2 (Code)', type: 'coding' },
            { roundNumber: 3, title: 'Round 3 (Final)', type: 'coding' }
          ]
        : []);

  const currentTypeBadge = getRoundTypeBadge(currentRound?.type);
  const CurrentTypeIcon = currentTypeBadge.icon;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Dynamic Stage Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-2.5 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          {displayRounds.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 font-mono flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Loading tournament stages...</span>
            </div>
          ) : (
            displayRounds.map((r: any) => {
              const isSelected = selectedRound === r.roundNumber;
              const badge = getRoundTypeBadge(r.type);
              const isFinal = eventRounds.length > 0
                ? r.roundNumber === eventRounds.length
                : r.roundNumber === 3;

              return (
                <button
                  key={r.roundNumber}
                  onClick={() => setSelectedRound(r.roundNumber)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/30 font-extrabold'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono">Stage {r.roundNumber}</span>
                  <span className="hidden sm:inline font-sans text-[11px] opacity-90 max-w-[140px] truncate">
                    {r.title || `Round ${r.roundNumber}`}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-mono font-bold ${badge.color}`}>
                    {r.type || 'Stage'}
                  </span>
                  {isFinal && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Final
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={results.length === 0}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors border border-slate-700"
            title="Export this round's results to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={() => fetchResults(selectedRound)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer border border-indigo-500/30 transition-colors"
            title="Refresh participant standings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stage Detail Overview Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Stage {selectedRound} of {eventRounds.length || 3}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1.5 border ${currentTypeBadge.color}`}>
                <CurrentTypeIcon className="w-3 h-3" />
                <span>{currentTypeBadge.label}</span>
              </span>
              {currentRound?.durationMinutes && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-800 border border-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{currentRound.durationMinutes} Minutes</span>
                </span>
              )}
              {isFinalStage && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>Championship Final Stage</span>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>{currentRound?.title || `Round ${selectedRound}`}</span>
            </h2>
            {currentRound?.description && (
              <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                {currentRound.description}
              </p>
            )}
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono shrink-0">
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Evaluated</div>
              <div className="text-lg font-black text-white">{stats.total}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center">
              <div className="text-[10px] text-emerald-400 uppercase font-bold">Advanced</div>
              <div className="text-lg font-black text-emerald-300">{stats.advanced}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-center">
              <div className="text-[10px] text-rose-400 uppercase font-bold">Eliminated</div>
              <div className="text-lg font-black text-rose-300">{stats.eliminated}</div>
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <div className="text-[10px] text-amber-400 uppercase font-bold">Avg / Top Score</div>
              <div className="text-sm font-black text-white mt-1">
                {stats.avgScore} <span className="text-[10px] text-slate-500">/ {stats.topScore}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result Publication & Participant Announcement Workflow Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        {/* Preparation Window Countdown Banner */}
        {resultsMeta?.isRoundEnded && !resultsMeta?.isReadyForPublication && resultsMeta?.readyForPublicationAt && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
            <div>
              <span className="font-bold">2-Minute Finalization Window Active:</span> Round submissions are being finalized. Coordinator review active until{' '}
              <span className="font-mono font-bold text-white">{new Date(resultsMeta.readyForPublicationAt).toLocaleTimeString()}</span>.
            </div>
          </div>
        )}

        {/* Results Published Notification */}
        {resultsMeta?.publishedCount && resultsMeta.publishedCount > 0 ? (
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Official Results Published:</strong> Stage {selectedRound} outcomes have been published to participants ({resultsMeta.publishedCount} evaluated). Participants can now view their selection status.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              Live to Participants
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-slate-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Results Not Published Yet:</strong> Participants currently see <em>"Submission received. Results will be announced by the organizer."</em>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
              Draft Mode
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Selection Decision:</span>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {selectedUserIds.size} Selected
            </span>
            <span className="text-xs font-mono text-rose-400 font-bold bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-500/20">
              {results.length - selectedUserIds.size} Not Selected
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={results.length === 0 || isSavingDraft}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              title="Save current selections privately as draft (participants will not see results yet)"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingDraft ? 'Saving Draft...' : 'Save Draft'}</span>
            </button>

            <button
              onClick={() => setShowPublishConfirm(true)}
              disabled={results.length === 0 || isPublishing || resultsMeta?.isRoundEnded === false}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-40 transition-all"
              title={resultsMeta?.isRoundEnded === false ? 'Round must end before publishing results' : 'Publish official results to participants'}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isPublishing
                  ? 'Publishing...'
                  : resultsMeta?.publishedCount && resultsMeta.publishedCount > 0
                  ? 'Re-Publish Results'
                  : 'Publish Results'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Final Stage Banner OR Next Stage Advancement Controls */}
      {isFinalStage ? (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-indigo-950/30 border border-amber-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Final Championship Determination Stage</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold bg-amber-500/20 text-amber-300">
                  Podium Standings
                </span>
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                This is the culminating round of the tournament. The rankings below determine the final tournament winners and champion podium spots. No further stage advancement is required.
              </p>
            </div>
          </div>

          {onNavigateToStandings && (
            <button
              onClick={onNavigateToStandings}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-slate-950 text-xs font-black font-mono flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer shrink-0 transition-all"
            >
              <span>View Overall Tournament Standings</span>
              <ArrowRight className="w-4 h-4 text-slate-950" />
            </button>
          )}
        </div>
      ) : (
        /* Intermediate Stage Advancement Toolbar */
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Automated Advancement Quota */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-950/80 p-2.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Zap className="w-4 h-4 fill-amber-400" />
                <span>Advancement Quota:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={quota}
                  onChange={e => setQuota(parseInt(e.target.value, 10) || 1)}
                  className="w-16 bg-slate-900 border border-amber-500/40 rounded-lg px-2 py-1 text-xs text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400"
                />
                <span className="text-xs text-slate-400 font-semibold">candidates</span>
              </div>
              <select
                value={tieStrategy}
                onChange={e => setTieStrategy(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="expand">Fairness: Expand on Tie</option>
                <option value="strict">Strict Slicing</option>
              </select>

              <button
                onClick={handleAutoAdvanceByQuota}
                disabled={results.length === 0 || isAdvancing}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-black" />
                <span>
                  ⚡ Auto-Advance Top {quota} to Stage {selectedRound + 1}
                  {nextRound?.title ? ` (${nextRound.title})` : ''}
                </span>
              </button>
            </div>

            {/* Manual Selection Fallback */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-1">Quick Select:</span>
              {[quota, 5, 10, 15].filter((v, i, a) => a.indexOf(v) === i && v > 0).map(n => (
                <button
                  key={n}
                  onClick={() => selectTopN(n)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                >
                  Top {n}
                </button>
              ))}
              <button
                onClick={selectAllFiltered}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-700"
              >
                All Filtered
              </button>
              <button
                onClick={clearSelection}
                className="px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
              >
                Clear
              </button>

              <button
                onClick={handleAdvance}
                disabled={selectedUserIds.size === 0 || isAdvancing}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  Advance Selected ({selectedUserIds.size}) to Stage {selectedRound + 1}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {advancementSummary && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{advancementSummary}</span>
            </div>
          )}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Candidate Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate by name or @username..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold font-mono transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({results.length})
          </button>
          <button
            onClick={() => setStatusFilter('advanced')}
            className={`px-3 py-1.5 rounded-xl font-bold font-mono transition-all cursor-pointer ${
              statusFilter === 'advanced'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Advanced ({stats.advanced})
          </button>
          <button
            onClick={() => setStatusFilter('eliminated')}
            className={`px-3 py-1.5 rounded-xl font-bold font-mono transition-all cursor-pointer ${
              statusFilter === 'eliminated'
                ? 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Eliminated ({stats.eliminated})
          </button>
          <button
            onClick={() => setStatusFilter('submitted')}
            className={`px-3 py-1.5 rounded-xl font-bold font-mono transition-all cursor-pointer ${
              statusFilter === 'submitted'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pending / In Review
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                {!isFinalStage && <th className="p-4 w-12 text-center">Select</th>}
                <th className="p-4 w-16">Rank</th>
                <th className="p-4">Candidate / Team</th>
                <th className="p-4">Stage Score</th>
                <th className="p-4">Time Taken</th>
                <th className="p-4">Status</th>
                <th className="p-4">Violations</th>
                <th className="p-4">Submitted At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {loading ? (
                <tr>
                  <td colSpan={!isFinalStage ? 8 : 7} className="p-12 text-center text-slate-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span>Loading Stage {selectedRound} results...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={!isFinalStage ? 8 : 7} className="p-12 text-center text-slate-500 font-sans">
                    {searchTerm || statusFilter !== 'all' ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-400">No candidates match your filters.</p>
                        <button
                          onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                          className="text-xs text-indigo-400 underline cursor-pointer"
                        >
                          Clear filters
                        </button>
                      </div>
                    ) : (
                      `No participants have attempted or finished Stage ${selectedRound} (${currentRound?.title || 'Round ' + selectedRound}) yet.`
                    )}
                  </td>
                </tr>
              ) : (
                filteredResults.map((row, idx) => {
                  const uid = row.userId?._id;
                  const isChecked = selectedUserIds.has(uid);
                  const isCutoffPoint = !isFinalStage && idx === quota - 1 && filteredResults.length > quota;

                  return (
                    <React.Fragment key={uid || idx}>
                      <tr
                        className={`transition-colors ${
                          isChecked ? 'bg-indigo-950/30' : 'hover:bg-slate-800/40'
                        } ${row.userId?.isDisqualified ? 'opacity-60 bg-rose-950/10' : ''}`}
                      >
                        {!isFinalStage && (
                          <td className="p-4 text-center">
                            <button
                              onClick={() => toggleSelectUser(uid)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                              title={isChecked ? 'Deselect candidate' : 'Select candidate'}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        )}

                        <td className="p-4 font-bold text-white">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs ${
                              row.rank === 1
                                ? 'bg-amber-400 text-black font-extrabold shadow-md shadow-amber-400/20'
                                : row.rank === 2
                                ? 'bg-slate-300 text-black font-extrabold'
                                : row.rank === 3
                                ? 'bg-amber-700 text-white font-extrabold'
                                : 'text-slate-400 bg-slate-800/60'
                            }`}
                          >
                            {row.rank === 1 ? '👑 1' : row.rank === 2 ? '🥈 2' : row.rank === 3 ? '🥉 3' : row.rank}
                          </span>
                        </td>

                        <td className="p-4 font-sans">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{row.userId?.name || 'Unknown Candidate'}</span>
                            {row.userId?.isDisqualified && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                Disqualified
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{row.userId?.username || 'user'}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="text-emerald-400 font-black text-sm font-mono">
                            {row.totalScore} pts
                          </div>
                          {currentRound?.totalMarks ? (
                            <div className="text-[10px] text-slate-500 font-mono">
                              {Math.round(((row.totalScore || 0) / currentRound.totalMarks) * 100)}% of {currentRound.totalMarks} pts
                            </div>
                          ) : null}
                        </td>

                        <td className="p-4 text-slate-300">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {Math.floor(row.timeTakenSeconds / 60)}m {row.timeTakenSeconds % 60}s
                            </span>
                          </span>
                        </td>

                        <td className="p-4 space-y-1">
                          <div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 border ${
                                row.status === 'advanced'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                  : row.status === 'eliminated'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                  : row.status === 'submitted'
                                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              {row.status === 'advanced' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                              {row.status === 'eliminated' && <XCircle className="w-3 h-3 text-rose-400" />}
                              <span>
                                {row.status === 'advanced'
                                  ? `Advanced to Stage ${selectedRound + 1}`
                                  : row.status === 'eliminated'
                                  ? 'Eliminated'
                                  : row.status === 'submitted'
                                  ? 'Submitted'
                                  : 'In Progress'}
                              </span>
                            </span>
                          </div>
                          {row.isPublished ? (
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-flex items-center gap-1 border ${
                                  row.selectionStatus === 'SELECTED'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                }`}
                              >
                                {row.selectionStatus === 'SELECTED' ? '✓ Published: Selected' : '✗ Published: Not Selected'}
                              </span>
                            </div>
                          ) : row.draftSelection ? (
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase inline-flex items-center gap-1 border ${
                                  row.draftSelection === 'SELECTED'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-slate-700/50 text-slate-400 border-slate-600'
                                }`}
                              >
                                {row.draftSelection === 'SELECTED' ? 'Draft: Selected' : 'Draft: Not Selected'}
                              </span>
                            </div>
                          ) : null}
                        </td>

                        <td className="p-4">
                          {row.violationCount > 0 ? (
                            <span className="text-rose-400 flex items-center gap-1 font-bold">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              {row.violationCount} strikes
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono">0</span>
                          )}
                        </td>

                        <td className="p-4 text-slate-400 text-[11px]">
                          {row.submittedAt
                            ? new Date(row.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : 'In progress'}
                        </td>
                      </tr>

                      {/* Visual Cutoff Divider Line */}
                      {isCutoffPoint && (
                        <tr className="bg-gradient-to-r from-amber-950/80 via-emerald-950/90 to-amber-950/80 border-y-2 border-amber-500/70 shadow-lg">
                          <td colSpan={!isFinalStage ? 8 : 7} className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider text-amber-300 font-mono">
                              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <span>
                                --- ⚡ ADVANCEMENT CUTOFF: TOP {quota} TEAMS ADVANCE TO STAGE {selectedRound + 1}
                                {nextRound?.title ? ` (${nextRound.title})` : ''} ---
                              </span>
                              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Send className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Publish Stage {selectedRound} Results</h3>
                <p className="text-xs text-slate-400">This action will immediately make outcomes visible to participants.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Selected for Next Stage:</span>
                <span className="font-bold text-emerald-400">{selectedUserIds.size} candidates</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Not Selected (Eliminated):</span>
                <span className="font-bold text-rose-400">{results.length - selectedUserIds.size} candidates</span>
              </div>
              <div className="border-t border-slate-800 pt-2 text-[11px] text-slate-400 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Strict Privacy Rule: Participant scores, ranks, and percentages will <strong>NEVER</strong> be exposed to participants. Only the Selected/Not Selected status is visible.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublishResults}
                disabled={isPublishing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/30 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isPublishing ? 'Publishing...' : 'Confirm & Publish Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
