import React, { useState, useEffect } from 'react';
import { X, Dna, Code2, CheckCircle2, User, Sparkles, AlertOctagon } from 'lucide-react';
import { api } from '../../services/api.js';

interface VariantPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateTitle: string;
}

export const VariantPreviewModal: React.FC<VariantPreviewModalProps> = ({
  isOpen,
  onClose,
  templateId,
  templateTitle
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeVariantIndex, setActiveVariantIndex] = useState<number>(0);

  useEffect(() => {
    if (!isOpen || !templateId) return;

    const fetchVariants = async () => {
      try {
        setLoading(true);
        const res = await api.post(`/admin/questions/bank/${templateId}/preview-variants`);
        setData(res.data);
      } catch (err) {
        console.error('Failed to preview variants:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVariants();
  }, [isOpen, templateId]);

  if (!isOpen) return null;

  const currentVariant = data?.variants?.[activeVariantIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-3xl bg-slate-900 border border-indigo-500/40 p-6 sm:p-8 shadow-2xl shadow-indigo-950/70 text-left my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 text-indigo-400">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Question DNA • Parametric Variant Generator
                </span>
                {data?.bugCategory && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                    <AlertOctagon className="w-2.5 h-2.5" /> Bug: {data.bugCategory.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">{templateTitle}</h2>
              <p className="text-xs text-slate-400">
                Deterministic mutations testing the same competency with equivalent difficulty & scoring
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 font-mono text-sm">
            Synthesizing Question DNA variants...
          </div>
        ) : !data?.variants?.length ? (
          <div className="text-center py-16 text-slate-500">
            No DNA configuration set for this question. It provides a fixed base implementation.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Variant Switcher Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.variants.map((v: any, idx: number) => (
                <button
                  key={v.variantId}
                  onClick={() => setActiveVariantIndex(idx)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer whitespace-nowrap ${
                    activeVariantIndex === idx
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{v.variantId}</span>
                  <span className="text-[10px] opacity-75 font-mono">(@{v.candidateId})</span>
                </button>
              ))}
            </div>

            {/* Active Variant Mutation Card */}
            {currentVariant && (
              <div className="space-y-4">
                {/* Parameter Map Chips */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Mutated Parameters for this Candidate:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(currentVariant.parameterMap || {}).map(([key, val]) => (
                      <span
                        key={key}
                        className="px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs font-mono text-indigo-300 flex items-center gap-1.5"
                      >
                        <span className="text-slate-500">{key}:</span>
                        <span className="font-bold text-cyan-300">"{String(val)}"</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mutated Code */}
                <div>
                  <div className="text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-indigo-400" /> Assigned Candidate Buggy Starter Code:
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Seed Deterministic Hash: SHA-256
                    </span>
                  </div>
                  <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                    {currentVariant.mutatedCode}
                  </pre>
                </div>

                {/* Mutated Test Cases */}
                <div>
                  <div className="text-xs font-bold text-slate-300 mb-2">
                    Synchronized Test Suite (Automatically tailored to this variant):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentVariant.mutatedTestCases?.map((tc: any, tcIdx: number) => (
                      <div key={tcIdx} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono">
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-1">
                          <span>Case #{tcIdx + 1}</span>
                          <span>{tc.isHidden ? 'Hidden' : 'Visible'}</span>
                        </div>
                        <div className="text-slate-400 truncate">In: {tc.input.replace(/\n/g, ' ')}</div>
                        <div className="text-emerald-400 truncate">Out: {tc.output.replace(/\n/g, ' ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
