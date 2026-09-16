import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  Layers,
  RefreshCw,
  Check,
  Filter
} from 'lucide-react';
import {
  previewQuestionImport,
  confirmQuestionImport,
  getQuestionTemplateDownloadUrl
} from '../../services/api.js';

interface QuestionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  targetEventId?: string;
  targetRoundNumber?: number;
}

export const QuestionImportModal: React.FC<QuestionImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  targetEventId,
  targetRoundNumber
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [defaultType, setDefaultType] = useState<'mcq' | 'coding'>('mcq');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Preview data
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [filterView, setFilterView] = useState<'all' | 'valid' | 'errors' | 'duplicates'>('all');

  // Destination
  const [destMode, setDestMode] = useState<'bank' | 'round'>(targetRoundNumber ? 'round' : 'bank');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setParseError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setParseError(null);
    }
  };

  const handleParseFile = async () => {
    if (!selectedFile) {
      setParseError('Please select a CSV, XLSX, or JSON file to upload.');
      return;
    }

    setIsParsing(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('defaultType', defaultType);

      const res = await previewQuestionImport(formData);
      setPreviewData(res.preview);
      setStep('preview');
    } catch (err: any) {
      setParseError(err?.response?.data?.error || err.message || 'Failed to parse file. Please verify column structure.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData || !previewData.validQuestions || previewData.validQuestions.length === 0) {
      setParseError('No valid questions to import.');
      return;
    }

    setIsSubmitting(true);
    setParseError(null);

    try {
      const res = await confirmQuestionImport({
        questions: previewData.validQuestions,
        eventId: destMode === 'round' ? targetEventId : undefined,
        roundNumber: destMode === 'round' ? targetRoundNumber : undefined,
        fileName: selectedFile?.name,
        fileSize: selectedFile?.size
      });

      setCommitSuccess(res.message || `Successfully committed ${res.insertedCount} questions.`);
      setTimeout(() => {
        onImportComplete();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setParseError(err?.response?.data?.error || err.message || 'Failed to commit questions.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setSelectedFile(null);
    setPreviewData(null);
    setParseError(null);
    setCommitSuccess(null);
    onClose();
  };

  interface PreviewRowItem {
    index: number;
    title: string;
    type: string;
    status: 'valid' | 'error' | 'duplicate';
    details: string;
  }

  const filteredPreviewRows = (): PreviewRowItem[] => {
    if (!previewData) return [];

    const validRows: PreviewRowItem[] = (previewData.validQuestions || []).map((q: any, idx: number) => ({
      index: idx + 1,
      title: q.title,
      type: q.type,
      status: 'valid' as const,
      details: `${q.topic} • ${q.difficulty.toUpperCase()} • ${q.marks} Marks`
    }));

    const errorRows: PreviewRowItem[] = (previewData.invalidRows || []).map((err: any) => ({
      index: err.rowIndex,
      title: err.title || `Row ${err.rowIndex}`,
      type: defaultType,
      status: 'error' as const,
      details: `${err.field}: ${err.error}`
    }));

    const duplicateRows: PreviewRowItem[] = (previewData.duplicates || []).map((dup: any) => ({
      index: dup.rowIndex,
      title: dup.title,
      type: defaultType,
      status: 'duplicate' as const,
      details: `Duplicate fingerprint collision (${dup.existingId ? 'Already exists in Question Bank' : 'Duplicate in upload batch'})`
    }));

    if (filterView === 'valid') return validRows;
    if (filterView === 'errors') return errorRows;
    if (filterView === 'duplicates') return duplicateRows;

    return [...errorRows, ...duplicateRows, ...validRows];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white dark:bg-[#0d121f] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Canonical Question Bank Import
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Multi-format parser with row validation, fingerprint deduplication &amp; instant preview
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {commitSuccess ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Import Committed Successfully!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{commitSuccess}</p>
            </div>
          ) : step === 'upload' ? (
            <div className="space-y-6">
              {/* Template Download Section */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase font-mono">
                    <Download className="w-4 h-4" />
                    <span>Download Official Verified Templates</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Pre-formatted columns</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  To ensure flawless import with zero schema mismatch, download our official templates for multiple choices or algorithmic debugging challenges:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* MCQ Templates */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>Multiple-Choice Questions (MCQ)</span>
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <a
                        href={getQuestionTemplateDownloadUrl('mcq', 'xlsx')}
                        download
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-mono font-medium transition-colors"
                      >
                        .XLSX
                      </a>
                      <a
                        href={getQuestionTemplateDownloadUrl('mcq', 'csv')}
                        download
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-mono font-medium transition-colors"
                      >
                        .CSV
                      </a>
                      <a
                        href={getQuestionTemplateDownloadUrl('mcq', 'json')}
                        download
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-mono font-medium transition-colors"
                      >
                        .JSON
                      </a>
                    </div>
                  </div>

                  {/* Coding Templates */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Coding &amp; Debugging Problems</span>
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <a
                        href={getQuestionTemplateDownloadUrl('coding', 'xlsx')}
                        download
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white font-mono font-medium transition-colors"
                      >
                        .XLSX
                      </a>
                      <a
                        href={getQuestionTemplateDownloadUrl('coding', 'csv')}
                        download
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white font-mono font-medium transition-colors"
                      >
                        .CSV
                      </a>
                      <a
                        href={getQuestionTemplateDownloadUrl('coding', 'json')}
                        download
                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500 hover:text-white font-mono font-medium transition-colors"
                      >
                        .JSON
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                    Default Question Type Fallback:
                  </label>
                  <select
                    value={defaultType}
                    onChange={e => setDefaultType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="mcq">Multiple Choice Questions (MCQ)</option>
                    <option value="coding">Algorithmic Coding &amp; Debugging</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Applied if rows in the file do not explicitly define a 'type' column.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono mb-1.5">
                    Target Insertion Destination:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDestMode('bank')}
                      className={`h-10 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        destMode === 'bank'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Question Bank</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDestMode('round')}
                      disabled={!targetRoundNumber}
                      className={`h-10 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 ${
                        destMode === 'round'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Round {targetRoundNumber || 1} Direct</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Drag & Drop File Upload Box */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  selectedFile
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-300 dark:border-slate-700 hover:border-amber-500 bg-slate-50 dark:bg-slate-900/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls, .json"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{selectedFile.name}</div>
                    <div className="text-xs text-slate-500 font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB • Click or drag to replace
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white font-sans">
                      Drop your questions spreadsheet or JSON here, or <span className="text-amber-500 underline">browse</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">Supports .csv, .xlsx, .xls, .json (max 15MB)</div>
                  </div>
                )}
              </div>

              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-mono text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW STEP */
            <div className="space-y-4">
              {/* Stat Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Total Parsed</span>
                  <span className="text-xl font-mono font-black text-slate-900 dark:text-white">
                    {previewData.totalRows}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                  <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 block">
                    Valid to Commit
                  </span>
                  <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {previewData.validCount}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25">
                  <span className="text-[10px] font-mono uppercase text-rose-600 dark:text-rose-400 block">
                    Format Errors
                  </span>
                  <span className="text-xl font-mono font-black text-rose-600 dark:text-rose-400">
                    {previewData.invalidCount}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 block">
                    Duplicates Skipped
                  </span>
                  <span className="text-xl font-mono font-black text-amber-600 dark:text-amber-400">
                    {previewData.duplicateCount}
                  </span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-slate-500">Filter View:</span>
                  <button
                    onClick={() => setFilterView('all')}
                    className={`px-2.5 py-1 rounded-lg ${
                      filterView === 'all'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All ({filteredPreviewRows().length})
                  </button>
                  <button
                    onClick={() => setFilterView('valid')}
                    className={`px-2.5 py-1 rounded-lg ${
                      filterView === 'valid'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Valid ({previewData.validCount})
                  </button>
                  <button
                    onClick={() => setFilterView('errors')}
                    className={`px-2.5 py-1 rounded-lg ${
                      filterView === 'errors'
                        ? 'bg-rose-500 text-white font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Errors ({previewData.invalidCount})
                  </button>
                  <button
                    onClick={() => setFilterView('duplicates')}
                    className={`px-2.5 py-1 rounded-lg ${
                      filterView === 'duplicates'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Duplicates ({previewData.duplicateCount})
                  </button>
                </div>

                <button
                  onClick={() => setStep('upload')}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-mono text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Upload Different File</span>
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950 max-h-64 overflow-y-auto font-mono text-[11px]">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Row</th>
                      <th className="py-2.5 px-3">Title / Statement</th>
                      <th className="py-2.5 px-3 w-24">Type</th>
                      <th className="py-2.5 px-3 w-28">Status</th>
                      <th className="py-2.5 px-3">Validation Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredPreviewRows().map((row: PreviewRowItem, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-center text-slate-400">{row.index}</td>
                        <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white truncate max-w-xs">
                          {row.title}
                        </td>
                        <td className="py-2 px-3 uppercase text-[10px] text-slate-500">{row.type}</td>
                        <td className="py-2 px-3">
                          {row.status === 'valid' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              VALID
                            </span>
                          ) : row.status === 'error' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                              ERROR
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              DUPLICATE
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 truncate max-w-sm">
                          {row.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-2 font-mono text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!commitSuccess && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            {step === 'upload' ? (
              <button
                type="button"
                onClick={handleParseFile}
                disabled={!selectedFile || isParsing}
                className="px-5 py-2 rounded-xl text-slate-950 bg-amber-400 hover:bg-amber-300 font-bold transition-all disabled:opacity-50 inline-flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating Rows...</span>
                  </>
                ) : (
                  <>
                    <span>Preview &amp; Validate</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isSubmitting || previewData.validCount === 0}
                className="px-6 py-2.5 rounded-xl text-slate-950 bg-emerald-400 hover:bg-emerald-300 font-bold transition-all disabled:opacity-50 inline-flex items-center gap-2 shadow-md shadow-emerald-500/20 active:scale-95"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Committing to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>
                      Confirm &amp; Import {previewData.validCount} Valid Question
                      {previewData.validCount === 1 ? '' : 's'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
