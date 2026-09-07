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
  Bug,
  Split,
  Timer
} from 'lucide-react';
import { AdminAuthModal } from '../auth/AdminAuthModal.js';
import { JoinEventModal } from '../participant/JoinEventModal.js';
import { FooterDetailModal, FooterTopicId } from './FooterDetailModal.js';
import { ThemeToggle } from '../common/ThemeToggle.js';
import { useTheme } from '../../context/ThemeContext.js';

interface DebuggingTicket {
  id: number;
  ticketCode: string;
  title: string;
  defectCategory: 'Off-By-One' | 'Pointers & Memory' | 'Concurrency' | 'DP & State' | 'Trees & Graphs';
  language: string;
  acceptance: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  failingAssertion: string;
  bugExplanation: string;
  solutionExplanation: string;
  starterCode: string;
  solutionCode: string;
  solved: boolean;
}

const TOURNAMENT_BUG_BANK: DebuggingTicket[] = [
  {
    id: 42,
    ticketCode: 'BUG-042',
    title: 'Binary Search Pivot Skew (Off-By-One)',
    defectCategory: 'Off-By-One',
    language: 'Python 3.11',
    acceptance: '74.8%',
    difficulty: 'Medium',
    description:
      'A binary search routine over sorted array nums crashes on boundary keys. The mid-point target comparison contains an off-by-one arithmetic shift that skips indices during boundary partitions.',
    failingAssertion: 'AssertionError: binary_search([2, 5, 8, 12], target=8) => Expected: 2, Got: 3',
    bugExplanation: 'return mid + 1  # 🐞 Skew defect: returns offset index',
    solutionExplanation: 'return mid  # ✅ Verified: returns exact pivot index',
    starterCode: `def binary_search(nums: list[int], target: int) -> int:
    low, high = 0, len(nums) - 1
    while low <= high:
        mid = (low + high) // 2
        if nums[mid] == target:
            return mid + 1  # 🐞 BUG: Off-by-one skew!
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
            return mid  # ✅ FIXED: Correct pivot index
        elif nums[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`,
    solved: true
  },
  {
    id: 1,
    ticketCode: 'BUG-001',
    title: 'Two-Sum Lookup Index Skew',
    defectCategory: 'Off-By-One',
    language: 'Python 3.11',
    acceptance: '84.2%',
    difficulty: 'Easy',
    description:
      'Locates indices of pair values summing to target. The memoized dictionary records indices with 1-based indexing, causing array index out-of-bounds in consumer calls.',
    failingAssertion: 'AssertionError: two_sum([2, 7, 11, 15], target=9) => Expected: [0, 1], Got: [0, 2]',
    bugExplanation: 'return [seen[diff], i + 1]  # 🐞 1-based index skew',
    solutionExplanation: 'return [seen[diff], i]  # ✅ Canonical 0-based indexing',
    starterCode: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i in range(len(nums)):
        diff = target - nums[i]
        if diff in seen:
            return [seen[diff], i + 1] # 🐞 Bug: Index skew
        seen[nums[i]] = i
    return []`,
    solutionCode: `def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i in range(len(nums)):
        diff = target - nums[i]
        if diff in seen:
            return [seen[diff], i] # ✅ Fixed: 0-indexed pair
        seen[nums[i]] = i
    return []`,
    solved: false
  },
  {
    id: 146,
    ticketCode: 'BUG-146',
    title: 'LRU Cache Doubly-Linked Pointer Detachment',
    defectCategory: 'Pointers & Memory',
    language: 'Python 3.11',
    acceptance: '52.4%',
    difficulty: 'Hard',
    description:
      'Doubly linked list node eviction routine fails to re-bind preceding pointers, creating circular references and leaking unreachable memory on high-frequency writes.',
    failingAssertion: 'MemoryLeakError: Circular reference detected at node.prev.next during cache eviction',
    bugExplanation: 'node.prev.next = node  # 🐞 Self-referencing cycle breaks doubly linked list',
    solutionExplanation: 'node.prev.next = node.next  # ✅ Proper node disconnection',
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
    ticketCode: 'BUG-206',
    title: 'Reverse Linked List Cycle Inversion',
    defectCategory: 'Pointers & Memory',
    language: 'Python 3.11',
    acceptance: '88.6%',
    difficulty: 'Easy',
    description:
      'Single pass list reversal fails to advance previous pointer, producing an infinite loop during subsequent print and validation runs.',
    failingAssertion: 'TimeLimitExceeded: Infinite loop detected while traversing reversed linked list',
    bugExplanation: 'curr.next = curr  # 🐞 Circular reference loop',
    solutionExplanation: 'curr.next = prev  # ✅ Directed reverse pointer',
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
    ticketCode: 'BUG-300',
    title: 'LIS Dynamic Programming Base Initialization',
    defectCategory: 'DP & State',
    language: 'Python 3.11',
    acceptance: '68.1%',
    difficulty: 'Medium',
    description:
      'Longest increasing subsequence solver initializes DP state array with 0 instead of 1, invalidating base case values for single-element subsequences.',
    failingAssertion: 'AssertionError: length_of_lis([10, 9, 2, 5, 3, 7, 101, 18]) => Expected: 4, Got: 3',
    bugExplanation: 'dp = [0] * len(nums)  # 🐞 Invalid base: singleton length is 1',
    solutionExplanation: 'dp = [1] * len(nums)  # ✅ Base case properly initialized',
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
    ticketCode: 'BUG-1114',
    title: 'Print in Order Mutex Lock Contention Deadlock',
    defectCategory: 'Concurrency',
    language: 'Python 3.11',
    acceptance: '47.9%',
    difficulty: 'Hard',
    description:
      'Concurrent thread synchronization barrier acquires second mutex before first is released, triggering an unrecoverable cyclic deadlock.',
    failingAssertion: 'DeadlockDetected: Thread 2 waiting on Lock 2 held by Thread 1 indefinitely',
    bugExplanation: 'self.lock2.acquire() # 🐞 Inverse lock order causes deadlock',
    solutionExplanation: 'self.lock1.acquire(); self.lock2.release() # ✅ Ordered lock acquisition',
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
    ticketCode: 'BUG-098',
    title: 'Binary Search Tree Duplicate Boundary Permitted',
    defectCategory: 'Trees & Graphs',
    language: 'Python 3.11',
    acceptance: '66.2%',
    difficulty: 'Medium',
    description:
      'BST validation algorithm uses non-strict inequality (<=) allowing duplicate keys on left and right subtrees in violation of strict BST specifications.',
    failingAssertion: 'AssertionError: is_valid_bst([2, 2, 2]) => Expected: False, Got: True',
    bugExplanation: 'if node.val < low or node.val > high: # 🐞 Permitted duplicate values',
    solutionExplanation: 'if not (low < node.val < high): # ✅ Strict inequality enforced',
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
    ticketCode: 'BUG-200',
    title: 'DFS Grid Traversal Recursion Stack Overflow',
    defectCategory: 'Trees & Graphs',
    language: 'Python 3.11',
    acceptance: '71.5%',
    difficulty: 'Medium',
    description:
      '2D island exploration re-assigns cell to unvisited state during traversal, triggering circular recursion and stack overflow on cyclic connected components.',
    failingAssertion: 'RecursionError: maximum recursion depth exceeded while marking connected cells',
    bugExplanation: 'grid[r][c] = "1" # 🐞 Re-marking as land triggers infinite recursion',
    solutionExplanation: 'grid[r][c] = "0" # ✅ Marks as visited water to terminate recursion',
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

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  // Currently Selected Bug Ticket for the Arena Debugger
  const [activeTicket, setActiveTicket] = useState<DebuggingTicket>(TOURNAMENT_BUG_BANK[0]);
  const [hasInjectedDefect, setHasInjectedDefect] = useState(false);
  const [isEvaluatingCode, setIsEvaluatingCode] = useState(false);
  const [simulatedProctorStrike, setSimulatedProctorStrike] = useState<number>(0);
  const [proctorAlertMessage, setProctorAlertMessage] = useState<string | null>(null);

  const filteredTickets = useMemo(() => {
    return TOURNAMENT_BUG_BANK.filter((t) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        t.title.toLowerCase().includes(q) ||
        t.defectCategory.toLowerCase().includes(q) ||
        t.ticketCode.toLowerCase().includes(q) ||
        t.id.toString().includes(q);
      const matchesCat = selectedCategory === 'All' || t.defectCategory === selectedCategory;
      const matchesDiff = selectedDifficulty === 'All' || t.difficulty === selectedDifficulty;
      return matchesSearch && matchesCat && matchesDiff;
    });
  }, [searchQuery, selectedCategory, selectedDifficulty]);

  const handleSelectRandomTicket = () => {
    const rand = TOURNAMENT_BUG_BANK[Math.floor(Math.random() * TOURNAMENT_BUG_BANK.length)];
    setActiveTicket(rand);
    setHasInjectedDefect(false);
    scrollToSection('debugging-arena');
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
    }, 550);
  };

  const handleSimulateViolation = () => {
    setSimulatedProctorStrike((prev) => Math.min(3, prev + 1));
    setProctorAlertMessage('TELEMETRY ALERT: window.onblur event captured! Focus-lock strike recorded.');
    setTimeout(() => {
      setProctorAlertMessage(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0e17] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black relative overflow-x-hidden font-sans transition-colors duration-200">
      {/* Background Matrix & Subtle Gradient Mesh */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(#f59e0b 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

      {/* ========================================================= */}
      {/* 1. TOP STATUS TICKER (LEETCODE / HACKERRANK STYLE)        */}
      {/* ========================================================= */}
      <div className="w-full bg-slate-100 dark:bg-[#070a10] border-b border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 py-1.5 px-4 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none whitespace-nowrap gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>LIVE CONTEST: WEEKLY SPRINT #24</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>1,420 Active Collegiate Sandboxes</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden md:inline">|</span>
            <span className="hidden md:inline text-slate-500 dark:text-slate-400">Sandbox: Pyodide WASM v314.0</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-slate-500 dark:text-slate-400">Proctor: KIOSK_LEVEL_3</span>
            <span className="text-slate-300 dark:text-slate-700 hidden lg:inline">|</span>
            <button
              onClick={() => openTopic('system-status')}
              className="text-amber-600 dark:text-amber-400 hover:underline transition-colors flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Cluster Status</span>
              <Activity className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. LEETCODE / HACKERRANK NAVIGATION BAR                   */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#0d121f]/95 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Identity & Main Nav Tabs */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => scrollToSection('tournament-banner')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
                <Bug className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                DebugArena
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-bold border border-amber-500/25">
                  TOURNAMENT
                </span>
              </span>
            </div>

            {/* LeetCode Section Navigation Links */}
            <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <button
                onClick={() => scrollToSection('problem-list')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold"
              >
                <span>Bug Repository</span>
              </button>
              <button
                onClick={() => scrollToSection('tournament-banner')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Live Contest</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              </button>
              <button
                onClick={() => scrollToSection('debugging-arena')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Arena Debugger</span>
              </button>
              <button
                onClick={() => scrollToSection('leaderboard')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Scoreboard</span>
              </button>
              <button
                onClick={() => scrollToSection('kiosk-defense')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Anti-Cheat</span>
              </button>
              <button
                onClick={() => scrollToSection('verification')}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Verify Proofs</span>
              </button>
            </nav>
          </div>

          {/* Right Action Tools (Theme, Streak, Contest Join, Organizer) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Daily Streak Flame */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 font-mono text-[11px] font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span>12-Day Streak</span>
            </div>

            {/* Universal Theme Toggle */}
            <ThemeToggle />

            {/* Organizer Sign In */}
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="hidden lg:inline-flex h-9 px-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-all items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Host Contest</span>
            </button>

            {/* Enter Contest Lobby */}
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
              className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 transition-all cursor-pointer"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white/98 dark:bg-[#0d121f]/98 px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200 shadow-xl">
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <button
                onClick={() => {
                  scrollToSection('problem-list');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Bug Repository
              </button>
              <button
                onClick={() => {
                  scrollToSection('tournament-banner');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Live Contest
              </button>
              <button
                onClick={() => {
                  scrollToSection('debugging-arena');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
              >
                Arena Debugger
              </button>
              <button
                onClick={() => {
                  scrollToSection('leaderboard');
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left hover:text-amber-500"
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
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4 text-amber-500" />
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

      {/* Main Competitive Platform Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ========================================================= */}
        {/* 3. TOURNAMENT LIVE BANNER (LEETCODE CONTEST STYLE)        */}
        {/* ========================================================= */}
        <section
          id="tournament-banner"
          className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-white dark:from-[#12192c] dark:via-[#0d1322] dark:to-[#0a0e17] border border-amber-300/80 dark:border-amber-500/30 shadow-xl relative overflow-hidden transition-colors"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Col: Tournament Info */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>WEEKLY CONTEST #24: ROUND 2 IN PROGRESS</span>
                </span>
                <span className="text-slate-400 dark:text-slate-600 text-xs hidden sm:inline">•</span>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>1,420 Contestants Active</span>
                </span>
                <span className="text-slate-400 dark:text-slate-600 text-xs hidden sm:inline">•</span>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">124 Colleges</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Collegiate Algorithmic Debugging Championship
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-2xl">
                Contestants diagnose and patch pre-existing broken codebases under server-synchronized clocks. 
                Full in-browser Pyodide WASM execution with zero server lag and strict kiosk anti-cheat enforcement.
              </p>

              {/* Tournament Progression Pipeline */}
              <div className="pt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800">
                  Stage 1: MCQ Filter (15m)
                </span>
                <span className="text-slate-400 dark:text-slate-600">&rarr;</span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold">
                  Stage 2: Live Bug Patching (45m)
                </span>
                <span className="text-slate-400 dark:text-slate-600">&rarr;</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800">
                  Stage 3: Sudden Death (10m)
                </span>
              </div>
            </div>

            {/* Right Col: Live Countdown & Action Buttons */}
            <div className="lg:col-span-4 flex flex-col items-stretch gap-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between font-mono shadow-sm">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Round 2 Time Remaining</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">00:44:18</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Target Patches</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">3 Bug Tickets</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsJoinModalOpen(true)}
                  className="flex-1 h-11 px-4 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/20 transition-all inline-flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Trophy className="w-4 h-4 text-slate-950 shrink-0" />
                  <span>Enter Contest Lobby</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 shrink-0" />
                </button>

                <button
                  onClick={handleSelectRandomTicket}
                  className="h-11 px-3.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 shadow-sm"
                  title="Random Bug Challenge"
                >
                  <Shuffle className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">Pick Bug</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* 4. BUG REPOSITORY & ISSUE BANK TABLE (LEETCODE TABLE)    */}
        {/* ========================================================= */}
        <section id="problem-list" className="space-y-3">
          {/* Section Heading & Category Filter Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Tournament Bug Repository & Issue Bank</span>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs">
                  {filteredTickets.length} Defect Tickets
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Diagnose runtime defects, memory leaks, and concurrency hazards. Click any ticket to load it into the arena below.
              </p>
            </div>

            {/* Category Tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
              {['All', 'Off-By-One', 'Pointers & Memory', 'Concurrency', 'DP & State', 'Trees & Graphs'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-8 px-3 rounded-xl text-xs font-mono font-medium transition-all cursor-pointer whitespace-nowrap flex items-center ${
                    selectedCategory === cat
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white shadow-sm'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Symmetrical Search & Filter Toolbar (All Elements h-10 Aligned) */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 bg-white dark:bg-[#0d121f] p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            {/* Search Input (h-10) */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by bug title, category, ticket code (e.g. BUG-042)..."
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Difficulty Dropdown (h-10) */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

              {/* Shuffle Button (h-10) */}
              <button
                onClick={handleSelectRandomTicket}
                className="h-10 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold font-mono transition-all border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                title="Shuffle Random Bug Ticket"
              >
                <Shuffle className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Pick One</span>
              </button>
            </div>
          </div>

          {/* High-Density LeetCode Table with Strict Alignments */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 select-none">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">Status</th>
                    <th className="py-3 px-3 w-20">Ticket</th>
                    <th className="py-3 px-4">Defect Specification & Title</th>
                    <th className="py-3 px-3 w-40 hidden md:table-cell">Fault Category</th>
                    <th className="py-3 px-3 w-28 hidden lg:table-cell">Language</th>
                    <th className="py-3 px-3 w-24 text-center">Acceptance</th>
                    <th className="py-3 px-3 w-24 text-center">Difficulty</th>
                    <th className="py-3 px-4 w-28 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTickets.map((t) => {
                    const isSelected = activeTicket.id === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => {
                          setActiveTicket(t);
                          setHasInjectedDefect(false);
                          scrollToSection('debugging-arena');
                        }}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-amber-500/10 dark:bg-amber-500/15'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                        }`}
                      >
                        {/* Status Icon */}
                        <td className="py-3 px-3 text-center align-middle">
                          {t.solved ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <span className="text-slate-400 dark:text-slate-600 block text-center">-</span>
                          )}
                        </td>

                        {/* Ticket Code */}
                        <td className="py-3 px-3 text-slate-500 font-bold align-middle whitespace-nowrap">
                          {t.ticketCode}
                        </td>

                        {/* Title & Failing Assertion */}
                        <td className="py-3 px-4 align-middle">
                          <div className="font-sans font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-sm">
                            {t.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-xs sm:max-w-md lg:max-w-lg">
                            {t.failingAssertion}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 hidden md:table-cell align-middle">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] whitespace-nowrap">
                            {t.defectCategory}
                          </span>
                        </td>

                        {/* Language */}
                        <td className="py-3 px-3 hidden lg:table-cell text-slate-500 dark:text-slate-400 align-middle whitespace-nowrap">
                          {t.language}
                        </td>

                        {/* Acceptance */}
                        <td className="py-3 px-3 text-center text-slate-700 dark:text-slate-300 font-semibold align-middle whitespace-nowrap">
                          {t.acceptance}
                        </td>

                        {/* Difficulty */}
                        <td className="py-3 px-3 text-center align-middle">
                          <span
                            className={`w-18 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border text-center ${
                              t.difficulty === 'Easy'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : t.difficulty === 'Medium'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {t.difficulty}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-right align-middle">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTicket(t);
                              setHasInjectedDefect(false);
                              scrollToSection('debugging-arena');
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer whitespace-nowrap"
                          >
                            Diagnose
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
        {/* 5. INTERACTIVE SPLIT-SCREEN ARENA DEBUGGER                */}
        {/* ========================================================= */}
        <section id="debugging-arena" className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-slate-500 font-bold">Active Bug Ticket:</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {activeTicket.ticketCode} — {activeTicket.title}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                PYODIDE 3.11 WASM WORKER ACTIVE
              </span>
            </div>
          </div>

          {/* Equal-Height Split Workspace (Symmetrical 5-7 Columns, Balanced Height) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f] overflow-hidden shadow-xl">
            {/* Left Pane: Problem Spec & Bug Report (Balanced Height) */}
            <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between h-[540px]">
              <div className="space-y-3 overflow-y-auto pr-1">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {activeTicket.ticketCode}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      activeTicket.difficulty === 'Easy'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : activeTicket.difficulty === 'Medium'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {activeTicket.difficulty}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {activeTicket.title}
                </div>

                <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Defect: {activeTicket.defectCategory}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Acceptance: {activeTicket.acceptance}
                  </span>
                </div>

                {/* Bug Specification Body */}
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans space-y-2.5">
                  <p>{activeTicket.description}</p>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] space-y-1">
                    <div className="text-rose-600 dark:text-rose-400 font-bold uppercase text-[10px] flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Failing Assertion Telemetry:</span>
                    </div>
                    <code className="text-slate-700 dark:text-slate-300 text-[10px] block break-all leading-tight">
                      {activeTicket.failingAssertion}
                    </code>
                  </div>
                </div>
              </div>

              {/* Tournament Constraints Bar */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 space-y-1 shrink-0">
                <div className="font-bold uppercase text-slate-600 dark:text-slate-400">Tournament Invariants:</div>
                <div className="flex items-center justify-between">
                  <span>Execution Limit: 2,000ms</span>
                  <span>Isolation: WASM Heap</span>
                </div>
              </div>
            </div>

            {/* Right Pane: Code Editor & Judge Results (Balanced Height) */}
            <div className="lg:col-span-7 p-5 flex flex-col justify-between h-[540px] bg-slate-900 text-slate-100">
              {/* Toolbar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs font-mono shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 font-bold">solution.py</span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">{activeTicket.language}</span>
                </div>

                {/* Defect Toggle */}
                <button
                  onClick={() => setHasInjectedDefect(!hasInjectedDefect)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                    hasInjectedDefect
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {hasInjectedDefect ? '✅ View Solution Patch' : '🐞 View Faulty Starter Code'}
                </button>
              </div>

              {/* Code Pre Container (Equal Height Flex Scroll) */}
              <div className="my-3 p-3.5 rounded-2xl bg-[#06080f] border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-y-auto flex-1">
                <pre className="whitespace-pre">
                  {hasInjectedDefect ? activeTicket.starterCode : activeTicket.solutionCode}
                </pre>
              </div>

              {/* Diagnostics Explanation Pill */}
              <div
                className={`p-2 rounded-xl border text-[11px] font-mono flex items-center gap-2 shrink-0 ${
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
                <span className="truncate">
                  {hasInjectedDefect ? activeTicket.bugExplanation : activeTicket.solutionExplanation}
                </span>
              </div>

              {/* Action Controls & Real-Time Judge Feedback */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-500">Judge Verdict:</span>
                  <span
                    className={`font-mono text-xs font-bold ${
                      hasInjectedDefect ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {hasInjectedDefect ? 'Wrong Answer (Assertion Skew)' : 'Accepted (24 ms, Beats 97.4%)'}
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
        {/* 6. COLLEGIATE CONTEST SCOREBOARD (HACKERRANK STYLE)       */}
        {/* ========================================================= */}
        <section id="leaderboard" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Inter-Collegiate Contest Standings</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official tournament leaderboard sorted by points and submission timestamp penalty.
              </p>
            </div>

            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer font-mono shadow-sm"
            >
              Enter Contest Lobby &rarr;
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0d121f] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4">Contestant</th>
                    <th className="py-3 px-4">University / Engineering College</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Time Taken</th>
                    <th className="py-3 px-4 text-center">Bugs Patched</th>
                    <th className="py-3 px-4 text-right">Verifiable Credential</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {[
                    { rank: 1, name: 'Ananya Sharma', college: 'Stanford University', score: '380 pts', time: '18m 12s', patches: '3 of 3', cert: 'CERT-DEBUG-2026-A1' },
                    { rank: 2, name: 'Karthik Raja', college: 'CEG Anna University', score: '365 pts', time: '21m 04s', patches: '3 of 3', cert: 'CERT-ACM-STANFORD-04' },
                    { rank: 3, name: 'David Chen', college: 'MIT EECS', score: '350 pts', time: '22m 30s', patches: '3 of 3', cert: 'CERT-MIT-2026-X8' },
                    { rank: 4, name: 'Elena Rostova', college: 'Cambridge Computer Lab', score: '340 pts', time: '24m 15s', patches: '2 of 3', cert: 'CERT-CAMB-2026-Q2' },
                    { rank: 5, name: 'Rohan Gupta', college: 'IIT Madras', score: '325 pts', time: '25m 48s', patches: '2 of 3', cert: 'CERT-IITM-2026-P9' }
                  ].map((entry) => (
                    <tr key={entry.rank} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-4 text-center align-middle">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                            entry.rank === 1
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40'
                              : entry.rank === 2
                              ? 'bg-slate-200 dark:bg-slate-300/20 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-400/40'
                              : entry.rank === 3
                              ? 'bg-amber-700/20 text-amber-700 dark:text-amber-400 border border-amber-700/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white font-sans align-middle">{entry.name}</td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 align-middle">{entry.college}</td>
                      <td className="py-3 px-4 text-center text-amber-600 dark:text-amber-400 font-bold align-middle">{entry.score}</td>
                      <td className="py-3 px-4 text-center text-slate-500 dark:text-slate-400 align-middle">{entry.time}</td>
                      <td className="py-3 px-4 text-center align-middle">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          {entry.patches}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = `/verify-cert/${encodeURIComponent(entry.cert)}`;
                          }}
                          className="text-cyan-600 dark:text-cyan-400 hover:underline text-[11px] cursor-pointer font-bold"
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
        {/* 7. KIOSK PROCTORING & PUBLIC VERIFICATION CARDS           */}
        {/* ========================================================= */}
        <section id="kiosk-defense" className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Proctoring Defense Card */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-rose-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Hardware Kiosk Anti-Cheat Lock</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-mono border border-rose-500/30">
                LEVEL 3 ENFORCED
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Browser-enforced fullscreen lock and telemetry monitoring traps focus-blur events, tab switching, and clipboard pasting with automatic multi-strike disqualification.
            </p>

            {proctorAlertMessage && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{proctorAlertMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
              <span className="text-slate-500 dark:text-slate-400">Recorded Strikes: <strong className="text-slate-900 dark:text-white">{simulatedProctorStrike} / 3</strong></span>
              <button
                onClick={handleSimulateViolation}
                className="px-3 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-[11px] font-bold cursor-pointer active:scale-95"
              >
                Simulate Tab Blur
              </button>
            </div>
          </div>

          {/* Certificate Authenticator Card */}
          <div id="verification" className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-cyan-500" />
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Authenticate Credentials</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-[10px] font-mono border border-cyan-500/30">
                SHA-256 PROOFS
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              Recruiters and universities can verify cryptographic certificate signatures, official ranks, and tournament timestamps without requiring an account.
            </p>

            <form onSubmit={handleVerifyCert} className="flex gap-2">
              <input
                type="text"
                value={certLookupId}
                onChange={(e) => setCertLookupId(e.target.value)}
                placeholder="Enter Certificate ID (e.g. CERT-DEBUG-2026-A1)"
                className="flex-1 h-9 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="h-9 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer whitespace-nowrap"
              >
                Verify
              </button>
            </form>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
              <span>Sample:</span>
              <button
                type="button"
                onClick={() => setCertLookupId('CERT-DEBUG-2026-A1')}
                className="text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
              >
                CERT-DEBUG-2026-A1
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================= */}
      {/* 8. LEETCODE CLEAN DEVELOPER FOOTER                        */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#06080e] pt-10 pb-8 text-slate-500 dark:text-slate-400 text-xs mt-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Col 1 */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black">
                  <Bug className="w-3 h-3 text-slate-950 stroke-[2.5]" />
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm">DebugArena</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                The collegiate debugging tournament platform. Dedicated to testing real software defect diagnosis and algorithmic optimization.
              </p>
              <button
                type="button"
                onClick={() => openTopic('system-status')}
                className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer font-medium"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>All Tournament Clusters Operational</span>
              </button>
            </div>

            {/* Col 2 */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Platform Specs</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => openTopic('code-sandbox')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Pyodide WASM Engine</button></li>
                <li><button onClick={() => openTopic('kiosk-proctoring')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Focus-Lock Kiosk Specs</button></li>
                <li><button onClick={() => openTopic('multi-stage-rounds')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">3-Round Tournament Rules</button></li>
                <li><button onClick={() => openTopic('cryptographic-credentials')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">SHA-256 Proof Validation</button></li>
                <li><button onClick={() => openTopic('question-bank')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Defect Repository Matrix</button></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Tournament Portals</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => setIsJoinModalOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer text-amber-600 dark:text-amber-400 font-semibold">Enter Contest Lobby &rarr;</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Organizer Control Room</button></li>
                <li><button onClick={() => setIsAdminModalOpen(true)} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Create College Workspace</button></li>
                <li><button onClick={() => openTopic('organizer-dispatch')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Campus Host Checklist</button></li>
                <li><button onClick={() => scrollToSection('verification')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Public Certificate Lookup</button></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-2">
              <div className="font-bold text-slate-900 dark:text-white uppercase text-[11px] font-mono">Integrity & Legal</div>
              <ul className="space-y-1 text-[11px]">
                <li><button onClick={() => openTopic('anti-cheat-guidelines')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Anti-Cheat Rulebook</button></li>
                <li><button onClick={() => openTopic('academic-honor-code')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Collegiate Honor Code</button></li>
                <li><button onClick={() => openTopic('security-standards')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Passkey Authentication</button></li>
                <li><button onClick={() => openTopic('privacy-policy')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Privacy Policy</button></li>
                <li><button onClick={() => openTopic('terms-of-service')} className="hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer">Terms of Competition</button></li>
              </ul>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
            <div>&copy; {new Date().getFullYear()} DebugArena Tournament System. Built for competitive debugging.</div>
            <div className="flex items-center gap-3">
              <button onClick={() => openTopic('academic-license')} className="hover:text-slate-700 dark:hover:text-slate-400">Academic License</button>
              <span>•</span>
              <button onClick={() => openTopic('system-status')} className="hover:text-slate-700 dark:hover:text-slate-400">Cluster Telemetry</button>
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
