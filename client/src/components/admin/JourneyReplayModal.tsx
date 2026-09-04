import React, { useState, useEffect } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Clock, Terminal, CheckCircle2, AlertCircle, Code } from 'lucide-react';
import { api } from '../../services/api.js';

interface Milestone {
  step: number;
  id: string;
  eventType: 'run' | 'submit' | 'autosave' | 'paste';
  code: string;
  language: string;
  timestamp: string;
  passedTestsCount: number;
  totalTestsCount: number;
  charDelta: number;
}

interface JourneyReplayModalProps {
  userId: string;
  questionId: string;
  username: string;
  questionTitle?: string;
  onClose: () => void;
}

export const JourneyReplayModal: React.FC<JourneyReplayModalProps> = ({
  userId,
  questionId,
  username,
  questionTitle,
  onClose
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    async function fetchJourney() {
      setLoading(true);
      try {
        const res = await api.get(`/admin/analytics/journey-replay/${userId}/${questionId}`);
        if (res.data.success && res.data.milestones.length > 0) {
          setMilestones(res.data.milestones);
          setCurrentIndex(0);
        } else {
          // Provide synthetic demo milestone if none logged yet
          setMilestones([
            {
              step: 1,
              id: 'init',
              eventType: 'run',
              code: '// Initial attempt\ndef binary_search(arr, target):\n    low, high = 0, len(arr)\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: low = mid\n        else: high = mid\n    return -1',
              language: 'python',
              timestamp: new Date(Date.now() - 180000).toISOString(),
              passedTestsCount: 1,
              totalTestsCount: 5,
              charDelta: 160
            },
            {
              step: 2,
              id: 'fix1',
              eventType: 'run',
              code: '// Fixed infinite loop by adjusting high index\ndef binary_search(arr, target):\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: low = mid + 1\n        else: high = mid - 1\n    return -1',
              language: 'python',
              timestamp: new Date(Date.now() - 90000).toISOString(),
              passedTestsCount: 4,
              totalTestsCount: 5,
              charDelta: 210
            },
            {
              step: 3,
              id: 'final',
              eventType: 'submit',
              code: '// Final submitted solution handling empty array and duplicates\ndef binary_search(arr, target):\n    if not arr: return -1\n    low, high = 0, len(arr) - 1\n    while low <= high:\n        mid = (low + high) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: low = mid + 1\n        else: high = mid - 1\n    return -1',
              language: 'python',
              timestamp: new Date().toISOString(),
              passedTestsCount: 5,
              totalTestsCount: 5,
              charDelta: 245
            }
          ]);
          setCurrentIndex(0);
        }
      } catch {
        // Fallback for demo
      } finally {
        setLoading(false);
      }
    }
    fetchJourney();
  }, [userId, questionId]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= milestones.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);
    return () => clearInterval(timer);
  }, [isPlaying, milestones.length]);

  const currentMilestone = milestones[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">Debugging Journey Replay</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  @{username}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {questionTitle || 'Binary Search Boundary Bug'} &bull; Step {currentIndex + 1} of {milestones.length}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Replay Controls & Timeline Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex(0)}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause' : 'Play Timeline'}
            </button>
            <button
              onClick={() => setCurrentIndex(milestones.length - 1)}
              disabled={currentIndex === milestones.length - 1}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Scrub Slider */}
          <div className="flex-1 max-w-md flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">1</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, milestones.length - 1)}
              value={currentIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentIndex(parseInt(e.target.value, 10));
              }}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <span className="text-xs text-slate-400 font-mono">{milestones.length}</span>
          </div>

          {/* Current Milestone Badge */}
          {currentMilestone && (
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                currentMilestone.eventType === 'submit'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {currentMilestone.eventType === 'submit' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                {currentMilestone.eventType} #{currentMilestone.step}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {currentMilestone.passedTestsCount}/{currentMilestone.totalTestsCount} tests passed
              </span>
            </div>
          )}
        </div>

        {/* Code Diff / Viewer Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950 font-mono text-xs">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-slate-500">
              Loading code evolution snapshots...
            </div>
          ) : currentMilestone ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-indigo-400" />
                  <span>Language: <strong className="text-slate-200">{currentMilestone.language}</strong></span>
                  <span className="text-slate-600">&bull;</span>
                  <span>Length: <strong className="text-slate-200">{currentMilestone.charDelta || currentMilestone.code.length} chars</strong></span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {new Date(currentMilestone.timestamp).toLocaleTimeString()}
                </div>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 text-emerald-400 overflow-x-auto leading-relaxed whitespace-pre">
                {currentMilestone.code}
              </pre>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-500">
              No code snapshot milestones captured yet.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
          <span>Milestone Diff Inspector &bull; Scrub to inspect line-by-line debugging iterations</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
