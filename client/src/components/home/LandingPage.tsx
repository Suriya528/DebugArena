import React, { useState, useMemo } from 'react';
import {
  Shield,
  Terminal,
  Trophy,
  Lock,
  Cpu,
  Zap,
  CheckCircle2,
  Search,
  ArrowRight,
  Building2,
  Users,
  Award,
  ShieldCheck,
  Layers,
  Code2,
  ExternalLink,
  Sparkles,
  Activity,
  Play,
  RotateCcw,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  Flame,
  Check,
  Info,
  Server,
  Key,
  Menu,
  X,
  Clock,
  Compass,
  BookOpen,
  ChevronRight,
  BarChart2,
  Star,
  Hash,
  Send,
  Sun,
  Moon,
  Filter,
  Shuffle,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { AdminAuthModal } from '../auth/AdminAuthModal.js';
import { JoinEventModal } from '../participant/JoinEventModal.js';
import { FooterDetailModal, FooterTopicId } from './FooterDetailModal.js';
import { ThemeToggle } from '../common/ThemeToggle.js';
import { useTheme } from '../../context/ThemeContext.js';

interface ProblemItem {
  id: number;
  title: string;
  defectCategory: 'Off-By-One' | 'Pointers & Memory' | 'Concurrency' | 'DP & State' | 'Trees & Graphs' | 'MCQ';
  language: string;
  acceptance: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  bugExplanation: string;
  solutionExplanation: string;
  sampleInput: string;
  sampleOutput: string;
  starterCode: string;
  solutionCode: string;
  solved: boolean;
}

const PROBLEM_BANK: ProblemItem[] = [
  {
    id: 42,
    title: 'Binary Search Pivot Underflow',
    defectCategory: 'Off-By-One',
    language: 'Python 3.11',
    acceptance: '74.8%',
    difficulty: 'Medium',
    description:
      'Given a sorted integer array nums and a target value, return the index if target is found. The starter implementation suffers from an off-by-one mid-point calculation defect causing index skew on boundary values.',
    bugExplanation: 'return mid + 1  # 🐞 Defect: Off-by-one pivot error returns skewed index',
    solutionExplanation: 'return mid  # ✅ Verified: Exact pivot index returned',
    sampleInput: 'nums = [2, 5, 8, 12], target = 8',
    sampleOutput: '2',
    starterCode: `def binary_search(nums: list[int], target: int) -> int:
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid + 1  # 🐞 Defect: off-by-one!
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
    solutionCode: `def binary_search(nums: list[int], target: int) -> int:
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid  # ✅ Corrected pivot return
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
    solved: true
  },
  {
    id: 1,
    title: 'Two Sum Buffer Boundary Overflow',
    defectCategory: 'Off-By-One',
    language: 'Python 3.11',
    acceptance: '84.2%',
    difficulty: 'Easy',
    description:
      'Locate indices of the two numbers such that they add up to target. The starter hashmap check evaluates the key after incrementing iterator pointers beyond array bounds.',
    bugExplanation: 'seen[nums[i]] = i + 1  # 🐞 Skewed 1-based indexing instead of 0-based',
    solutionExplanation: 'seen[nums[i]] = i  # ✅ Clean 0-indexed lookup table',
    sampleInput: 'nums = [2, 7, 11, 15], target = 9',
    sampleOutput: '[0, 1]',
    starterCode: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i in range(len(nums)):
        diff = target - nums[i]
        if diff in seen:
            return [seen[diff], i + 1] # 🐞 Bug: Skewed indices
        seen[nums[i]] = i
    return []`,
    solutionCode: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i in range(len(nums)):
        diff = target - nums[i]
        if diff in seen:
            return [seen[diff], i] # ✅ Correct pair indices
        seen[nums[i]] = i
    return []`,
    solved: false
  },
  {
    id: 146,
    title: 'LRU Cache Pointer Disconnection',
    defectCategory: 'Pointers & Memory',
    language: 'Python 3.11',
    acceptance: '52.4%',
    difficulty: 'Hard',
    description:
      'Design a data structure that follows Least Recently Used (LRU) cache constraints. The starter doubly linked list removal fails to update the next pointer of the preceding node, leaking dangling references.',
    bugExplanation: 'node.prev.next = node  # 🐞 Self-referencing cycle breaks doubly linked list',
    solutionExplanation: 'node.prev.next = node.next  # ✅ Proper node disconnection',
    sampleInput: '["LRUCache", "put", "put", "get"]\n[[2], [1, 1], [2, 2], [1]]',
    sampleOutput: '[null, null, null, 1]',
    starterCode: `def remove_node(node):
    # 🐞 Defect: self-referencing cycle
    node.prev.next = node
    node.next.prev = node.prev`,
    solutionCode: `def remove_node(node):
    # ✅ Clean detachment
    node.prev.next = node.next
    node.next.prev = node.prev`,
    solved: false
  },
  {
    id: 206,
    title: 'Reverse Linked List Cyclic Leak',
    defectCategory: 'Pointers & Memory',
    language: 'Python 3.11',
    acceptance: '88.6%',
    difficulty: 'Easy',
    description:
      'Given the head of a singly linked list, reverse the list and return the reversed list. Starter code omits clearing the original head next pointer, resulting in an infinite cycle during traversal.',
    bugExplanation: 'curr.next = curr  # 🐞 Infinite cyclic node assignment',
    solutionExplanation: 'curr.next = prev  # ✅ Inverted link direction',
    sampleInput: 'head = [1, 2, 3, 4, 5]',
    sampleOutput: '[5, 4, 3, 2, 1]',
    starterCode: `def reverse_list(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = curr # 🐞 Bug: circular link
        prev = curr
        curr = nxt
    return prev`,
    solutionCode: `def reverse_list(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next
        curr.next = prev # ✅ Directed reversal
        prev = curr
        curr = nxt
    return prev`,
    solved: true
  },
  {
    id: 300,
    title: 'Longest Subsequence Memoization Drift',
    defectCategory: 'DP & State',
    language: 'Python 3.11',
    acceptance: '68.1%',
    difficulty: 'Medium',
    description:
      'Find the length of the longest strictly increasing subsequence. Starter memoization table initialises with 0 instead of 1, invalidating singleton element subproblems.',
    bugExplanation: 'dp = [0] * n  # 🐞 Base case invalid: single elements have length 1',
    solutionExplanation: 'dp = [1] * n  # ✅ Base case correctly initialized',
    sampleInput: 'nums = [10, 9, 2, 5, 3, 7, 101, 18]',
    sampleOutput: '4',
    starterCode: `def length_of_lis(nums: list[int]) -> int:
    if not nums: return 0
    dp = [0] * len(nums) # 🐞 Bug: base length must be 1
    for i in range(len(nums)):
        for j in range(i):
            if nums[i] > nums[j]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)`,
    solutionCode: `def length_of_lis(nums: list[int]) -> int:
    if not nums: return 0
    dp = [1] * len(nums) # ✅ Base length is 1
    for i in range(len(nums)):
        for j in range(i):
            if nums[i] > nums[j]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)`,
    solved: false
  },
  {
    id: 1114,
    title: 'Print in Order Mutex Lock Order Deadlock',
    defectCategory: 'Concurrency',
    language: 'Python 3.11',
    acceptance: '47.9%',
    difficulty: 'Hard',
    description:
      'Three threads run concurrently. Ensure second() executes only after first(), and third() executes after second(). Starter lock acquisition order triggers cyclic deadlock.',
    bugExplanation: 'self.lock2.acquire(); self.lock1.acquire() # 🐞 Inverse lock order deadlock',
    solutionExplanation: 'self.lock1.acquire(); self.lock2.release() # ✅ Ordered synchronization barrier',
    sampleInput: 'nums = [1, 3, 2]',
    sampleOutput: '"firstsecondthird"',
    starterCode: `def second(self, printSecond):
    self.lock2.acquire() # 🐞 Deadlock lock inversion
    printSecond()
    self.lock1.release()`,
    solutionCode: `def second(self, printSecond):
    self.lock1.acquire() # ✅ Sequenced acquisition
    printSecond()
    self.lock2.release()`,
    solved: false
  },
  {
    id: 98,
    title: 'Validate BST Boundary Equality Trap',
    defectCategory: 'Trees & Graphs',
    language: 'Python 3.11',
    acceptance: '66.2%',
    difficulty: 'Medium',
    description:
      'Determine if a binary tree is a valid Binary Search Tree. Starter validator allows duplicate values on left and right branches using <= instead of strictly <.',
    bugExplanation: 'if node.val <= low or node.val >= high: # 🐞 Permitted non-strict equivalence',
    solutionExplanation: 'if not (low < node.val < high): # ✅ Strict inequality enforced',
    sampleInput: 'root = [2, 1, 3]',
    sampleOutput: 'true',
    starterCode: `def is_valid_bst(node, low=-float('inf'), high=float('inf')):
    if not node: return True
    if node.val < low or node.val > high: # 🐞 Permitted duplicate values
        return False
    return is_valid_bst(node.left, low, node.val) and is_valid_bst(node.right, node.val, high)`,
    solutionCode: `def is_valid_bst(node, low=-float('inf'), high=float('inf')):
    if not node: return True
    if not (low < node.val < high): # ✅ Strict inequality
        return False
    return is_valid_bst(node.left, low, node.val) and is_valid_bst(node.right, node.val, high)`,
    solved: false
  },
  {
    id: 200,
    title: 'Number of Islands Visited Recurse Stack',
    defectCategory: 'Trees & Graphs',
    language: 'Python 3.11',
    acceptance: '71.5%',
    difficulty: 'Medium',
    description:
      'Count connected components on a 2D grid. The starter DFS fails to mark the root cell before recursion, producing an infinite stack call recursion error.',
    bugExplanation: 'grid[r][c] = "1"  # 🐞 Overwrote mark with unvisited land value',
    solutionExplanation: 'grid[r][c] = "0"  # ✅ Sinks island cell to terminate DFS',
    sampleInput: 'grid = [["1","1","0"],["1","1","0"],["0","0","1"]]',
    sampleOutput: '2',
    starterCode: `def dfs(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == "0":
        return
    grid[r][c] = "1" # 🐞 Infinite recursion: re-marking as 1
    dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)`,
    solutionCode: `def dfs(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == "0":
        return
    grid[r][c] = "0" # ✅ Marks as visited water
    dfs(r+1, c); dfs(r-1, c); dfs(r, c+1); dfs(r, c-1)`,
    solved: false
  }
];

export const LandingPage: React.FC = () => {
  const { isDark } = useTheme();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [certLookupId, setCertLookupId] = useState('');

  // Footer Details Modal state
  const [footerTopic, setFooterTopic] = useState<FooterTopicId | null>(null);
  const [isFooterModalOpen, setIsFooterModalOpen] = useState(false);

  // LeetCode Problem Bank Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  // Currently Selected Problem for the Live Playground
  const [selectedProblem, setSelectedProblem] = useState<ProblemItem>(PROBLEM_BANK[0]);
  const [hasInjectedDefect, setHasInjectedDefect] = useState(false);
  const [isEvaluatingCode, setIsEvaluatingCode] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'debugger' | 'proctor' | 'leaderboard'>('debugger');
  const [simulatedProctorStrike, setSimulatedProctorStrike] = useState<number>(0);
  const [proctorAlertMessage, setProctorAlertMessage] = useState<string | null>(null);

  const filteredProblems = useMemo(() => {
    return PROBLEM_BANK.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.defectCategory.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toString().includes(searchQuery);
      const matchesCat = selectedCategory === 'All' || p.defectCategory === selectedCategory;
      const matchesDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;
      return matchesSearch && matchesCat && matchesDiff;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const handleSelectRandom = () => {
    const rand = PROBLEM_BANK[Math.floor(Math.random() * PROBLEM_BANK.length)];
    setSelectedProblem(rand);
    setHasInjectedDefect(false);
    scrollToSection('problem-workspace');
  };

  const handleVerifyCert = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = certLookupId.trim();
    if (cleanId) {
      window.location.href = `/verify-cert/${encodeURIComponent(cleanId)}`;
    }
  };

  const openTopic = (topic: FooterTopicId) => {
    setFooterTopic(topic);
    setIsFooterModalOpen(true);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleRunSimulatorJudge = () => {
    setIsEvaluatingCode(true);
    setTimeout(() => {
      setIsEvaluatingCode(false);
    }, 600);
  };

  const handleSimulateViolation = () => {
    setSimulatedProctorStrike((prev) => Math.min(3, prev + 1));
    setProctorAlertMessage('TELEMETRY ALERT: window.onblur captured! Focus-lock violation recorded.');
    setTimeout(() => {
      setProctorAlertMessage(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-[#0a0e17] dark:bg-[#0a0e17] text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black relative overflow-x-hidden font-sans transition-colors duration-200">
      {/* Background Matrix & Subtle Gradient Mesh */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#f59e0b 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

      {/* ========================================================= */}
      {/* LEETCODE / HACKERRANK TOP NAVIGATION BAR                  */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0d121f]/95 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Identity & Main LeetCode Tabs */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <Terminal className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-black text-lg tracking-tight text-white flex items-center gap-1.5">
                DebugArena
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-mono text-[9px] font-bold border border-amber-500/25">
                  TOURNAMENT
                </span>
              </span>
            </div>

            {/* LeetCode Main Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
              <button
                onClick={() => scrollToSection('problem-list')}
                className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 text-amber-400"
              >
                <span>Problems</span>
              </button>
              <button
                onClick={() => scrollToSection('tournament-arena')}
                className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Contests</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              </button>
              <button
                onClick={() => scrollToSection('leaderboard')}
                className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Leaderboard</span>
              </button>
              <button
                onClick={() => scrollToSection('kiosk-proctor')}
                className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Anti-Cheat</span>
              </button>
              <button
                onClick={() => scrollToSection('verification')}
                className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Verify Proofs</span>
              </button>
            </nav>
          </div>

          {/* Right Action Tools (Theme, Streak, Contest Join, Organizer) */}
          <div className="flex items-center gap-3">
            {/* Daily Debug Streak Pill (LeetCode Style) */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 font-mono text-[11px] font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
              <span>12-Day Streak</span>
            </div>

            {/* Theme Toggle (Dark/Light Mode) */}
            <ThemeToggle />

            {/* Organizer Sign In */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="hidden lg:inline-flex h-9 px-3.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Host Tournament</span>
            </button>

            {/* Primary Action: Enter Contest */}
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="h-9 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/25 transition-all inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-slate-950 shrink-0" />
              <span>Enter Contest</span>
            </button>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-[#0d121f]/98 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-300">
              <button
                onClick={() => {
                  scrollToSection('problem-list');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-left hover:text-amber-400"
              >
                Problems Table
              </button>
              <button
                onClick={() => {
                  scrollToSection('tournament-arena');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-left hover:text-amber-400"
              >
                Weekly Contest
              </button>
              <button
                onClick={() => {
                  scrollToSection('problem-workspace');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-left hover:text-amber-400"
              >
                Interactive Arena
              </button>
              <button
                onClick={() => {
                  scrollToSection('leaderboard');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-left hover:text-amber-400"
              >
                Collegiate Ranks
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsAdminModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 border border-slate-700 flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Host Tournament / Organizer Portal</span>
              </button>
              <button
                onClick={() => {
                  setIsJoinModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4 text-slate-950" />
                <span>Join Live Contest Lobby</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Competitive Platform Hub */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* ========================================================= */}
        {/* SECTION 1: LEETCODE WEEKLY CONTEST LIVE HERO BANNER       */}
        {/* ========================================================= */}
        <section
          id="tournament-arena"
          className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#12192c] via-[#0d1322] to-[#0a0e17] border border-amber-500/30 shadow-xl relative overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[11px] font-mono font-bold text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>WEEKLY CONTEST #24: ROUND 2 ACTIVE</span>
                </span>
                <span className="text-slate-500 text-xs hidden sm:inline">•</span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>1,420 Contestants Sandboxed</span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Collegiate Algorithmic Debugging Championship
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                Race against synchronized timers to diagnose production runtime bugs, resolve race hazards, and patch boundary underflows under browser kiosk lockdown.
              </p>

              {/* Tournament Stages Pipeline Indicator */}
              <div className="pt-2 flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  R1: MCQ Screening (20 Qs)
                </span>
                <span className="text-slate-600">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  R2: Live WASM Debugging (3 Sets)
                </span>
                <span className="text-slate-600">&rarr;</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  R3: Sudden Death (10m)
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="h-11 px-6 rounded-2xl text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20 transition-all inline-flex items-center justify-center gap-2 active:scale-95 cursor-pointer whitespace-nowrap"
              >
                <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Enter Contest Lobby</span>
                <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" />
              </button>

              <button
                onClick={handleSelectRandom}
                className="h-11 px-5 rounded-2xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 transition-all inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Pick Random Challenge</span>
              </button>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 2: LEETCODE / HACKERRANK PROBLEM SET TABLE         */}
        {/* ========================================================= */}
        <section id="problem-list" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Debugging Problem Repository</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-xs">
                  {filteredProblems.length} Problems Available
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select any challenge to load its defect into the in-browser WASM debugger below.
              </p>
            </div>

            {/* Category Filter Pills (LeetCode Tags) */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {['All', 'Off-By-One', 'Pointers & Memory', 'Concurrency', 'DP & State', 'Trees & Graphs'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0d121f] p-3 rounded-2xl border border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, defect type, or problem ID..."
                className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Difficulty Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              <button
                onClick={handleSelectRandom}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Shuffle Random Problem"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Pick One</span>
              </button>
            </div>
          </div>

          {/* High-Density LeetCode Table */}
          <div className="rounded-2xl border border-slate-800 bg-[#0d121f] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 select-none">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">Status</th>
                    <th className="py-3 px-4 w-16">#</th>
                    <th className="py-3 px-4">Title & Defect Specification</th>
                    <th className="py-3 px-4 hidden md:table-cell">Defect Category</th>
                    <th className="py-3 px-4 hidden lg:table-cell">Language</th>
                    <th className="py-3 px-4 text-center">Acceptance</th>
                    <th className="py-3 px-4 text-center">Difficulty</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredProblems.map((prob) => {
                    const isSelected = selectedProblem.id === prob.id;
                    return (
                      <tr
                        key={prob.id}
                        onClick={() => {
                          setSelectedProblem(prob);
                          setHasInjectedDefect(false);
                          scrollToSection('problem-workspace');
                        }}
                        className={`transition-colors cursor-pointer group ${
                          isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-900/70'
                        }`}
                      >
                        {/* Status Icon */}
                        <td className="py-3 px-4 text-center">
                          {prob.solved ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-slate-600 block text-center">-</span>
                          )}
                        </td>

                        {/* ID */}
                        <td className="py-3 px-4 text-slate-500 font-bold">{prob.id}</td>

                        {/* Title */}
                        <td className="py-3 px-4">
                          <div className="font-sans font-bold text-white group-hover:text-amber-400 transition-colors text-sm">
                            {prob.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate max-w-xs sm:max-w-md">
                            {prob.description}
                          </div>
                        </td>

                        {/* Defect Category */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                            {prob.defectCategory}
                          </span>
                        </td>

                        {/* Language */}
                        <td className="py-3 px-4 hidden lg:table-cell text-slate-400">{prob.language}</td>

                        {/* Acceptance */}
                        <td className="py-3 px-4 text-center text-slate-300 font-semibold">{prob.acceptance}</td>

                        {/* Difficulty */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              prob.difficulty === 'Easy'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : prob.difficulty === 'Medium'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {prob.difficulty}
                          </span>
                        </td>

                        {/* Action Button */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProblem(prob);
                              setHasInjectedDefect(false);
                              scrollToSection('problem-workspace');
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer whitespace-nowrap"
                          >
                            Debug Now
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 3: AUTHENTIC SPLIT PROBLEM & IN-BROWSER DEBUGGER  */}
        {/* ========================================================= */}
        <section id="problem-workspace" className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-500 font-bold">Interactive Sandbox:</span>
              <span className="text-sm font-bold text-white">#{selectedProblem.id}. {selectedProblem.title}</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
              PYODIDE WASM WORKER READY
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 rounded-3xl border border-slate-700/80 bg-[#0d121f] overflow-hidden shadow-2xl">
            {/* Left Pane: Problem Description (LeetCode Style) */}
            <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-4 overflow-y-auto max-h-[560px]">
              <div className="flex items-center justify-between">
                <span className="text-lg font-black text-white">
                  #{selectedProblem.id}. {selectedProblem.title}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    selectedProblem.difficulty === 'Easy'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : selectedProblem.difficulty === 'Medium'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {selectedProblem.difficulty}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Defect: {selectedProblem.defectCategory}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Acceptance: {selectedProblem.acceptance}
                </span>
              </div>

              {/* Description Body */}
              <div className="text-xs text-slate-300 leading-relaxed space-y-3 font-sans">
                <p>{selectedProblem.description}</p>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] space-y-1.5">
                  <div className="text-slate-400 font-bold uppercase text-[10px]">Sample Assertion Case:</div>
                  <div><span className="text-slate-500">Input: </span><code>{selectedProblem.sampleInput}</code></div>
                  <div><span className="text-slate-500">Expected Output: </span><span className="text-emerald-400 font-bold">{selectedProblem.sampleOutput}</span></div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                  <div className="font-bold uppercase text-slate-500 text-[10px]">Tournament Constraints:</div>
                  <div>• Time Limit: 2,000ms per test execution</div>
                  <div>• Memory Boundary: 128MB isolated WebAssembly heap</div>
                  <div>• Proctor: Kiosk window.blur focus-lock active</div>
                </div>
              </div>
            </div>

            {/* Right Pane: Code Editor & Judge Console */}
            <div className="lg:col-span-7 flex flex-col justify-between p-5 space-y-4">
              {/* Workspace Header Toolbar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">solution.py</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">{selectedProblem.language}</span>
                </div>

                {/* Defect Inject/Fix Button */}
                <button
                  onClick={() => setHasInjectedDefect(!hasInjectedDefect)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                    hasInjectedDefect
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {hasInjectedDefect ? '✅ Apply Solution Patch' : '🐞 View Faulty Starter Code'}
                </button>
              </div>

              {/* Code Snippet Box */}
              <div className="p-4 rounded-2xl bg-[#070a10] border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto">
                <pre className="whitespace-pre">
                  {hasInjectedDefect ? selectedProblem.starterCode : selectedProblem.solutionCode}
                </pre>
              </div>

              {/* Highlight Bar */}
              <div
                className={`p-2.5 rounded-xl border text-[11px] font-mono flex items-center gap-2 ${
                  hasInjectedDefect
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                {hasInjectedDefect ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>
                  {hasInjectedDefect ? selectedProblem.bugExplanation : selectedProblem.solutionExplanation}
                </span>
              </div>

              {/* Execution Actions & Judge Console */}
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">Judge Status:</span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      hasInjectedDefect ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {hasInjectedDefect ? 'Wrong Answer (Assertion Failed)' : 'Accepted (24 ms, Beats 97.4%)'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={isEvaluatingCode}
                    onClick={handleRunSimulatorJudge}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono transition-all border border-slate-700 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 inline mr-1 text-slate-300" />
                    <span>Run Sample</span>
                  </button>

                  <button
                    disabled={isEvaluatingCode}
                    onClick={() => setIsJoinModalOpen(true)}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold font-mono transition-all shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 inline mr-1 text-slate-950" />
                    <span>Submit in Live Contest</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 4: LIVE COLLEGIATE LEADERBOARD (HACKERRANK STYLE) */}
        {/* ========================================================= */}
        <section id="leaderboard" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Inter-Collegiate Contest Standings</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tournament scoreboard updated across live participant submissions.
              </p>
            </div>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-400 text-xs font-bold transition-all cursor-pointer font-mono"
            >
              Enter Contest Lobby &rarr;
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0d121f] overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Contestant</th>
                    <th className="py-3 px-4">University / Department</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Time Taken</th>
                    <th className="py-3 px-4 text-center">Rounds Cleared</th>
                    <th className="py-3 px-4 text-right">Verifiable Credential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {[
                    { rank: 1, name: 'Ananya Sharma', college: 'Stanford University', score: '380 pts', time: '18m 12s', rounds: '3 of 3', cert: 'CERT-DEBUG-2026-A1' },
                    { rank: 2, name: 'Karthik Raja', college: 'CEG Anna University', score: '365 pts', time: '21m 04s', rounds: '3 of 3', cert: 'CERT-ACM-STANFORD-04' },
                    { rank: 3, name: 'David Chen', college: 'MIT EECS', score: '350 pts', time: '22m 30s', rounds: '3 of 3', cert: 'CERT-MIT-2026-X8' },
                    { rank: 4, name: 'Elena Rostova', college: 'Cambridge Computer Lab', score: '340 pts', time: '24m 15s', rounds: '2 of 3', cert: 'CERT-CAMB-2026-Q2' },
                    { rank: 5, name: 'Rohan Gupta', college: 'IIT Madras', score: '325 pts', time: '25m 48s', rounds: '2 of 3', cert: 'CERT-IITM-2026-P9' }
                  ].map((entry) => (
                    <tr key={entry.rank} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            entry.rank === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : entry.rank === 2
                              ? 'bg-slate-300/20 text-slate-200 border border-slate-400/40'
                              : entry.rank === 3
                              ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                              : 'text-slate-500'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-white font-sans">{entry.name}</td>
                      <td className="py-3 px-4 text-slate-400">{entry.college}</td>
                      <td className="py-3 px-4 text-center text-amber-400 font-bold">{entry.score}</td>
                      <td className="py-3 px-4 text-center text-slate-400">{entry.time}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px]">
                          {entry.rounds}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/verify-cert/${encodeURIComponent(entry.cert)}`;
                          }}
                          className="text-cyan-400 hover:text-cyan-300 hover:underline text-[11px] cursor-pointer"
                        >
                          {entry.cert} &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* SECTION 5: KIOSK INTEGRITY TELEMETRY & VERIFICATION       */}
        {/* ========================================================= */}
        <section id="kiosk-proctor" className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Proctoring Defense Card */}
          <div className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Hardware Kiosk Anti-Cheat</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-mono border border-rose-500/30">
                LEVEL 3 ENFORCED
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Browser-enforced full-screen lock and telemetry monitoring traps focus-blur events, tab switching, and clipboard pasting with automatic multi-strike disqualification.
            </p>

            {proctorAlertMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{proctorAlertMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
              <span className="text-slate-400">Recorded Strikes: <strong className="text-white">{simulatedProctorStrike} / 3</strong></span>
              <button
                onClick={handleSimulateViolation}
                className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[11px] font-bold cursor-pointer active:scale-95"
              >
                Simulate Tab-Switch Blur
              </button>
            </div>
          </div>

          {/* Certificate Authenticator Card */}
          <div id="verification" className="p-6 rounded-3xl bg-[#0d121f] border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Authenticate Credentials</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-mono border border-cyan-500/30">
                SHA-256 PROOFS
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Recruiters and universities can verify cryptographic certificate signatures, official ranks, and tournament timestamps without requiring an account.
            </p>

            <form onSubmit={handleVerifyCert} className="flex gap-2">
              <input
                type="text"
                value={certLookupId}
                onChange={(e) => setCertLookupId(e.target.value)}
                placeholder="Enter Certificate ID (e.g. CERT-DEBUG-2026-A1)"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Verify
              </button>
            </form>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <span>Sample:</span>
              <button
                type="button"
                onClick={() => setCertLookupId('CERT-DEBUG-2026-A1')}
                className="text-cyan-400 hover:underline cursor-pointer"
              >
                CERT-DEBUG-2026-A1
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* SECTION 6: LEETCODE CLEAN DEVELOPER FOOTER                */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-800 bg-[#06080e] pt-12 pb-10 text-slate-400 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Col 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black">
                  <Terminal className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
                </div>
                <span className="font-bold text-white text-sm">DebugArena</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The collegiate debugging tournament platform. Dedicated to testing real software defect diagnosis and algorithmic optimization.
              </p>
              <button
                type="button"
                onClick={() => openTopic('system-status')}
                className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 hover:underline cursor-pointer"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>All Tournament Clusters Operational</span>
              </button>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <div className="font-bold text-white uppercase text-[11px] font-mono">Platform Specs</div>
              <ul className="space-y-1.5 text-[11px]">
                <li><button onClick={() => openTopic('code-sandbox')} className="hover:text-amber-400 cursor-pointer">Pyodide WASM Engine</button></li>
                <li><button onClick={() => openTopic('kiosk-proctoring')} className="hover:text-amber-400 cursor-pointer">Focus-Lock Kiosk Specs</button></li>
                <li><button onClick={() => openTopic('multi-stage-rounds')} className="hover:text-amber-400 cursor-pointer">3-Round Tournament Rules</button></li>
                <li><button onClick={() => openTopic('cryptographic-credentials')} className="hover:text-amber-400 cursor-pointer">SHA-256 Proof Validation</button></li>
                <li><button onClick={() => openTopic('question-bank')} className="hover:text-amber-400 cursor-pointer">Defect Repository Matrix</button></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <div className="font-bold text-white uppercase text-[11px] font-mono">Tournament Portals</div>
              <ul className="space-y-1.5 text-[11px]">
                <li><button onClick={() => setIsJoinModalOpen(true)} className="hover:text-amber-400 cursor-pointer text-amber-400 font-semibold">Enter Contest Lobby &rarr;</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-amber-400 cursor-pointer">Organizer Control Room</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-amber-400 cursor-pointer">Create College Workspace</button></li>
                <li><button onClick={() => openTopic('organizer-dispatch')} className="hover:text-amber-400 cursor-pointer">Campus Host Checklist</button></li>
                <li><button onClick={() => scrollToSection('verification')} className="hover:text-amber-400 cursor-pointer">Public Certificate Lookup</button></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-2">
              <div className="font-bold text-white uppercase text-[11px] font-mono">Integrity & Legal</div>
              <ul className="space-y-1.5 text-[11px]">
                <li><button onClick={() => openTopic('anti-cheat-guidelines')} className="hover:text-amber-400 cursor-pointer">Anti-Cheat Rulebook</button></li>
                <li><button onClick={() => openTopic('academic-honor-code')} className="hover:text-amber-400 cursor-pointer">Collegiate Honor Code</button></li>
                <li><button onClick={() => openTopic('security-standards')} className="hover:text-amber-400 cursor-pointer">Passkey Authentication</button></li>
                <li><button onClick={() => openTopic('privacy-policy')} className="hover:text-amber-400 cursor-pointer">Privacy Policy</button></li>
                <li><button onClick={() => openTopic('terms-of-service')} className="hover:text-amber-400 cursor-pointer">Terms of Competition</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-mono">
            <div>&copy; {new Date().getFullYear()} DebugArena Tournament System. Built for competitive debugging.</div>
            <div className="flex items-center gap-4">
              <button onClick={() => openTopic('academic-license')} className="hover:text-slate-400">Academic License</button>
              <span>•</span>
              <button onClick={() => openTopic('system-status')} className="hover:text-slate-400">Cluster Telemetry</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Real Interactive Technical Documentation Modal */}
      <FooterDetailModal
        isOpen={isFooterModalOpen}
        topic={footerTopic}
        onClose={() => setIsFooterModalOpen(false)}
        onSelectTopic={(t) => setFooterTopic(t)}
        onAction={(type) => {
          if (type === 'join') setIsJoinModalOpen(true);
          if (type === 'admin') setIsAdminModalOpen(true);
          if (type === 'verify') scrollToSection('verification');
        }}
      />

      {/* Core Application Modals (Unchanged Business Logic) */}
      <AdminAuthModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <JoinEventModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
    </div>
  );
};
