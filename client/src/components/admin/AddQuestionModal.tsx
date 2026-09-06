import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Code2,
  AlertOctagon,
  Dna,
  Clock,
  Award,
  Sparkles,
  Layers,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { api } from '../../services/api.js';

interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionAdded: () => void;
}

const TOPIC_PRESETS = [
  'Algorithms',
  'Arrays',
  'Strings',
  'Binary Search',
  'Linked Lists',
  'Dynamic Programming',
  'Recursion',
  'Pointers & Memory',
  'Concurrency',
  'SQL',
  'Aptitude & Logic'
];

const BUG_CATEGORIES = [
  { id: 'off_by_one', label: 'Off-By-One Boundary Error' },
  { id: 'null_pointer', label: 'Null Pointer Dereference' },
  { id: 'wrong_condition', label: 'Wrong Logical Condition' },
  { id: 'incorrect_loop', label: 'Incorrect Loop Termination' },
  { id: 'wrong_operator', label: 'Wrong Operator Precedence' },
  { id: 'type_conversion', label: 'Type Conversion / Coercion' },
  { id: 'recursion', label: 'Missing Base Case / Recursion Depth' },
  { id: 'memory_issue', label: 'Memory Leak / Dangling Pointer' },
  { id: 'concurrency', label: 'Race Condition / Thread Safety' },
  { id: 'exception_handling', label: 'Unhandled Exception / Stack Underflow' }
];

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  onQuestionAdded
}) => {
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('Algorithms');
  const [customTopic, setCustomTopic] = useState('');
  const [language, setLanguage] = useState('python');
  const [type, setType] = useState<'debugging' | 'coding' | 'mcq' | 'sql' | 'aptitude'>('debugging');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [marks, setMarks] = useState(20);
  const [expectedSolveTimeMinutes, setExpectedSolveTimeMinutes] = useState(15);
  const [skillTagsInput, setSkillTagsInput] = useState('Debugging, Logic');
  const [prompt, setPrompt] = useState('');
  const [explanation, setExplanation] = useState('');

  // MCQ State
  const [options, setOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);

  // Coding / Debugging State
  const [starterCode, setStarterCode] = useState('');
  const [testCases, setTestCases] = useState([
    { input: '', output: '', isHidden: false, weight: 10 },
    { input: '', output: '', isHidden: true, weight: 10 }
  ]);

  // Question DNA State
  const [hasDnaMutation, setHasDnaMutation] = useState(false);
  const [bugCategory, setBugCategory] = useState('off_by_one');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddOption = () => {
    setOptions([...options, { text: '', isCorrect: false }]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      alert('An MCQ question requires at least 2 options.');
      return;
    }
    const filtered = options.filter((_, i) => i !== index);
    if (!filtered.some(o => o.isCorrect)) {
      filtered[0].isCorrect = true;
    }
    setOptions(filtered);
  };

  const handleSetCorrectOption = (index: number) => {
    setOptions(options.map((opt, i) => ({ ...opt, isCorrect: i === index })));
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', output: '', isHidden: false, weight: 10 }]);
  };

  const handleRemoveTestCase = (index: number) => {
    if (testCases.length <= 1) {
      alert('A coding/debugging challenge must have at least 1 test case.');
      return;
    }
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const resolvedTopic = topic === '__custom__' ? customTopic.trim() : topic;
    if (!title.trim()) {
      setError('Please provide a challenge title.');
      return;
    }
    if (!resolvedTopic) {
      setError('Please provide or select a topic.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please provide the problem statement prompt.');
      return;
    }

    if (type === 'mcq') {
      const emptyOptions = options.some(o => !o.text.trim());
      if (emptyOptions) {
        setError('Please fill in text for all MCQ options.');
        return;
      }
      if (!options.some(o => o.isCorrect)) {
        setError('Please select one correct answer option.');
        return;
      }
    }

    if (type === 'coding' || type === 'debugging') {
      const emptyOutputs = testCases.some(tc => !tc.output.trim());
      if (emptyOutputs) {
        setError('Please provide expected outputs for all test cases.');
        return;
      }
    }

    const tags = skillTagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    setLoading(true);
    try {
      const payload: any = {
        title: title.trim(),
        topic: resolvedTopic,
        language,
        type,
        difficulty,
        marks: Math.max(1, Number(marks) || 20),
        expectedSolveTimeMinutes: Math.max(1, Number(expectedSolveTimeMinutes) || 15),
        skillTags: tags,
        prompt: prompt.trim(),
        explanation: explanation.trim(),
        hasDnaMutation
      };

      if (type === 'mcq') {
        payload.options = options.map(o => ({ text: o.text.trim(), isCorrect: o.isCorrect }));
      } else {
        payload.allowedLanguages = [language, 'python', 'cpp', 'java', 'javascript', 'c'].filter((v, i, a) => a.indexOf(v) === i);
        payload.starterCode = {
          [language]: starterCode.trim()
        };
        payload.testCases = testCases.map(tc => ({
          input: tc.input,
          output: tc.output.trim(),
          isHidden: Boolean(tc.isHidden),
          weight: Math.max(1, Number(tc.weight) || 10)
        }));
      }

      if (hasDnaMutation) {
        payload.dnaConfig = {
          bugCategory,
          codeTemplate: starterCode.trim() || `// Template for ${title}\n`
        };
      }

      await api.post('/admin/questions/bank', payload);
      onQuestionAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save question to bank.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0c1220] border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl my-8 max-h-[92vh] overflow-y-auto text-left">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Add Question to Bank</h2>
              <p className="text-xs text-slate-400">Create reusable challenge templates for tournament rounds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title & Topic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Challenge Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Fix Subarray Reversal Off-by-One"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Topic / Category</label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {TOPIC_PRESETS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="__custom__">+ Custom Topic...</option>
              </select>
              {topic === '__custom__' && (
                <input
                  type="text"
                  placeholder="Enter custom topic name..."
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  className="mt-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  required
                />
              )}
            </div>
          </div>

          {/* Type, Language, Difficulty */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Challenge Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="debugging">Code Debugging</option>
                <option value="coding">Full Coding</option>
                <option value="mcq">MCQ Question</option>
                <option value="sql">SQL Query</option>
                <option value="aptitude">Aptitude & Logic</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="python">Python 3</option>
                <option value="cpp">C++ (GCC)</option>
                <option value="java">Java 17</option>
                <option value="javascript">JavaScript</option>
                <option value="c">C (GCC)</option>
                <option value="sql">SQL</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Marks, Solve Time, Skill Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Marks / Points</label>
              <input
                type="number"
                min={5}
                max={500}
                value={marks}
                onChange={e => setMarks(parseInt(e.target.value, 10) || 20)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Expected Time (mins)</label>
              <input
                type="number"
                min={2}
                max={180}
                value={expectedSolveTimeMinutes}
                onChange={e => setExpectedSolveTimeMinutes(parseInt(e.target.value, 10) || 15)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Skill Tags (comma-sep)</label>
              <input
                type="text"
                placeholder="Arrays, Pointers, Off-by-One"
                value={skillTagsInput}
                onChange={e => setSkillTagsInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Problem Statement Prompt */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Problem Statement / Prompt (Markdown supported)
            </label>
            <textarea
              rows={4}
              required
              placeholder="Describe the problem, input/output formats, and the buggy behavior..."
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-purple-500 leading-relaxed resize-y"
            />
          </div>

          {/* MCQ Options Section */}
          {type === 'mcq' && (
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-purple-400" /> Options & Correct Answer
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Option
                </button>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetCorrectOption(idx)}
                      className={`w-5 h-5 rounded-full border flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                        opt.isCorrect
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-700 bg-slate-900 hover:border-slate-500'
                      }`}
                      title={opt.isCorrect ? 'Correct Answer' : 'Click to mark as correct answer'}
                    >
                      {opt.isCorrect && <div className="w-2 h-2 rounded-full bg-white" />}
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-400 w-4">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <input
                      type="text"
                      placeholder={`Option ${String.fromCharCode(65 + idx)} text...`}
                      value={opt.text}
                      onChange={e => {
                        const updated = [...options];
                        updated[idx].text = e.target.value;
                        setOptions(updated);
                      }}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Answer Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain why the answer is correct..."
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Coding / Debugging Starter Code & Test Cases */}
          {type !== 'mcq' && (
            <div className="space-y-4">
              {/* Starter Code */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Starter Code ({language})</span>
                  <span className="text-[10px] text-slate-500">Provide the baseline code containing the bug</span>
                </label>
                <textarea
                  rows={6}
                  placeholder={`// Starter code in ${language}\n#include <iostream>\n...`}
                  value={starterCode}
                  onChange={e => setStarterCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-purple-500 leading-relaxed resize-y"
                />
              </div>

              {/* Test Cases */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-400" /> Evaluation Test Cases
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Test Case
                  </button>
                </div>

                <div className="space-y-2.5">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-300 font-mono">Case #{idx + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-1.5 text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={e => {
                                const updated = [...testCases];
                                updated[idx].isHidden = e.target.checked;
                                setTestCases(updated);
                              }}
                              className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-0 w-3.5 h-3.5"
                            />
                            <span>Hidden Case</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Weight:</span>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={tc.weight}
                              onChange={e => {
                                const updated = [...testCases];
                                updated[idx].weight = parseInt(e.target.value, 10) || 10;
                                setTestCases(updated);
                              }}
                              className="w-12 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white text-center font-mono"
                            />
                          </div>
                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(idx)}
                              className="text-slate-500 hover:text-rose-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Input (stdin)</label>
                          <textarea
                            rows={2}
                            placeholder="Input values..."
                            value={tc.input}
                            onChange={e => {
                              const updated = [...testCases];
                              updated[idx].input = e.target.value;
                              setTestCases(updated);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-white font-mono resize-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">Expected Output (stdout)</label>
                          <textarea
                            rows={2}
                            placeholder="Expected output..."
                            value={tc.output}
                            onChange={e => {
                              const updated = [...testCases];
                              updated[idx].output = e.target.value;
                              setTestCases(updated);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs text-emerald-400 font-mono resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question DNA (Parametric Mutation Toggle) */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                      <Dna className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Question DNA & Mutation Engine</span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded font-mono">USP</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Generate randomized bug variations to eliminate cheat vectors</p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasDnaMutation}
                      onChange={e => setHasDnaMutation(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-0 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-purple-300">Enable DNA</span>
                  </label>
                </div>

                {hasDnaMutation && (
                  <div className="pt-2 border-t border-purple-500/20">
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Bug Category Classification
                    </label>
                    <select
                      value={bugCategory}
                      onChange={e => setBugCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      {BUG_CATEGORIES.map(b => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Adding Question...' : 'Add Question to Bank'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
