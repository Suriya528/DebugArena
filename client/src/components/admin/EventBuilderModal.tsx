import React, { useState } from 'react';
import { X, Building2, Calendar, ShieldCheck, Palette, Plus, Trash2, CheckCircle2, Award, Zap, Image } from 'lucide-react';
import { College } from '../../types/index.js';
import { createEvent, createCollege } from '../../services/api.js';

interface EventBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  colleges: College[];
  onEventCreated: () => void;
  onCollegeCreated: () => void;
}

export const EventBuilderModal: React.FC<EventBuilderModalProps> = ({
  isOpen,
  onClose,
  colleges,
  onEventCreated,
  onCollegeCreated
}) => {
  const [collegeId, setCollegeId] = useState<string>(colleges[0]?._id || '');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [negativeMarking, setNegativeMarking] = useState(false);
  const [violationLimit, setViolationLimit] = useState(3);
  const [customTitle, setCustomTitle] = useState('');
  const [certificateTitle, setCertificateTitle] = useState('');
  const [useDefaultCertTemplate, setUseDefaultCertTemplate] = useState(true);
  const [customCertTemplateUrl, setCustomCertTemplateUrl] = useState('');
  const [certTextColorMode, setCertTextColorMode] = useState<'auto' | 'light' | 'dark'>('auto');
  const [certSignatoryName, setCertSignatoryName] = useState('Head of Department');
  const [certSignatoryTitle, setCertSignatoryTitle] = useState('DebugArena Organizing Committee');
  const [round1Quota, setRound1Quota] = useState(15);
  const [round2Quota, setRound2Quota] = useState(10);
  const [rules, setRules] = useState<string[]>([
    'Full-screen proctoring is strictly enforced throughout the competition.',
    'Zero negative marking on all debugging challenges.',
    'Tab switching and window minimization incur escalated security strikes.',
    'All code submissions are evaluated server-side.'
  ]);
  const [newRule, setNewRule] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCollegeForm, setShowNewCollegeForm] = useState(false);

  // New College sub-form state
  const [newCollegeName, setNewCollegeName] = useState('');
  const [newCollegeCode, setNewCollegeCode] = useState('');
  const [newCollegeColor, setNewCollegeColor] = useState('#6366f1');

  if (!isOpen) return null;

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    setRules([...rules, newRule.trim()]);
    setNewRule('');
  };

  const handleRemoveRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName || !newCollegeCode) return;
    try {
      const college = await createCollege({
        name: newCollegeName,
        code: newCollegeCode,
        primaryColor: newCollegeColor
      });
      onCollegeCreated();
      setCollegeId(college._id);
      setShowNewCollegeForm(false);
      setNewCollegeName('');
      setNewCollegeCode('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create college');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId || !name || !code) {
      alert('Please fill in College, Event Name, and Event Code');
      return;
    }

    setIsSubmitting(true);
    try {
      await createEvent({
        collegeId,
        name,
        code,
        description,
        rules,
        scoringConfig: {
          negativeMarking,
          violationLimit,
          autoSubmitOnTimeUp: true,
          autoSubmitOnViolation: true,
          tieBreakerPriority: ['codingScore', 'debuggingScore', 'totalTime', 'earliestSubmit']
        },
        branding: {
          customTitle: customTitle || `${name} Live Championship`,
          certificateTitle: certificateTitle || `Certificate of Achievement — ${name}`,
          signatoryName: certSignatoryName,
          signatoryTitle: certSignatoryTitle
        },
        certificateConfig: {
          useDefaultTemplate: useDefaultCertTemplate,
          customTemplateUrl: customCertTemplateUrl,
          textColorMode: certTextColorMode,
          issuerName: certSignatoryName,
          issuerTitle: certSignatoryTitle,
          primaryColor: '#f59e0b',
          includeQrVerification: true
        },
        initialRounds: [
          { roundNumber: 1, title: 'Round 1: Rapid-Fire Debugging MCQs', type: 'mcq', durationMinutes: 15, questionCount: 10, totalMarks: 100, advancementQuota: round1Quota },
          { roundNumber: 2, title: 'Round 2: Core Bug Hunting', type: 'debugging', durationMinutes: 30, questionCount: 3, totalMarks: 100, advancementQuota: round2Quota },
          { roundNumber: 3, title: 'Round 3: Advanced Algorithmic Coding', type: 'coding', durationMinutes: 45, questionCount: 2, totalMarks: 100, advancementQuota: 0 }
        ]
      });
      onEventCreated();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl text-left my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Dynamic Event Builder</h2>
              <p className="text-xs text-slate-400">Create a self-contained multi-round competition for any college</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inline New College Creation */}
        {showNewCollegeForm ? (
          <div className="mb-6 p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 animate-in fade-in">
            <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Add New College Organization
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">College Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford Engineering"
                  value={newCollegeName}
                  onChange={e => setNewCollegeName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">College Code</label>
                <input
                  type="text"
                  placeholder="e.g. STAN-ENG"
                  value={newCollegeCode}
                  onChange={e => setNewCollegeCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Primary Color</label>
                <input
                  type="color"
                  value={newCollegeColor}
                  onChange={e => setNewCollegeColor(e.target.value)}
                  className="w-full h-9 bg-slate-900 border border-slate-800 rounded-xl px-1 py-1 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNewCollegeForm(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCollege}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                Save College
              </button>
            </div>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* College Selection */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-300">Host College / Institution</label>
              {!showNewCollegeForm && (
                <button
                  type="button"
                  onClick={() => setShowNewCollegeForm(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> New College
                </button>
              )}
            </div>
            <select
              value={collegeId}
              onChange={e => setCollegeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            >
              {colleges.map(col => (
                <option key={col._id} value={col._id}>
                  {col.name} ({col.code})
                </option>
              ))}
            </select>
          </div>

          {/* Event Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Event Name</label>
              <input
                type="text"
                placeholder="e.g. DebugX 2026 or Code Battle"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">Event Code</label>
              <input
                type="text"
                placeholder="e.g. DX26"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Event Description</label>
            <textarea
              rows={2}
              placeholder="State the objective, prize pool, or department eligibility..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Rules List */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">Competition Rules</label>
            <div className="space-y-2 mb-2 max-h-36 overflow-y-auto">
              {rules.map((rule, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300">
                  <span className="truncate pr-2">{idx + 1}. {rule}</span>
                  <button type="button" onClick={() => handleRemoveRule(idx)} className="text-slate-500 hover:text-rose-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom rule..."
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddRule(); } }}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleAddRule}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                Add
              </button>
            </div>
          </div>

          {/* Scoring & Proctoring Config */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Max Security Strikes</label>
              <input
                type="number"
                min={1}
                max={10}
                value={violationLimit}
                onChange={e => setViolationLimit(parseInt(e.target.value, 10))}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div className="flex flex-col justify-center">
              <label className="text-xs font-bold text-slate-300 mb-1">Negative Marking</label>
              <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={negativeMarking}
                  onChange={e => setNegativeMarking(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-0"
                />
                <span>Enable deductions</span>
              </label>
            </div>
          </div>

          {/* Upfront Round Advancement Sequence */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 fill-amber-400" />
                Upfront Round Advancement Sequence
              </span>
              <span className="text-[11px] text-amber-300/80 font-mono">Auto Progression</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Preset tournament advancement quotas upfront so the engine auto-advances top performers seamlessly between rounds.
            </p>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Round 1 Advancement Quota
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={round1Quota}
                    onChange={e => setRound1Quota(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">&rarr; Round 2</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Round 2 Advancement Quota
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={round2Quota}
                    onChange={e => setRound2Quota(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">&rarr; Finals</span>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Customization & Optional Template */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-400" />
                Certificate Template & Verification (Optional)
              </span>
              <span className="text-[11px] text-indigo-400 font-mono">HMAC-SHA256 QR</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Use the platform standard Luxury Gold/Dark verifiable certificate, or provide your college's custom certificate template image/banner.
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setUseDefaultCertTemplate(true)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  useDefaultCertTemplate
                    ? 'bg-amber-500/20 border-amber-500 text-amber-200 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Default Luxury Gold Theme
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Platform Dark/Gold security certificate</div>
              </button>

              <button
                type="button"
                onClick={() => setUseDefaultCertTemplate(false)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  !useDefaultCertTemplate
                    ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-indigo-400" />
                  Custom College Template
                </div>
                <div className="text-[10px] text-slate-400 mt-1">Upload or link university template image</div>
              </button>
            </div>

            {!useDefaultCertTemplate && (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    College Certificate Template Image / Banner URL
                  </label>
                  <input
                    type="text"
                    value={customCertTemplateUrl}
                    onChange={e => setCustomCertTemplateUrl(e.target.value)}
                    placeholder="https://example.com/certificates/university_template.png"
                    className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-400"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Candidate credentials, rank, score, and verifiable HMAC QR code will be overlayed dynamically.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Text Contrast Mode
                    </label>
                    <select
                      value={certTextColorMode}
                      onChange={e => setCertTextColorMode(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="auto">Adaptive Glass Contrast (Recommended)</option>
                      <option value="light">Light Text (For Dark Templates)</option>
                      <option value="dark">Dark Text (For Light Templates)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Signatory / Authority
                    </label>
                    <input
                      type="text"
                      value={certSignatoryName}
                      onChange={e => setCertSignatoryName(e.target.value)}
                      placeholder="e.g. Dean of Academics"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Creating Event...' : 'Build Event & Initialize Rounds'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
