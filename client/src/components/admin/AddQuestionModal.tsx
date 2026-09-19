import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Code2,
  Database
} from 'lucide-react';
import { api, updateQuestionTemplate, createQuestionDirect } from '../../services/api.js';

export interface AddQuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionAdded: (template?: any) => void;
  editingTemplate?: any | null;
  targetRoundNumber?: number;
  targetEventId?: string;
  initialType?: 'mcq' | 'coding' | 'sql' | 'debugging';
}

const TOPIC_PRESETS = [
  'Algorithms',
  'Arrays',
  'Strings',
  'Sliding Window',
  'Two Pointers',
  'Binary Search',
  'Linked Lists',
  'Dynamic Programming',
  'Recursion',
  'Pointers & Memory',
  'Concurrency',
  'SQL',
  'Debugging & Logic'
];

const DEFAULT_STARTER_CODES: Record<string, string> = {
  java: `import java.util.*;

public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (!sc.hasNextInt()) return;
        int n = sc.nextInt();
        // Read input data
        System.out.println(n);
    }
}`,
  python: `import sys

def main():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    n = int(input_data[0])
    # Read input data
    print(n)

if __name__ == '__main__':
    main()`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    int n;
    if (!(cin >> n)) return 0;
    // Read input data
    cout << n << "\\n";
    return 0;
}`,
  c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    // Read input data
    printf("%d\\n", n);
    return 0;
}`,
  javascript: `const fs = require('fs');

function main() {
    const input = fs.readFileSync(0, 'utf-8').trim().split(/\\s+/);
    if (!input || input.length === 0 || input[0] === '') return;
    const n = parseInt(input[0], 10);
    // Read input data
    console.log(n);
}

main();`
};

export const AddQuestionModal: React.FC<AddQuestionModalProps> = ({
  isOpen,
  onClose,
  onQuestionAdded,
  editingTemplate = null,
  targetRoundNumber,
  targetEventId,
  initialType = 'coding'
}) => {
  const [type, setType] = useState<'mcq' | 'coding' | 'sql' | 'debugging'>('coding');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('Algorithms');
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [marks, setMarks] = useState(20);
  const [expectedSolveTimeMinutes, setExpectedSolveTimeMinutes] = useState(15);
  const [skillTagsInput, setSkillTagsInput] = useState('Algorithms, Logic');

  // Problem statement & format fields
  const [prompt, setPrompt] = useState('');
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [constraints, setConstraints] = useState('');
  const [timeLimitMs, setTimeLimitMs] = useState(2000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [explanation, setExplanation] = useState('');

  // MCQ state
  const [options, setOptions] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);

  // Multi-language coding/debugging state
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(['java', 'python', 'cpp', 'c', 'javascript']);
  const [activeCodeTab, setActiveCodeTab] = useState<string>('java');
  const [starterCodes, setStarterCodes] = useState<Record<string, string>>({ ...DEFAULT_STARTER_CODES });

  // Test cases
  const [testCases, setTestCases] = useState<Array<{ input: string; output: string; isHidden: boolean; weight: number }>>([
    { input: '', output: '', isHidden: false, weight: 10 },
    { input: '', output: '', isHidden: true, weight: 10 }
  ]);

  // SQL specific state
  const [schemaDdl, setSchemaDdl] = useState('');
  const [sampleData, setSampleData] = useState('');
  const [expectedQuery, setExpectedQuery] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTemplate) {
      setTitle(editingTemplate.title || '');
      const t = editingTemplate.topic || 'Algorithms';
      if (TOPIC_PRESETS.includes(t)) {
        setTopic(t);
        setCustomTopic('');
      } else {
        setTopic('__custom__');
        setCustomTopic(t);
      }
      setType(editingTemplate.type || 'coding');
      setDifficulty(editingTemplate.difficulty || 'medium');
      setMarks(editingTemplate.marks ?? 20);
      setExpectedSolveTimeMinutes(editingTemplate.expectedSolveTimeMinutes ?? 15);
      setSkillTagsInput(Array.isArray(editingTemplate.skillTags) ? editingTemplate.skillTags.join(', ') : (editingTemplate.skillTags || ''));
      setPrompt(editingTemplate.prompt || '');
      setInputFormat(editingTemplate.inputFormat || '');
      setOutputFormat(editingTemplate.outputFormat || '');
      setConstraints(editingTemplate.constraints || '');
      setTimeLimitMs(editingTemplate.timeLimitMs ?? 2000);
      setMemoryLimitMb(editingTemplate.memoryLimitMb ?? 256);
      setExplanation(editingTemplate.explanation || '');

      if (editingTemplate.options && editingTemplate.options.length > 0) {
        setOptions(editingTemplate.options.map((o: any) => ({
          text: typeof o === 'string' ? o : o.text || '',
          isCorrect: typeof o === 'object' ? Boolean(o.isCorrect) : false
        })));
      } else {
        setOptions([
          { text: '', isCorrect: true },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false }
        ]);
      }

      // Languages & Starter Codes
      const langs = Array.isArray(editingTemplate.allowedLanguages) && editingTemplate.allowedLanguages.length > 0
        ? editingTemplate.allowedLanguages
        : ['java', 'python', 'cpp', 'c', 'javascript'];
      setAllowedLanguages(langs);
      setActiveCodeTab(langs[0] || 'java');

      const loadedCodes: Record<string, string> = { ...DEFAULT_STARTER_CODES };
      if (editingTemplate.starterCode) {
        if (editingTemplate.starterCode instanceof Map) {
          editingTemplate.starterCode.forEach((v: string, k: string) => {
            loadedCodes[k] = v;
          });
        } else if (typeof editingTemplate.starterCode === 'object') {
          Object.entries(editingTemplate.starterCode).forEach(([k, v]) => {
            loadedCodes[k] = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
          });
        }
      }
      setStarterCodes(loadedCodes);

      // Test cases
      if (editingTemplate.testCases && editingTemplate.testCases.length > 0) {
        setTestCases(editingTemplate.testCases.map((tc: any) => ({
          input: tc.input || '',
          output: tc.output || tc.expectedOutput || '',
          isHidden: Boolean(tc.isHidden),
          weight: tc.weight || 10
        })));
      } else {
        setTestCases([
          { input: '', output: '', isHidden: false, weight: 10 },
          { input: '', output: '', isHidden: true, weight: 10 }
        ]);
      }

      setError(null);
    } else {
      // Create new
      const resolvedInitialType = targetRoundNumber === 1 ? 'mcq' : initialType;
      setType(resolvedInitialType);
      setTitle('');
      setTopic('Algorithms');
      setCustomTopic('');
      setDifficulty('medium');
      setMarks(20);
      setExpectedSolveTimeMinutes(15);
      setSkillTagsInput('Algorithms, Logic');
      setPrompt('');
      setInputFormat('');
      setOutputFormat('');
      setConstraints('');
      setTimeLimitMs(2000);
      setMemoryLimitMb(256);
      setExplanation('');
      setOptions([
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]);
      setAllowedLanguages(['java', 'python', 'cpp', 'c', 'javascript']);
      setActiveCodeTab('java');
      setStarterCodes({ ...DEFAULT_STARTER_CODES });
      setTestCases([
        { input: '', output: '', isHidden: false, weight: 10 },
        { input: '', output: '', isHidden: true, weight: 10 }
      ]);
      setSchemaDdl('');
      setSampleData('');
      setExpectedQuery('');
      setError(null);
    }
  }, [editingTemplate, isOpen, targetRoundNumber, initialType]);

  if (!isOpen) return null;

  const handleToggleLanguage = (lang: string) => {
    if (allowedLanguages.includes(lang)) {
      if (allowedLanguages.length === 1) {
        setError('At least one programming language must be supported.');
        return;
      }
      const next = allowedLanguages.filter(l => l !== lang);
      setAllowedLanguages(next);
      if (activeCodeTab === lang) {
        setActiveCodeTab(next[0] || 'java');
      }
    } else {
      const next = [...allowedLanguages, lang];
      setAllowedLanguages(next);
    }
  };

  const handleUpdateStarterCode = (lang: string, code: string) => {
    setStarterCodes(prev => ({
      ...prev,
      [lang]: code
    }));
  };

  const handleAddTestCase = () => {
    setTestCases(prev => [...prev, { input: '', output: '', isHidden: false, weight: 10 }]);
  };

  const handleRemoveTestCase = (index: number) => {
    if (testCases.length <= 1) {
      setError('A coding or debugging challenge must have at least 1 test case.');
      return;
    }
    setTestCases(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const resolvedTopic = topic === '__custom__' ? customTopic.trim() : topic;
    if (!title.trim()) {
      setError('Please provide a question title.');
      return;
    }
    if (!resolvedTopic) {
      setError('Please select or specify a topic.');
      return;
    }
    if (!prompt.trim()) {
      setError('Please provide the problem statement prompt.');
      return;
    }

    if (type === 'mcq') {
      const emptyOptions = options.some(o => !o.text.trim());
      if (emptyOptions) {
        setError('Please fill in text for all options.');
        return;
      }
      if (!options.some(o => o.isCorrect)) {
        setError('Please mark the correct answer option.');
        return;
      }
    }

    if (type === 'coding' || type === 'debugging') {
      if (allowedLanguages.length === 0) {
        setError('Please select at least one supported language.');
        return;
      }
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
        type,
        difficulty,
        marks: Math.max(1, Number(marks) || 20),
        expectedSolveTimeMinutes: Math.max(1, Number(expectedSolveTimeMinutes) || 15),
        skillTags: tags,
        prompt: prompt.trim(),
        explanation: explanation.trim(),
        inputFormat: inputFormat.trim(),
        outputFormat: outputFormat.trim(),
        constraints: constraints.trim(),
        timeLimitMs: Number(timeLimitMs) || 2000,
        memoryLimitMb: Number(memoryLimitMb) || 256
      };

      if (type === 'mcq') {
        payload.options = options.map(o => ({ text: o.text.trim(), isCorrect: o.isCorrect }));
        payload.language = 'general';
        payload.allowedLanguages = ['general'];
      } else if (type === 'sql') {
        payload.language = 'sql';
        payload.allowedLanguages = ['sql'];
        const filteredCodes: Record<string, string> = {
          sql: expectedQuery.trim() || schemaDdl.trim()
        };
        payload.starterCode = filteredCodes;
        payload.testCases = testCases.map(tc => ({
          input: tc.input || schemaDdl,
          output: tc.output.trim(),
          isHidden: Boolean(tc.isHidden),
          weight: Math.max(1, Number(tc.weight) || 10)
        }));
      } else {
        payload.language = allowedLanguages[0] || 'java';
        payload.allowedLanguages = allowedLanguages;
        const filteredCodes: Record<string, string> = {};
        for (const lang of allowedLanguages) {
          filteredCodes[lang] = (starterCodes[lang] || DEFAULT_STARTER_CODES[lang] || '').trim();
        }
        payload.starterCode = filteredCodes;
        payload.testCases = testCases.map(tc => ({
          input: tc.input,
          output: tc.output.trim(),
          isHidden: Boolean(tc.isHidden),
          weight: Math.max(1, Number(tc.weight) || 10)
        }));
      }

      let savedTemplate: any = null;

      if (editingTemplate) {
        const res = await updateQuestionTemplate(editingTemplate._id, payload);
        savedTemplate = res.template || { ...editingTemplate, ...payload };
      } else if (targetRoundNumber) {
        const res = await createQuestionDirect({
          ...payload,
          roundNumber: targetRoundNumber,
          eventId: targetEventId,
          type: type === 'mcq' ? 'mcq' : 'coding',
          options: type === 'mcq' && payload.options ? payload.options.map((o: any) => o.text) : [],
          correctOptionIndex: type === 'mcq' && payload.options ? Math.max(0, payload.options.findIndex((o: any) => o.isCorrect)) : 0,
          testCases: payload.testCases ? payload.testCases.map((tc: any) => ({
            input: tc.input,
            expectedOutput: tc.output,
            isHidden: tc.isHidden,
            weight: tc.weight
          })) : []
        });
        savedTemplate = res.question || res.template;
      } else {
        const res = await api.post('/admin/questions/bank', payload);
        savedTemplate = res.data?.template || res.data;
      }

      onQuestionAdded(savedTemplate);
      onClose();
    } catch (err: any) {
      console.error('Failed to save question template:', err);
      setError(err.response?.data?.error || 'Failed to save question.');
    } finally {
      setLoading(false);
    }
  };

  const TYPE_TABS = [
    { id: 'mcq' as const, label: 'Multiple Choice', icon: HelpCircle },
    { id: 'coding' as const, label: 'Coding / Debugging', icon: Code2 },
    { id: 'sql' as const, label: 'SQL Query', icon: Database }
  ];

  const ALL_LANGUAGES = [
    { id: 'java', label: 'Java' },
    { id: 'python', label: 'Python' },
    { id: 'cpp', label: 'C++' },
    { id: 'c', label: 'C' },
    { id: 'javascript', label: 'JavaScript' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-[#111418] border border-[#252A31] rounded-2xl shadow-2xl my-8 max-h-[90vh] flex flex-col text-left overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#171B21] border-b border-[#252A31] flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#F3F4F6]">
              {editingTemplate ? 'Edit Question' : 'Add Question'}
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              {editingTemplate
                ? 'Update master question parameters and test cases'
                : 'Create a reusable assessment problem for tournament rounds'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#252A31] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-[#F3F4F6]">
          {error && (
            <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Selector (Segmented buttons) */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-[#9CA3AF]">Question Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TYPE_TABS.map(tab => {
                const Icon = tab.icon;
                const isSelected = type === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={Boolean(editingTemplate)}
                    onClick={() => setType(tab.id)}
                    className={`px-3 py-2 rounded-lg border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#171B21] border-[#F3F4F6] text-[#F3F4F6] font-medium'
                        : 'bg-[#111418] border-[#252A31] text-[#9CA3AF] hover:text-[#F3F4F6] hover:border-[#374151]'
                    } ${editingTemplate ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-[#9CA3AF]">
              Title <span className="text-[#EF4444]">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Maximum Sales in K Consecutive Days"
              className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none focus:border-[#4B5563]"
              required
            />
          </div>

          {/* Topic & Difficulty Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-[#9CA3AF]">Topic</label>
              <select
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#4B5563]"
              >
                {TOPIC_PRESETS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="__custom__">+ Custom Topic...</option>
              </select>
            </div>

            {topic === '__custom__' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#9CA3AF]">Custom Topic Name</label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="Enter topic..."
                  className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#4B5563]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-[#9CA3AF]">Difficulty</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#4B5563]"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-[#9CA3AF]">Marks</label>
              <input
                type="number"
                min={1}
                max={100}
                value={marks}
                onChange={e => setMarks(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#4B5563]"
              />
            </div>
          </div>

          {/* Tags & Solve Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-[#9CA3AF]">Tags (comma-separated)</label>
              <input
                type="text"
                value={skillTagsInput}
                onChange={e => setSkillTagsInput(e.target.value)}
                placeholder="e.g. Arrays, Sliding Window, Pointers"
                className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none focus:border-[#4B5563]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-medium text-[#9CA3AF]">Target Solve Time (minutes)</label>
              <input
                type="number"
                min={1}
                max={180}
                value={expectedSolveTimeMinutes}
                onChange={e => setExpectedSolveTimeMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] focus:outline-none focus:border-[#4B5563]"
              />
            </div>
          </div>

          {/* Problem Statement Prompt */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-medium text-[#9CA3AF]">
              Problem Statement / Prompt <span className="text-[#EF4444]">*</span>
            </label>
            <textarea
              rows={4}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the challenge statement or scenario clearly..."
              className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] font-mono placeholder-[#6B7280] focus:outline-none focus:border-[#4B5563] resize-y"
              required
            />
          </div>

          {/* TYPE-SPECIFIC SECTIONS */}

          {/* SECTION A: MCQ */}
          {type === 'mcq' && (
            <div className="space-y-3 pt-2 border-t border-[#252A31]">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-[#9CA3AF]">
                  Options (Select the single correct answer)
                </label>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => {
                  const letter = String.fromCharCode(65 + idx);
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOptions(options.map((o, i) => ({ ...o, isCorrect: i === idx })));
                        }}
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer ${
                          opt.isCorrect
                            ? 'bg-[#22C55E] border-[#22C55E] text-black'
                            : 'bg-[#171B21] border-[#252A31] text-[#9CA3AF] hover:border-[#4B5563]'
                        }`}
                        title="Mark as correct answer"
                      >
                        {letter}
                      </button>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={e => {
                          const updated = [...options];
                          updated[idx].text = e.target.value;
                          setOptions(updated);
                        }}
                        placeholder={`Option ${letter} text...`}
                        className={`flex-1 px-3 py-2 rounded-lg bg-[#171B21] border text-xs text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none ${
                          opt.isCorrect ? 'border-[#22C55E]/50' : 'border-[#252A31] focus:border-[#4B5563]'
                        }`}
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = options.filter((_, i) => i !== idx);
                            if (!updated.some(o => o.isCorrect)) updated[0].isCorrect = true;
                            setOptions(updated);
                          }}
                          className="p-2 text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {options.length < 6 && (
                <button
                  type="button"
                  onClick={() => setOptions([...options, { text: '', isCorrect: false }])}
                  className="px-2.5 py-1 rounded border border-[#252A31] text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#171B21] transition-colors cursor-pointer"
                >
                  + Add Option
                </button>
              )}

              <div className="space-y-1.5 pt-2">
                <label className="block text-[11px] font-medium text-[#9CA3AF]">Explanation / Solution rationale</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={e => setExplanation(e.target.value)}
                  placeholder="Explain why the correct answer is right..."
                  className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] placeholder-[#6B7280] focus:outline-none focus:border-[#4B5563]"
                />
              </div>
            </div>
          )}

          {/* SECTION B: CODING & DEBUGGING */}
          {(type === 'coding' || type === 'debugging') && (
            <div className="space-y-4 pt-2 border-t border-[#252A31]">
              {/* Formats & Constraints */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[#9CA3AF]">Input Format</label>
                  <textarea
                    rows={2}
                    value={inputFormat}
                    onChange={e => setInputFormat(e.target.value)}
                    placeholder="e.g. N K followed by N integers"
                    className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] font-mono focus:outline-none focus:border-[#4B5563]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[#9CA3AF]">Output Format</label>
                  <textarea
                    rows={2}
                    value={outputFormat}
                    onChange={e => setOutputFormat(e.target.value)}
                    placeholder="e.g. Single integer output"
                    className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] font-mono focus:outline-none focus:border-[#4B5563]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[#9CA3AF]">Constraints</label>
                  <textarea
                    rows={2}
                    value={constraints}
                    onChange={e => setConstraints(e.target.value)}
                    placeholder="e.g. 1 <= N <= 10^5"
                    className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] font-mono focus:outline-none focus:border-[#4B5563]"
                  />
                </div>
              </div>

              {/* Supported Languages */}
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-[#9CA3AF]">
                  Supported Languages (C, C++, Python, Java, JavaScript)
                </label>
                <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-[#171B21] border border-[#252A31]">
                  {ALL_LANGUAGES.map(lang => {
                    const isChecked = allowedLanguages.includes(lang.id);
                    return (
                      <label key={lang.id} className="flex items-center gap-2 cursor-pointer text-xs select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleLanguage(lang.id)}
                          className="rounded border-[#252A31] text-white focus:ring-0 cursor-pointer"
                        />
                        <span className={isChecked ? 'text-[#F3F4F6] font-medium' : 'text-[#6B7280]'}>
                          {lang.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tabbed Multi-Language Starter / Buggy Code Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[#9CA3AF]">
                    Starter / Buggy Code (per language)
                  </label>
                  <span className="text-[11px] text-[#6B7280]">
                    Editing: <span className="font-mono text-[#F3F4F6] uppercase">{activeCodeTab}</span>
                  </span>
                </div>

                <div className="border border-[#252A31] rounded-lg overflow-hidden bg-[#171B21]">
                  {/* Language Tab Strip */}
                  <div className="flex items-center bg-[#111418] border-b border-[#252A31] px-2 py-1 gap-1 overflow-x-auto">
                    {ALL_LANGUAGES.filter(l => allowedLanguages.includes(l.id)).map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setActiveCodeTab(l.id)}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                          activeCodeTab === l.id
                            ? 'bg-[#171B21] text-[#F3F4F6] border border-[#252A31] font-semibold'
                            : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={8}
                    value={starterCodes[activeCodeTab] || ''}
                    onChange={e => handleUpdateStarterCode(activeCodeTab, e.target.value)}
                    placeholder={`Enter ${activeCodeTab} starter or buggy code here...`}
                    className="w-full p-3 bg-transparent text-xs font-mono text-[#F3F4F6] focus:outline-none resize-y leading-relaxed"
                    spellCheck={false}
                  />
                </div>
              </div>

              {/* Test Cases */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[#9CA3AF]">
                    Test Cases (Sample & Hidden Evaluation)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="px-2.5 py-1 rounded border border-[#252A31] text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#171B21] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Test Case</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#171B21] border border-[#252A31] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#9CA3AF]">Test Case #{idx + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={e => {
                                const updated = [...testCases];
                                updated[idx].isHidden = e.target.checked;
                                setTestCases(updated);
                              }}
                              className="rounded border-[#252A31] text-white focus:ring-0 cursor-pointer"
                            />
                            <span className={tc.isHidden ? 'text-[#F59E0B] font-medium' : 'text-[#6B7280]'}>
                              Hidden Test
                            </span>
                          </label>

                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(idx)}
                              className="text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#6B7280] mb-0.5">Input</label>
                          <textarea
                            rows={2}
                            value={tc.input}
                            onChange={e => {
                              const updated = [...testCases];
                              updated[idx].input = e.target.value;
                              setTestCases(updated);
                            }}
                            placeholder="Standard input..."
                            className="w-full px-2.5 py-1.5 rounded bg-[#111418] border border-[#252A31] text-xs font-mono text-[#F3F4F6] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#6B7280] mb-0.5">
                            Expected Output <span className="text-[#EF4444]">*</span>
                          </label>
                          <textarea
                            rows={2}
                            value={tc.output}
                            onChange={e => {
                              const updated = [...testCases];
                              updated[idx].output = e.target.value;
                              setTestCases(updated);
                            }}
                            placeholder="Expected stdout..."
                            className="w-full px-2.5 py-1.5 rounded bg-[#111418] border border-[#252A31] text-xs font-mono text-[#F3F4F6] focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION C: SQL */}
          {type === 'sql' && (
            <div className="space-y-3 pt-2 border-t border-[#252A31]">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#9CA3AF]">
                  Table Schema DDL
                </label>
                <textarea
                  rows={3}
                  value={schemaDdl}
                  onChange={e => setSchemaDdl(e.target.value)}
                  placeholder="CREATE TABLE employees (id INT, name VARCHAR(50), salary INT);"
                  className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#9CA3AF]">
                  Expected SQL Query / Solution
                </label>
                <textarea
                  rows={3}
                  value={expectedQuery}
                  onChange={e => setExpectedQuery(e.target.value)}
                  placeholder="SELECT name, salary FROM employees WHERE salary > 50000;"
                  className="w-full px-3 py-2 rounded-lg bg-[#171B21] border border-[#252A31] text-xs text-[#F3F4F6] font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-[#9CA3AF]">
                    SQL Output Evaluation Test Cases
                  </label>
                  <button
                    type="button"
                    onClick={handleAddTestCase}
                    className="px-2.5 py-1 rounded border border-[#252A31] text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#171B21] transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Test Case</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {testCases.map((tc, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-[#171B21] border border-[#252A31] space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-mono text-[#9CA3AF]">Test Case #{idx + 1}</span>
                        {testCases.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveTestCase(idx)}
                            className="text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-[#6B7280] mb-0.5">Input / Data Seeds</label>
                          <textarea
                            rows={2}
                            value={tc.input}
                            onChange={e => {
                              const updated = [...testCases];
                              updated[idx].input = e.target.value;
                              setTestCases(updated);
                            }}
                            placeholder="Custom seed statements if needed..."
                            className="w-full px-2.5 py-1.5 rounded bg-[#111418] border border-[#252A31] text-xs font-mono text-[#F3F4F6] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-[#6B7280] mb-0.5">Expected Output Table</label>
                          <textarea
                            rows={2}
                            value={tc.output}
                            onChange={e => {
                              const updated = [...testCases];
                              updated[idx].output = e.target.value;
                              setTestCases(updated);
                            }}
                            placeholder="Expected rows or scalar result..."
                            className="w-full px-2.5 py-1.5 rounded bg-[#111418] border border-[#252A31] text-xs font-mono text-[#F3F4F6] focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#252A31]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-[#171B21] hover:bg-[#252A31] text-xs font-medium text-[#9CA3AF] hover:text-[#F3F4F6] border border-[#252A31] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-[#FFFFFF] hover:bg-[#E5E7EB] text-xs font-semibold text-black transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>{loading ? 'Saving...' : editingTemplate ? 'Update Question' : 'Add Question'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
