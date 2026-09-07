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
  Award,
  CheckCircle2,
  RefreshCw,
  Calendar,
  ArrowRight,
  Filter,
  Check,
  Database,
  Pencil,
  Copy,
  X,
  FileCode,
  Eye,
  EyeOff
} from 'lucide-react';
import { Question, Event, DynamicRound } from '../../types/index.js';
import { api, getEvents, getEventDetails } from '../../services/api.js';
import { VariantPreviewModal } from './VariantPreviewModal.js';
import { AddQuestionModal } from './AddQuestionModal.js';
import { useAuth } from '../../context/AuthContext.js';

export const QuestionManager: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'round_questions' | 'question_bank'>('question_bank');

  // Event Selection & Multi-Round State
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [dynamicRounds, setDynamicRounds] = useState<DynamicRound[]>([]);
  const [roundQuestionCounts, setRoundQuestionCounts] = useState<Record<number, number>>({});

  // Round questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [seedingRound, setSeedingRound] = useState<boolean>(false);
  const [populatingAll, setPopulatingAll] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Question bank state & filters (Multiple choices, Coding, SQL, Debugging, Aptitude)
  const [bankQuestions, setBankQuestions] = useState<any[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [countsByType, setCountsByType] = useState<Record<string, number>>({});
  const [totalBankCount, setTotalBankCount] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [bankLoading, setBankLoading] = useState<boolean>(false);
  const [seedingBank, setSeedingBank] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null);
  const [activeCodeLangTab, setActiveCodeLangTab] = useState<Record<string, string>>({});
  const [directRoundTarget, setDirectRoundTarget] = useState<number | undefined>(undefined);

  // Modals & Notifications
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<{ id: string; title: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Live debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const toggleExpandBank = (id: string) => {
    setExpandedBankId(prev => (prev === id ? null : id));
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setDirectRoundTarget(undefined);
    setIsAddModalOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}" from the Question Bank?`)) return;
    try {
      await api.delete(`/admin/questions/bank/${templateId}`);
      setBankQuestions(prev => prev.filter(q => q._id !== templateId));
      setTotalBankCount(prev => Math.max(0, prev - 1));
      showToast(`Question "${title}" deleted from bank.`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to delete question template', 'error');
    }
  };

  const handleDuplicateTemplate = async (template: any) => {
    try {
      const duplicated = {
        title: `${template.title} (Copy)`,
        topic: template.topic,
        language: template.language,
        type: template.type,
        difficulty: template.difficulty,
        expectedSolveTimeMinutes: template.expectedSolveTimeMinutes,
        marks: template.marks,
        skillTags: template.skillTags,
        prompt: template.prompt,
        explanation: template.explanation,
        options: template.options,
        allowedLanguages: template.allowedLanguages,
        starterCode: template.starterCode,
        testCases: template.testCases,
        hasDnaMutation: template.hasDnaMutation,
        dnaConfig: template.dnaConfig
      };
      await api.post('/admin/questions/bank', duplicated);
      showToast(`Question duplicated as "${duplicated.title}"!`);
      await fetchQuestionBank();
    } catch (err: any) {
      showToast('Failed to duplicate question', 'error');
    }
  };

  // 1. Initial Load of Events
  const fetchEventsList = async () => {
    try {
      const fetchedEvents = await getEvents();
      setEvents(fetchedEvents || []);
      if (fetchedEvents && fetchedEvents.length > 0) {
        const initialId = selectedEventId || user?.eventId || fetchedEvents[0]._id;
        setSelectedEventId(initialId);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
    }
  };

  useEffect(() => {
    fetchEventsList();
  }, []);

  // 2. Fetch Event Details & Dynamic Rounds when selectedEventId changes
  useEffect(() => {
    if (!selectedEventId) return;
    const fetchDetails = async () => {
      try {
        const details = await getEventDetails(selectedEventId);
        setDynamicRounds(details.rounds || []);
      } catch (err) {
        console.error('Failed to load event details:', err);
      }
    };
    fetchDetails();
  }, [selectedEventId]);

  // 3. Fetch Round Questions
  const fetchRoundQuestions = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = { roundNumber: selectedRound };
      if (selectedEventId) params.eventId = selectedEventId;

      const res = await api.get('/admin/questions', { params });
      const qList: Question[] = res.data.questions || [];
      setQuestions(qList);

      // Update count for currently viewed round
      setRoundQuestionCounts(prev => ({
        ...prev,
        [selectedRound]: qList.length
      }));
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  // 4. Fetch Question Bank
  const fetchQuestionBank = async () => {
    try {
      setBankLoading(true);
      const params: Record<string, any> = {};
      if (selectedTopic) params.topic = selectedTopic;
      if (selectedDifficulty) params.difficulty = selectedDifficulty;
      if (selectedType) params.type = selectedType;
      if (selectedLanguage) params.language = selectedLanguage;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await api.get('/admin/questions/bank', { params });
      setBankQuestions(res.data.questions || []);
      setTopics(res.data.topics || []);
      if (res.data.languages) setAvailableLanguages(res.data.languages || []);
      if (res.data.countsByType) setCountsByType(res.data.countsByType || {});
      if (res.data.totalCount !== undefined) setTotalBankCount(res.data.totalCount);
    } catch (err) {
      console.error('Failed to load question bank:', err);
    } finally {
      setBankLoading(false);
    }
  };

  // View & Round Effect Triggers
  useEffect(() => {
    if (activeView === 'round_questions') {
      fetchRoundQuestions();
    } else {
      fetchQuestionBank();
    }
  }, [activeView, selectedRound, selectedEventId, selectedTopic, selectedDifficulty, selectedType, selectedLanguage, debouncedSearch]);

  // Seed single round questions
  const handleSeedRoundQuestions = async (roundNum: number = selectedRound) => {
    try {
      setSeedingRound(true);
      const res = await api.post('/admin/questions/seed-round', {
        roundNumber: roundNum,
        eventId: selectedEventId || undefined
      });
      showToast(`Successfully seeded ${res.data.count || 0} questions for Round ${roundNum === 99 ? 'Tie-Breaker' : roundNum}!`);
      await fetchRoundQuestions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to seed round questions', 'error');
    } finally {
      setSeedingRound(false);
    }
  };

  // Auto-populate entire event (All 4 rounds)
  const handlePopulateEntireEvent = async () => {
    if (!selectedEventId) {
      showToast('Please select an event first', 'error');
      return;
    }
    try {
      setPopulatingAll(true);
      const res = await api.post(`/admin/events/${selectedEventId}/populate-round-questions`);
      showToast(res.data.message || 'All round questions successfully populated!');
      await fetchRoundQuestions();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to populate event questions', 'error');
    } finally {
      setPopulatingAll(false);
    }
  };

  // Seed question bank defaults
  const handleSeedBankDefaults = async () => {
    try {
      setSeedingBank(true);
      const res = await api.post('/admin/questions/bank/seed-defaults');
      showToast(res.data.message || 'Standard Question Bank initialized!');
      await fetchQuestionBank();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to initialize Question Bank', 'error');
    } finally {
      setSeedingBank(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/admin/questions/${id}`);
      setQuestions(prev => prev.filter(q => q._id !== id));
      showToast('Question deleted successfully');
    } catch (err) {
      showToast('Failed to delete question', 'error');
    }
  };

  const handleDeployToRound = async (templateId: string, roundNumber: number) => {
    try {
      await api.post(`/admin/questions/bank/${templateId}/deploy-to-round`, {
        roundNumber,
        eventId: selectedEventId || undefined
      });
      showToast(`Question successfully deployed to Round ${roundNumber === 99 ? 'Tie-Breaker' : roundNumber}!`);
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to deploy question', 'error');
    }
  };

  // Active round metadata helper
  const currentRoundMeta = dynamicRounds.find(r => r.roundNumber === selectedRound);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-left">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-semibold transition-all animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 shadow-emerald-950/60'
              : 'bg-rose-950/90 text-rose-200 border-rose-500/40 shadow-rose-950/60'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header & View Switcher */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                <Dna className="w-3 h-3" /> Question DNA Engine
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                Senior SaaS Architecture
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Question Bank & Round Deployments</h1>
            <p className="text-xs text-slate-400">
              Curate algorithmic challenges, mutate code bug variants, and deploy synchronized question sets to competition rounds
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-stretch lg:self-auto justify-center">
          <button
            onClick={() => setActiveView('question_bank')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'question_bank'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Question Bank & DNA</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md text-[10px] bg-purple-900/60 text-purple-200">
              {bankQuestions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveView('round_questions')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeView === 'round_questions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Active Round Deployments</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: QUESTION BANK & QUESTION DNA STUDIO */}
      {activeView === 'question_bank' ? (
        <div className="space-y-6">
          {/* Action Header & Quick Stats */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Central Question Repository</h3>
                <p className="text-xs text-slate-400">
                  {bankQuestions.length} standard templates across {topics.length} engineering topics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSeedBankDefaults}
                disabled={seedingBank}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                title="Seed standard curated library into question bank"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seedingBank ? 'animate-spin' : ''}`} />
                <span>{seedingBank ? 'Seeding...' : 'Seed Standard Library'}</span>
              </button>

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Question to Bank</span>
              </button>
            </div>
          </div>

          {/* Category Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
            {[
              { id: '', label: 'All Questions', icon: BookOpen, activeCls: 'bg-purple-600/20 text-purple-300 border-purple-500/50' },
              { id: 'mcq', label: 'Multiple Choices (MCQ)', icon: CheckCircle2, activeCls: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50' },
              { id: 'coding', label: 'Coding Challenges', icon: Code2, activeCls: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50' },
              { id: 'sql', label: 'SQL & Database Queries', icon: Database, activeCls: 'bg-amber-600/20 text-amber-300 border-amber-500/50' },
              { id: 'debugging', label: 'Bug Hunting & Debugging', icon: AlertOctagon, activeCls: 'bg-rose-600/20 text-rose-300 border-rose-500/50' },
              { id: 'aptitude', label: 'Aptitude & Logic', icon: Sparkles, activeCls: 'bg-cyan-600/20 text-cyan-300 border-cyan-500/50' }
            ].map(cat => {
              const Icon = cat.icon;
              const isActive = selectedType === cat.id;
              const count = cat.id === ''
                ? (totalBankCount || bankQuestions.length)
                : (countsByType[cat.id] || 0);

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedType(cat.id)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
                    isActive
                      ? `${cat.activeCls} shadow-md`
                      : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-white border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cat.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      isActive ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filters & Search Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 w-full sm:w-80 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search titles, prompt, or skill tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') fetchQuestionBank(); }}
                className="bg-transparent text-xs text-white focus:outline-none w-full"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
              <select
                value={selectedLanguage}
                onChange={e => setSelectedLanguage(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="">All Languages</option>
                {availableLanguages.length > 0 ? (
                  availableLanguages.map(l => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))
                ) : (
                  ['python', 'sql', 'java', 'cpp', 'javascript', 'c'].map(l => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))
                )}
              </select>

              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option value="">All Topics ({topics.length})</option>
                {topics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={selectedDifficulty}
                onChange={e => setSelectedDifficulty(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
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
            <div className="text-center py-20 text-slate-500 font-mono text-sm flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-purple-400" />
              <span>Loading Question Bank...</span>
            </div>
          ) : bankQuestions.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-slate-900/60 rounded-3xl border border-slate-800 p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">No Questions in Question Bank</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Your question repository is currently empty or no items match your search filter. You can initialize the curated standard library or author a new question.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleSeedBankDefaults}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Seed Standard Curated Library</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Question</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bankQuestions.map(item => {
                const isExpanded = expandedBankId === item._id;
                const starterCodeObj = typeof item.starterCode === 'object' && item.starterCode !== null
                  ? item.starterCode
                  : { [item.language || 'python']: String(item.starterCode || '') };
                const starterLanguages = Object.keys(starterCodeObj);
                const currentLang = activeCodeLangTab[item._id] || item.language || starterLanguages[0] || 'python';
                const currentStarterCode = starterCodeObj[currentLang] || Object.values(starterCodeObj)[0] || '';

                return (
                  <div
                    key={item._id}
                    className={`rounded-3xl bg-slate-900 border transition-all shadow-xl shadow-slate-950/40 group ${
                      isExpanded ? 'border-purple-500/60 ring-1 ring-purple-500/20' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="p-6">
                      {/* Top Badges & Actions Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {item.type === 'mcq' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
                              <CheckCircle2 className="w-3 h-3" /> MCQ
                            </span>
                          ) : item.type === 'sql' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-mono">
                              <Database className="w-3 h-3" /> SQL Query
                            </span>
                          ) : item.type === 'coding' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1 font-mono">
                              <Code2 className="w-3 h-3" /> Coding
                            </span>
                          ) : item.type === 'aptitude' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1 font-mono">
                              <Sparkles className="w-3 h-3" /> Aptitude
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1 font-mono">
                              <AlertOctagon className="w-3 h-3" /> Bug Hunting
                            </span>
                          )}

                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                            {item.topic}
                          </span>
                          {item.language && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                              {item.language}
                            </span>
                          )}
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

                        {/* Top Action Buttons (Edit, Duplicate, Delete) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(item);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800 cursor-pointer"
                            title="Edit Question Template"
                          >
                            <Pencil className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateTemplate(item);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-800 cursor-pointer"
                            title="Duplicate Question"
                          >
                            <Copy className="w-3.5 h-3.5 text-cyan-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(item._id, item.title);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors border border-slate-800 cursor-pointer"
                            title="Delete Question"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </div>

                      {/* Question Title & Prompt */}
                      <div className="cursor-pointer" onClick={() => toggleExpandBank(item._id)}>
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-base font-black text-white mb-2 group-hover:text-indigo-300 transition-colors flex-1">
                            {item.title}
                          </h3>
                          <span className="p-1 text-slate-500 hover:text-slate-300">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-purple-400" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed font-sans">{item.prompt}</p>
                        )}
                      </div>

                      {/* EXPANDED ACCORDION VIEW */}
                      {isExpanded && (
                        <div className="my-4 pt-4 border-t border-slate-800/80 space-y-4 animate-in fade-in duration-150 text-left">
                          {/* Full Problem Prompt */}
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-purple-400" /> Full Problem Prompt:
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                              {item.prompt}
                            </div>
                          </div>

                          {/* Explanation if present */}
                          {item.explanation && (
                            <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 text-xs text-indigo-300">
                              <span className="font-bold text-indigo-200">💡 Explanation / Notes: </span>
                              {item.explanation}
                            </div>
                          )}

                          {/* MCQ Options Inspector */}
                          {item.type === 'mcq' && item.options && item.options.length > 0 && (
                            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Multiple Choice Options & Key:
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {item.options.map((opt: any, optIdx: number) => {
                                  const optText = typeof opt === 'string' ? opt : opt.text;
                                  const isCorrect = typeof opt === 'object' ? opt.isCorrect : optIdx === 0;
                                  return (
                                    <div
                                      key={optIdx}
                                      className={`text-xs p-3 rounded-xl flex items-center gap-2.5 border font-mono ${
                                        isCorrect
                                          ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/40 font-bold'
                                          : 'bg-slate-900/70 text-slate-300 border-slate-800'
                                      }`}
                                    >
                                      <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                          isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optIdx)}
                                      </span>
                                      <span className="flex-1 break-words">{optText}</span>
                                      {isCorrect && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 flex items-center gap-1">
                                          <Check className="w-3 h-3" /> Correct
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Coding / Debugging / SQL Starter Code Inspector */}
                          {(item.type === 'coding' || item.type === 'debugging' || item.type === 'sql') && (
                            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                  <FileCode className="w-3.5 h-3.5 text-indigo-400" /> Starter Code Template:
                                </div>
                                {starterLanguages.length > 1 && (
                                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                                    {starterLanguages.map(lang => (
                                      <button
                                        key={lang}
                                        onClick={() => setActiveCodeLangTab(prev => ({ ...prev, [item._id]: lang }))}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                          currentLang === lang
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-400 hover:text-white'
                                        }`}
                                      >
                                        {lang.toUpperCase()}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 overflow-x-auto max-h-56">
                                <pre className="text-xs text-indigo-200/90 font-mono whitespace-pre-wrap leading-relaxed">
                                  {currentStarterCode || '// No starter code configured for this language.'}
                                </pre>
                              </div>
                            </div>
                          )}

                          {/* Test Cases Table */}
                          {(item.type === 'coding' || item.type === 'debugging' || item.type === 'sql') && item.testCases && item.testCases.length > 0 && (
                            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                                <Code2 className="w-3.5 h-3.5 text-cyan-400" /> Test Cases Suite ({item.testCases.length} Cases):
                              </div>
                              <div className="space-y-2">
                                {item.testCases.map((tc: any, tcIdx: number) => (
                                  <div
                                    key={tcIdx}
                                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                                  >
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center">
                                        #{tcIdx + 1}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          tc.isHidden
                                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                            : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                        }`}
                                      >
                                        {tc.isHidden ? 'Hidden Eval' : 'Public Sample'}
                                      </span>
                                      <span className="text-[11px] text-slate-400 font-bold">
                                        {tc.weight || 10} pts
                                      </span>
                                    </div>
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                                        <span className="text-[10px] text-slate-500 block mb-0.5">Input:</span>
                                        <span className="text-slate-300 whitespace-pre-wrap break-all">{tc.input || '(empty)'}</span>
                                      </div>
                                      <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                                        <span className="text-[10px] text-slate-500 block mb-0.5">Expected Output:</span>
                                        <span className="text-emerald-400 whitespace-pre-wrap break-all">{tc.output || tc.expectedOutput || '(empty)'}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Collapsed Preview snippet */}
                      {!isExpanded && item.type === 'mcq' && item.options && (
                        <div className="my-2 text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{item.options.length} Multiple Choice Options (Click card to expand details)</span>
                        </div>
                      )}

                      {!isExpanded && (item.type === 'coding' || item.type === 'debugging' || item.type === 'sql') && item.testCases && (
                        <div className="my-2 text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{item.testCases.length} Test Cases ({item.testCases.filter((tc: any) => tc.isHidden).length} hidden)</span>
                        </div>
                      )}

                      {/* Skill Tags */}
                      {item.skillTags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2 mt-2">
                          {item.skillTags.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Bar */}
                    <div className="p-4 px-6 border-t border-slate-800/80 bg-slate-950/40 rounded-b-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" /> {item.expectedSolveTimeMinutes}m
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-slate-500" /> {item.marks} pts
                        </span>
                        <button
                          onClick={() => toggleExpandBank(item._id)}
                          className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition-colors ml-2"
                        >
                          {isExpanded ? 'Collapse Details' : 'Expand Details'}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.hasDnaMutation && (
                          <button
                            onClick={() => setPreviewTemplate({ id: item._id, title: item.title })}
                            className="py-2 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Dna className="w-3.5 h-3.5" />
                            <span>Preview DNA</span>
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
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-3 rounded-xl cursor-pointer focus:outline-none transition-all shadow-sm"
                        >
                          <option value="">Deploy to Round ▼</option>
                          {dynamicRounds.length > 0 ? (
                            dynamicRounds.map(dr => (
                              <option key={dr.roundNumber} value={dr.roundNumber}>
                                Round {dr.roundNumber}: {dr.title} ({dr.type.toUpperCase()})
                              </option>
                            ))
                          ) : (
                            <>
                              <option value="1">Round 1 (MCQ)</option>
                              <option value="2">Round 2 (Bug Hunting)</option>
                              <option value="3">Round 3 (Advanced Coding)</option>
                              <option value="99">Round 99 (Tie-Breaker)</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: ACTIVE ROUND DEPLOYMENTS */
        <div className="space-y-6">
          {/* Event Context & Deployment Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deploy To Event</span>
                {events.length > 0 ? (
                  <select
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none cursor-pointer mt-0.5"
                  >
                    {events.map(ev => (
                      <option key={ev._id} value={ev._id}>
                        {ev.name} ({ev.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-bold text-white">Default College Competition</span>
                )}
              </div>
            </div>

            {/* Batch Auto-Populator Button */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handlePopulateEntireEvent}
                disabled={populatingAll || !selectedEventId}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                title="Populates standard questions across all 4 rounds in one click"
              >
                <Sparkles className={`w-3.5 h-3.5 ${populatingAll ? 'animate-spin' : ''}`} />
                <span>{populatingAll ? 'Deploying Questions...' : '⚡ Auto-Populate All 4 Rounds'}</span>
              </button>
            </div>
          </div>

          {/* Round Selector Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { roundNumber: 1, label: 'Round 1: MCQs', type: 'mcq' },
                { roundNumber: 2, label: 'Round 2: Bug Hunting', type: 'coding' },
                { roundNumber: 3, label: 'Round 3: Advanced', type: 'coding' },
                { roundNumber: 99, label: 'Round 99: Tie-Breaker', type: 'coding' }
              ].map(r => {
                const isSelected = selectedRound === r.roundNumber;
                const count = roundQuestionCounts[r.roundNumber] !== undefined
                  ? roundQuestionCounts[r.roundNumber]
                  : (r.roundNumber === selectedRound ? questions.length : undefined);

                return (
                  <button
                    key={r.roundNumber}
                    onClick={() => setSelectedRound(r.roundNumber)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                    }`}
                  >
                    <span>{r.label}</span>
                    {count !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                        isSelected ? 'bg-indigo-950/70 text-indigo-200' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {count} Qs
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => {
                  setEditingTemplate(null);
                  setDirectRoundTarget(selectedRound);
                  setIsAddModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-cyan-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Question to Round</span>
              </button>

              <button
                onClick={() => handleSeedRoundQuestions(selectedRound)}
                disabled={seedingRound}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-cyan-400 ${seedingRound ? 'animate-spin' : ''}`} />
                <span>{seedingRound ? 'Seeding...' : `Seed Round ${selectedRound === 99 ? 'Tie-Breaker' : selectedRound}`}</span>
              </button>

              <button
                onClick={() => setActiveView('question_bank')}
                className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/40 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Deploy from Bank</span>
              </button>
            </div>
          </div>

          {/* Questions List or Empty State */}
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-20 text-slate-500 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <span className="font-mono text-sm">Loading Round Questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-900/60 rounded-3xl border border-slate-800 p-8 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                  <AlertOctagon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    No Questions Deployed for Round {selectedRound === 99 ? 'Tie-Breaker' : selectedRound}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed mt-1">
                    When participants advance to this round, they will have no questions to solve. Deploy standard curated questions or pick custom challenges from the Question Bank.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  <button
                    onClick={() => handleSeedRoundQuestions(selectedRound)}
                    disabled={seedingRound}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>⚡ Populate Standard Round {selectedRound === 99 ? 'Tie-Breaker' : selectedRound} Questions</span>
                  </button>

                  <button
                    onClick={handlePopulateEntireEvent}
                    disabled={populatingAll || !selectedEventId}
                    className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30 cursor-pointer disabled:opacity-50"
                  >
                    <Layers className="w-4 h-4" />
                    <span>⚡ Auto-Populate All 4 Rounds</span>
                  </button>

                  <button
                    onClick={() => setActiveView('question_bank')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 cursor-pointer"
                  >
                    Browse Question Bank
                  </button>
                </div>
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
                          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Delete Question"
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
                                <div key={oIdx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-start gap-2">
                                  <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center justify-center shrink-0">
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span>{opt}</span>
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
                                  <div className="text-[10px] text-slate-500 mb-1 flex items-center justify-between">
                                    <span>Case #{tcIdx + 1}</span>
                                    {tc.isHidden && <span className="text-amber-400 text-[10px]">(Hidden)</span>}
                                  </div>
                                  <div>In: {tc.input?.replace(/\n/g, ' ') || 'None'}</div>
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

      {/* Add / Edit Question Modal */}
      <AddQuestionModal
        isOpen={isAddModalOpen}
        editingTemplate={editingTemplate}
        targetRoundNumber={directRoundTarget}
        targetEventId={selectedEventId}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTemplate(null);
          setDirectRoundTarget(undefined);
        }}
        onQuestionAdded={() => {
          if (directRoundTarget) {
            fetchRoundQuestions();
            showToast(`New question added to Round ${directRoundTarget}!`);
          } else if (editingTemplate) {
            fetchQuestionBank();
            showToast('Question template updated successfully!');
          } else {
            fetchQuestionBank();
            showToast('New question created and added to Question Bank!');
          }
        }}
      />

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
