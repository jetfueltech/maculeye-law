import React, { useState, useRef, useCallback, useMemo } from 'react';
import { CaseFile, DocumentAttachment, DocumentType, DocumentCategory, DOCUMENT_NAMING_RULES, DOCUMENT_CATEGORY_LABELS, PhotoCategory, PHOTO_CATEGORY_LABELS } from '../types';
import { uploadDocument, deleteDocument } from '../services/documentStorageService';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentGenerator, DocumentFormType } from './DocumentGenerator';
import { generateDocumentNameWithExt } from '../services/documentNamingService';
import { analyzeUploadedDocument, applyDocumentActions } from '../services/documentActionService';
import { DocumentActionPanel, AIDocAnalysis } from './DocumentActionPanel';
import { useAuth } from '../contexts/AuthContext';

interface DocumentsPanelProps {
  caseData: CaseFile;
  onUpdateCase: (updatedCase: CaseFile) => void;
}

type ScanStatus = 'pending' | 'scanning' | 'done' | 'error';

interface PendingFile {
  file: File;
  fileData: string;
  preview: string;
  type: DocumentType;
  photoCategory?: PhotoCategory;
  description?: string;
  scanStatus: ScanStatus;
  suggestedName?: string;
  aiConfidence?: number;
}

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'retainer', label: 'Retainer' },
  { value: 'crash_report', label: 'Crash Report' },
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'authorization', label: 'Authorization' },
  { value: 'insurance_card', label: 'Insurance Card' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'photo', label: 'Photo' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = Object.entries(DOCUMENT_CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as DocumentCategory, label })
);

const VALID_DOC_TYPES: DocumentType[] = ['retainer', 'crash_report', 'medical_record', 'authorization', 'insurance_card', 'correspondence', 'photo', 'email', 'other'];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function inferDocType(filename: string): DocumentType {
  const lower = filename.toLowerCase();
  if (lower.includes('retainer')) return 'retainer';
  if (lower.includes('crash') || lower.includes('police')) return 'crash_report';
  if (lower.includes('medical') || lower.includes('record')) return 'medical_record';
  if (lower.includes('auth') || lower.includes('hipaa')) return 'authorization';
  if (lower.includes('insurance')) return 'insurance_card';
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) return 'photo';
  return 'other';
}

function formatDate(isoStr?: string): string {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '--';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ caseData, onUpdateCase }) => {
  const { profile } = useAuth();
  const authorName = profile?.full_name || profile?.email || 'Unknown User';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [generatedDocPreview, setGeneratedDocPreview] = useState<DocumentFormType | null>(null);
  const [renamingDocIndex, setRenamingDocIndex] = useState<number | null>(null);
  const [tempDocName, setTempDocName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [editingTypeIndex, setEditingTypeIndex] = useState<number | null>(null);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');
  const [deepAnalyses, setDeepAnalyses] = useState<AIDocAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const addActivity = (c: CaseFile, message: string, author?: string): CaseFile => {
    const log = {
      id: Math.random().toString(36).substr(2, 9),
      type: (author ? 'user' : 'system') as const,
      message,
      timestamp: new Date().toISOString(),
      author: author || 'System',
    };
    return { ...c, activityLog: [log, ...(c.activityLog || [])] };
  };

  const runDeepAnalysis = async (pendingDocs: PendingFile[], docStartIndex: number) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    setIsAnalyzing(true);
    const analyses: AIDocAnalysis[] = [];

    try {
      const payload = pendingDocs.map(pf => ({
        fileData: pf.fileData,
        mimeType: pf.file.type || 'application/octet-stream',
        fileName: pf.file.name,
      }));

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: payload,
          mode: 'deep_analysis',
          clientName: caseData.clientName,
        }),
      });

      if (!response.ok) {
        setIsAnalyzing(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { setIsAnalyzing(false); return; }

      const decoder = new TextDecoder();
      let buffer = '';
      const tempAnalyses: Record<number, Partial<AIDocAnalysis>> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === 'doc_identified') {
                const idx = data.index;
                if (!tempAnalyses[idx]) tempAnalyses[idx] = {};
                tempAnalyses[idx].fileName = data.suggestedName || data.fileName;
                tempAnalyses[idx].docIndex = docStartIndex + idx;
              } else if (eventType === 'doc_analysis') {
                const idx = data.index;
                if (!tempAnalyses[idx]) tempAnalyses[idx] = {};
                tempAnalyses[idx].summary = data.summary || '';
                tempAnalyses[idx].suggestedCategory = data.suggestedCategory || '';
                tempAnalyses[idx].actions = data.actions || [];
                tempAnalyses[idx].extractedData = data.extractedData || {};
              }
            } catch {}
            eventType = '';
          }
        }
      }

      for (let i = 0; i < pendingDocs.length; i++) {
        if (tempAnalyses[i]) {
          analyses.push({
            docIndex: tempAnalyses[i].docIndex ?? (docStartIndex + i),
            fileName: tempAnalyses[i].fileName || pendingDocs[i].file.name,
            summary: tempAnalyses[i].summary || '',
            suggestedCategory: tempAnalyses[i].suggestedCategory || '',
            actions: tempAnalyses[i].actions || [],
            extractedData: tempAnalyses[i].extractedData || {},
          });
        }
      }

      if (analyses.length > 0) {
        const updatedDocs = [...caseData.documents];
        for (const a of analyses) {
          if (updatedDocs[a.docIndex]) {
            updatedDocs[a.docIndex] = {
              ...updatedDocs[a.docIndex],
              aiAnalysis: {
                summary: a.summary,
                suggestedCategory: a.suggestedCategory,
                actions: a.actions.map(act => ({ ...act, applied: false })),
                extractedData: a.extractedData,
                analyzedAt: new Date().toISOString(),
              },
            };
          }
        }
        onUpdateCase({ ...caseData, documents: updatedDocs });

        if (analyses.some(a => a.actions.length > 0 || a.summary)) {
          setDeepAnalyses(analyses);
        }
      }
    } catch (err) {
      console.error('Deep analysis failed:', err);
    }

    setIsAnalyzing(false);
  };

  const runAIScan = async (files: PendingFile[], startIndex: number) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    const documentsPayload = files.map(pf => ({
      fileData: pf.fileData,
      mimeType: pf.file.type || 'application/octet-stream',
      fileName: pf.file.name,
    }));

    setPendingFiles(prev => prev.map((pf, i) =>
      i >= startIndex && i < startIndex + files.length ? { ...pf, scanStatus: 'scanning' as ScanStatus } : pf
    ));

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documents: documentsPayload, mode: 'identify_only' }),
      });

      if (!response.ok) {
        setPendingFiles(prev => prev.map((pf, i) =>
          i >= startIndex && i < startIndex + files.length ? { ...pf, scanStatus: 'error' as ScanStatus } : pf
        ));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              if (eventType === 'doc_identified') {
                const globalIdx = startIndex + data.index;
                const aiType = VALID_DOC_TYPES.includes(data.type) ? data.type as DocumentType : undefined;
                setPendingFiles(prev => prev.map((pf, i) => {
                  if (i !== globalIdx) return pf;
                  return {
                    ...pf,
                    type: aiType || pf.type,
                    suggestedName: data.suggestedName || pf.suggestedName,
                    aiConfidence: data.confidence,
                    scanStatus: 'done' as ScanStatus,
                  };
                }));
              }
            } catch {}
            eventType = '';
          }
        }
      }

      setPendingFiles(prev => prev.map((pf, i) =>
        i >= startIndex && i < startIndex + files.length && pf.scanStatus === 'scanning'
          ? { ...pf, scanStatus: 'done' as ScanStatus }
          : pf
      ));
    } catch {
      setPendingFiles(prev => prev.map((pf, i) =>
        i >= startIndex && i < startIndex + files.length ? { ...pf, scanStatus: 'error' as ScanStatus } : pf
      ));
    }
  };

  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newPending: PendingFile[] = [];

    for (const file of fileArray) {
      const isImage = file.type.startsWith('image/');
      const preview = isImage ? URL.createObjectURL(file) : '';
      const fileData = await readFileAsDataURL(file);
      newPending.push({
        file,
        fileData,
        preview,
        type: inferDocType(file.name),
        scanStatus: 'pending',
      });
    }

    const startIndex = pendingFiles.length;
    setPendingFiles(prev => [...prev, ...newPending]);
    setUploadError(null);

    setTimeout(() => runAIScan(newPending, startIndex), 50);
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  }, [pendingFiles.length]);

  const removePendingFile = (idx: number) => {
    setPendingFiles(prev => {
      const removed = prev[idx];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updatePendingType = (idx: number, type: DocumentType) => {
    setPendingFiles(prev => prev.map((f, i) => (i === idx ? { ...f, type } : f)));
  };

  const updatePendingPhotoCategory = (idx: number, cat: PhotoCategory) => {
    setPendingFiles(prev => prev.map((f, i) => (i === idx ? { ...f, photoCategory: cat } : f)));
  };

  const updatePendingDescription = (idx: number, description: string) => {
    setPendingFiles(prev => prev.map((f, i) => (i === idx ? { ...f, description } : f)));
  };

  const existingTypeCounts: Record<string, number> = {};
  caseData.documents.forEach(doc => {
    existingTypeCounts[doc.type] = (existingTypeCounts[doc.type] || 0) + 1;
  });

  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);

    const newDocs: DocumentAttachment[] = [];
    const errors: string[] = [];
    const batchTypeCounts: Record<string, number> = { ...existingTypeCounts };

    for (const pending of pendingFiles) {
      const result = await uploadDocument(caseData.id, pending.file);
      if ('error' in result) {
        errors.push(`${pending.file.name}: ${result.error}`);
      } else {
        batchTypeCounts[pending.type] = (batchTypeCounts[pending.type] || 0) + 1;

        const properName = generateDocumentNameWithExt({
          clientName: caseData.clientName,
          dol: caseData.accidentDate || '',
          docType: pending.type,
          source: pending.suggestedName?.replace(/^.*?-\s*/, '').trim() || undefined,
          version: batchTypeCounts[pending.type],
          originalFileName: pending.file.name,
        });

        newDocs.push({
          type: pending.type,
          fileData: null,
          fileName: properName,
          mimeType: pending.file.type || 'application/octet-stream',
          source: 'Upload',
          storagePath: result.path,
          storageUrl: result.url,
          uploadedAt: new Date().toISOString(),
          ...(pending.type === 'photo' && pending.photoCategory ? { photoCategory: pending.photoCategory } : {}),
          ...(pending.description?.trim() ? { description: pending.description.trim() } : {}),
        });
      }
      if (pending.preview) URL.revokeObjectURL(pending.preview);
    }

    const savedPending = [...pendingFiles];

    if (newDocs.length > 0) {
      const docStartIndex = caseData.documents.length;
      let updated = {
        ...caseData,
        documents: [...caseData.documents, ...newDocs],
      };
      updated = addActivity(updated, `Uploaded ${newDocs.length} document(s): ${newDocs.map(d => d.fileName).join(', ')}`, authorName);

      for (let i = 0; i < newDocs.length; i++) {
        const doc = newDocs[i];
        const suggestedName = savedPending[i]?.suggestedName || '';
        const analysis = analyzeUploadedDocument(doc, suggestedName, updated);

        if (analysis.suggestedCategory) {
          const docIdx = updated.documents.length - newDocs.length + i;
          const updatedDocs = [...updated.documents];
          updatedDocs[docIdx] = { ...updatedDocs[docIdx], category: analysis.suggestedCategory };
          updated = { ...updated, documents: updatedDocs };
        }

        if (analysis.completedTasks.length > 0) {
          updated = applyDocumentActions(updated, analysis);
          for (const msg of analysis.activityMessages) {
            updated = addActivity(updated, msg);
          }
        }
      }

      onUpdateCase(updated);

      const nonPhotoPending = savedPending.filter(pf => pf.type !== 'photo');
      if (nonPhotoPending.length > 0) {
        runDeepAnalysis(nonPhotoPending, docStartIndex);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors.join('\n'));
    }

    setPendingFiles([]);
    setUploading(false);
  };

  const handleDeleteDocument = async (index: number) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    const doc = caseData.documents[index];
    if (doc.storagePath) {
      await deleteDocument(doc.storagePath);
    }
    const updatedDocs = caseData.documents.filter((_, i) => i !== index);
    let updated = { ...caseData, documents: updatedDocs };
    updated = addActivity(updated, `Document deleted: ${doc.fileName}`, authorName);
    onUpdateCase(updated);
  };

  const handleStartRename = (idx: number, currentName: string) => {
    setRenamingDocIndex(idx);
    setTempDocName(currentName);
  };

  const handleSaveRename = (idx: number) => {
    if (!tempDocName.trim()) return;
    const newDocs = [...caseData.documents];
    newDocs[idx] = { ...newDocs[idx], fileName: tempDocName.trim() };
    onUpdateCase({ ...caseData, documents: newDocs });
    setRenamingDocIndex(null);
  };

  const handleUpdateDocType = (idx: number, newType: DocumentType) => {
    const newDocs = [...caseData.documents];
    newDocs[idx] = { ...newDocs[idx], type: newType };
    onUpdateCase({ ...caseData, documents: newDocs });
    setEditingTypeIndex(null);
  };

  const handleUpdateCategory = (idx: number, cat: DocumentCategory) => {
    const newDocs = [...caseData.documents];
    newDocs[idx] = { ...newDocs[idx], category: cat };
    onUpdateCase({ ...caseData, documents: newDocs });
    setEditingCategoryIndex(null);
  };

  const handleRemoveCategory = (idx: number) => {
    const newDocs = [...caseData.documents];
    const { category: _, ...rest } = newDocs[idx];
    newDocs[idx] = rest as DocumentAttachment;
    onUpdateCase({ ...caseData, documents: newDocs });
    setEditingCategoryIndex(null);
  };

  const getDocIcon = (doc: DocumentAttachment) => {
    if (doc.mimeType?.startsWith('image/')) return 'bg-emerald-50 text-emerald-600';
    if (doc.mimeType?.includes('pdf')) return 'bg-red-50 text-red-500';
    if (doc.type === 'email') return 'bg-blue-100 text-blue-600';
    return 'bg-slate-50 text-slate-500';
  };

  const isScanning = pendingFiles.some(pf => pf.scanStatus === 'scanning');

  const filteredDocs = useMemo(() => {
    return caseData.documents
      .map((doc, originalIndex) => ({ doc, originalIndex }))
      .filter(({ doc }) => {
        if (filterType !== 'all' && doc.type !== filterType) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = doc.fileName?.toLowerCase().includes(q);
          const sourceMatch = doc.source?.toLowerCase().includes(q);
          const descMatch = doc.description?.toLowerCase().includes(q);
          const catMatch = doc.category ? DOCUMENT_CATEGORY_LABELS[doc.category]?.toLowerCase().includes(q) : false;
          const typeMatch = (DOCUMENT_NAMING_RULES[doc.type] || doc.type).toLowerCase().includes(q);
          if (!nameMatch && !sourceMatch && !descMatch && !catMatch && !typeMatch) return false;
        }
        return true;
      });
  }, [caseData.documents, searchQuery, filterType]);

  const activeDocTypes = useMemo(() => {
    const types = new Set(caseData.documents.map(d => d.type));
    return DOC_TYPE_OPTIONS.filter(opt => types.has(opt.value));
  }, [caseData.documents]);

  return (
    <div className="animate-fade-in space-y-6">
      <div
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">Drag and drop files here</p>
          <p className="text-xs text-slate-400 mb-4">Images, PDFs, and documents up to 50MB</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
          >
            Browse Files
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx"
            multiple
            onChange={onFileInputChange}
          />
        </div>
      </div>

      {pendingFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-slate-800 text-sm">
              {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} ready to upload
            </h4>
            {isScanning && (
              <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                AI scanning documents...
              </div>
            )}
          </div>
          <div className="space-y-3 mb-6">
            {pendingFiles.map((pf, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-4">
                  {pf.preview ? (
                    <img src={pf.preview} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{pf.file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400">{(pf.file.size / 1024).toFixed(0)} KB</p>
                      {pf.scanStatus === 'scanning' && (
                        <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium">
                          <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Scanning...
                        </span>
                      )}
                      {pf.scanStatus === 'done' && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          AI identified
                          {pf.aiConfidence != null && ` (${pf.aiConfidence}%)`}
                        </span>
                      )}
                      {pf.scanStatus === 'error' && (
                        <span className="text-[10px] text-amber-600 font-medium">Manual classification</span>
                      )}
                    </div>
                  </div>
                  <select
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                    value={pf.type}
                    onChange={(e) => updatePendingType(idx, e.target.value as DocumentType)}
                  >
                    {DOC_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {pf.type === 'photo' && (
                    <select
                      className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                      value={pf.photoCategory || ''}
                      onChange={(e) => updatePendingPhotoCategory(idx, e.target.value as PhotoCategory)}
                    >
                      <option value="">Category...</option>
                      {Object.entries(PHOTO_CATEGORY_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => removePendingFile(idx)}
                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {pf.type === 'photo' && (
                  <div className="mt-2 pl-16">
                    <input
                      type="text"
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                      placeholder="Describe this image (e.g., Front bumper damage, Left knee bruising, Intersection looking north)"
                      value={pf.description || ''}
                      onChange={(e) => updatePendingDescription(idx, e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {uploadError && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {uploadError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirmUpload}
              disabled={uploading || isScanning}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center ${
                uploading || isScanning
                  ? 'bg-blue-300 text-white cursor-wait'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploading ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </>
              ) : isScanning ? (
                'Waiting for scan...'
              ) : (
                `Upload ${pendingFiles.length} File${pendingFiles.length > 1 ? 's' : ''}`
              )}
            </button>
            <button
              onClick={() => {
                pendingFiles.forEach(pf => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
                setPendingFiles([]);
              }}
              className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">AI is analyzing uploaded documents...</p>
              <p className="text-xs text-slate-500">Reading all pages to extract actionable information</p>
            </div>
            <svg className="animate-spin w-5 h-5 text-blue-600 ml-auto" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </div>
      )}

      {deepAnalyses.length > 0 && !isAnalyzing && (
        <DocumentActionPanel
          analyses={deepAnalyses}
          caseData={caseData}
          onUpdateCase={onUpdateCase}
          onDismiss={() => setDeepAnalyses([])}
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-800 text-sm">
              {caseData.documents.length} Document{caseData.documents.length !== 1 ? 's' : ''}
            </h3>
          </div>
          {caseData.documents.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterType === 'all'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {activeDocTypes.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFilterType(filterType === opt.value ? 'all' : opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      filterType === opt.value
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {caseData.documents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No documents uploaded yet</p>
            <p className="text-xs text-slate-400 mt-1">Drag files above or click Browse to get started</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">No documents match your search</p>
            <button onClick={() => { setSearchQuery(''); setFilterType('all'); }} className="text-xs text-blue-600 hover:text-blue-700 mt-2">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Uploaded</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {filteredDocs.map(({ doc, originalIndex: idx }) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group/row"
                    onClick={() => {
                      if (doc.aiAnalysis) {
                        const analysis: AIDocAnalysis = {
                          docIndex: idx,
                          fileName: doc.fileName,
                          summary: doc.aiAnalysis.summary,
                          suggestedCategory: doc.aiAnalysis.suggestedCategory || '',
                          actions: doc.aiAnalysis.actions,
                          extractedData: doc.aiAnalysis.extractedData,
                        };
                        setDeepAnalyses([analysis]);
                      } else if (doc.generatedFormType) {
                        setGeneratedDocPreview(doc.generatedFormType as DocumentFormType);
                      } else {
                        setPreviewIndex(idx);
                      }
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-8 w-8 rounded flex items-center justify-center mr-3 ${getDocIcon(doc)}`}>
                          {doc.mimeType?.startsWith('image/') ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          {renamingDocIndex === idx ? (
                            <input
                              autoFocus
                              className="w-40 text-sm border border-blue-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                              value={tempDocName}
                              onChange={(e) => setTempDocName(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              onBlur={() => handleSaveRename(idx)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename(idx); }}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 group-hover/row:text-blue-700 transition-colors">{doc.fileName}</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStartRename(idx, doc.fileName); }}
                                className="opacity-0 group-hover/row:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity p-1"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              </button>
                              {doc.aiAnalysis ? (
                                <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                  AI Analysis
                                </span>
                              ) : (
                                <span className="opacity-0 group-hover/row:opacity-100 text-[10px] text-blue-500 font-medium transition-opacity">Preview</span>
                              )}
                            </div>
                          )}
                          {doc.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">{doc.description}</p>
                          )}
                          {doc.aiAnalysis?.summary && (
                            <p className="text-[11px] text-blue-400 mt-0.5 truncate max-w-xs">{doc.aiAnalysis.summary}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {editingTypeIndex === idx ? (
                        <select
                          autoFocus
                          className="text-xs bg-white border border-blue-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                          value={doc.type}
                          onChange={(e) => handleUpdateDocType(idx, e.target.value as DocumentType)}
                          onBlur={() => setEditingTypeIndex(null)}
                        >
                          {DOC_TYPE_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingTypeIndex(idx)}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide bg-slate-100 text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition-colors group/type"
                        >
                          {DOCUMENT_NAMING_RULES[doc.type] || doc.type}
                          <svg className="w-3 h-3 opacity-0 group-hover/type:opacity-100 transition-opacity text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {editingCategoryIndex === idx ? (
                        <div className="flex items-center gap-1">
                          <select
                            autoFocus
                            className="text-xs bg-white border border-blue-300 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                            value={doc.category || ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUpdateCategory(idx, e.target.value as DocumentCategory);
                              } else {
                                handleRemoveCategory(idx);
                              }
                            }}
                            onBlur={() => setEditingCategoryIndex(null)}
                          >
                            <option value="">None</option>
                            {CATEGORY_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                      ) : doc.category ? (
                        <button
                          onClick={() => setEditingCategoryIndex(idx)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-colors group/cat"
                        >
                          {DOCUMENT_CATEGORY_LABELS[doc.category]}
                          <svg className="w-3 h-3 opacity-0 group-hover/cat:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingCategoryIndex(idx)}
                          className="text-slate-400 hover:text-blue-600 text-xs transition-colors"
                        >
                          + Add
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {doc.source || 'Manual Upload'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {(doc.storageUrl || doc.fileData) && (
                          <a
                            href={doc.storageUrl || doc.fileData || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={doc.fileName}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title="Download"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteDocument(idx)}
                          className="text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewIndex !== null && (
        <DocumentPreviewModal
          documents={caseData.documents}
          currentIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onNavigate={setPreviewIndex}
        />
      )}

      <DocumentGenerator
        isOpen={generatedDocPreview !== null}
        onClose={() => setGeneratedDocPreview(null)}
        caseData={caseData}
        formType={generatedDocPreview}
      />
    </div>
  );
};
