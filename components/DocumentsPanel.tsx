import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CaseFile, DocumentAttachment, DocumentType, DOCUMENT_NAMING_RULES, PhotoCategory, PHOTO_CATEGORY_LABELS } from '../types';
import { uploadDocument, deleteDocument } from '../services/documentStorageService';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DocumentsPanelProps {
  caseData: CaseFile;
  onUpdateCase: (updatedCase: CaseFile) => void;
}

interface PendingFile {
  file: File;
  preview: string;
  type: DocumentType;
  photoCategory?: PhotoCategory;
}

const DOC_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: 'retainer', label: 'Retainer' },
  { value: 'crash_report', label: 'Crash Report' },
  { value: 'medical_record', label: 'Medical Record' },
  { value: 'authorization', label: 'Authorization' },
  { value: 'insurance_card', label: 'Insurance Card' },
  { value: 'photo', label: 'Photo' },
  { value: 'other', label: 'Other' },
];

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({ caseData, onUpdateCase }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);
  const [renamingDocIndex, setRenamingDocIndex] = useState<number | null>(null);
  const [tempDocName, setTempDocName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const addActivity = (c: CaseFile, message: string): CaseFile => {
    const log = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'system' as const,
      message,
      timestamp: new Date().toISOString(),
    };
    return { ...c, activityLog: [log, ...(c.activityLog || [])] };
  };

  const handleFilesSelected = (files: FileList | File[]) => {
    const newPending: PendingFile[] = [];
    Array.from(files).forEach((file) => {
      const isImage = file.type.startsWith('image/');
      const preview = isImage ? URL.createObjectURL(file) : '';
      const inferredType = inferDocType(file.name);
      newPending.push({ file, preview, type: inferredType });
    });
    setPendingFiles((prev) => [...prev, ...newPending]);
    setUploadError(null);
  };

  const inferDocType = (filename: string): DocumentType => {
    const lower = filename.toLowerCase();
    if (lower.includes('retainer')) return 'retainer';
    if (lower.includes('crash') || lower.includes('police')) return 'crash_report';
    if (lower.includes('medical') || lower.includes('record')) return 'medical_record';
    if (lower.includes('auth') || lower.includes('hipaa')) return 'authorization';
    if (lower.includes('insurance')) return 'insurance_card';
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) return 'photo';
    return 'other';
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
  }, []);

  const removePendingFile = (idx: number) => {
    setPendingFiles((prev) => {
      const removed = prev[idx];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updatePendingType = (idx: number, type: DocumentType) => {
    setPendingFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, type } : f)));
  };

  const updatePendingPhotoCategory = (idx: number, cat: PhotoCategory) => {
    setPendingFiles((prev) => prev.map((f, i) => (i === idx ? { ...f, photoCategory: cat } : f)));
  };

  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);
    setUploadError(null);

    const newDocs: DocumentAttachment[] = [];
    const errors: string[] = [];

    for (const pending of pendingFiles) {
      const result = await uploadDocument(caseData.id, pending.file);
      if ('error' in result) {
        errors.push(`${pending.file.name}: ${result.error}`);
      } else {
        newDocs.push({
          type: pending.type,
          fileData: null,
          fileName: pending.file.name,
          mimeType: pending.file.type || 'application/octet-stream',
          source: 'Manual Upload',
          tags: [],
          storagePath: result.path,
          storageUrl: result.url,
          ...(pending.type === 'photo' && pending.photoCategory ? { photoCategory: pending.photoCategory } : {}),
        });
      }
      if (pending.preview) URL.revokeObjectURL(pending.preview);
    }

    if (newDocs.length > 0) {
      let updated = {
        ...caseData,
        documents: [...caseData.documents, ...newDocs],
      };
      updated = addActivity(updated, `Uploaded ${newDocs.length} document(s): ${newDocs.map((d) => d.fileName).join(', ')}`);
      onUpdateCase(updated);
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
    updated = addActivity(updated, `Document deleted: ${doc.fileName}`);
    onUpdateCase(updated);
  };

  const handleAddTag = (docIndex: number) => {
    if (!tagInput.trim()) return;
    const newDocs = [...caseData.documents];
    if (!newDocs[docIndex].tags) newDocs[docIndex].tags = [];
    newDocs[docIndex].tags!.push(tagInput.trim());
    onUpdateCase({ ...caseData, documents: newDocs });
    setTagInput('');
    setActiveDocIndex(null);
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

  const getDocIcon = (doc: DocumentAttachment) => {
    if (doc.mimeType?.startsWith('image/')) return 'bg-emerald-50 text-emerald-600';
    if (doc.mimeType?.includes('pdf')) return 'bg-red-50 text-red-500';
    if (doc.type === 'email') return 'bg-blue-100 text-blue-600';
    return 'bg-slate-50 text-slate-500';
  };

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
          <h4 className="font-bold text-slate-800 mb-4 text-sm">
            {pendingFiles.length} file{pendingFiles.length > 1 ? 's' : ''} ready to upload
          </h4>
          <div className="space-y-3 mb-6">
            {pendingFiles.map((pf, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
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
                  <p className="text-xs text-slate-400">{(pf.file.size / 1024).toFixed(0)} KB</p>
                </div>
                <select
                  className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                  value={pf.type}
                  onChange={(e) => updatePendingType(idx, e.target.value as DocumentType)}
                >
                  {DOC_TYPE_OPTIONS.map((opt) => (
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
              disabled={uploading}
              className={`px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center ${
                uploading
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
              ) : (
                `Upload ${pendingFiles.length} File${pendingFiles.length > 1 ? 's' : ''}`
              )}
            </button>
            <button
              onClick={() => {
                pendingFiles.forEach((pf) => { if (pf.preview) URL.revokeObjectURL(pf.preview); });
                setPendingFiles([]);
              }}
              className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">
            {caseData.documents.length} Document{caseData.documents.length !== 1 ? 's' : ''}
          </h3>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Document</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tags</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {caseData.documents.map((doc, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group/row"
                    onClick={() => setPreviewIndex(idx)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-8 w-8 rounded flex items-center justify-center mr-3 ${getDocIcon(doc)}`}>
                          {doc.mimeType?.startsWith('image/') ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          )}
                        </div>
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
                            <span className="opacity-0 group-hover/row:opacity-100 text-[10px] text-blue-500 font-medium transition-opacity">Preview</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide bg-slate-100 text-slate-800">
                        {DOCUMENT_NAMING_RULES[doc.type] || doc.type}
                      </span>
                      {doc.photoCategory && (
                        <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          {PHOTO_CATEGORY_LABELS[doc.photoCategory]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {doc.source || 'Manual Upload'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-1 items-center">
                        {doc.tags?.map((tag, tIdx) => (
                          <span key={tIdx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {tag}
                          </span>
                        ))}
                        {activeDocIndex === idx ? (
                          <input
                            autoFocus
                            className="w-20 text-xs border border-slate-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-blue-500"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddTag(idx); }}
                            onBlur={() => handleAddTag(idx)}
                          />
                        ) : (
                          <button onClick={() => setActiveDocIndex(idx)} className="text-slate-400 hover:text-blue-600 text-xs font-bold">+</button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {doc.storageUrl && (
                          <a
                            href={doc.storageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
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
    </div>
  );
};
