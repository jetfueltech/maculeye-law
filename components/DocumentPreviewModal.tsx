import React, { useEffect, useCallback } from 'react';
import { DocumentAttachment, DOCUMENT_NAMING_RULES, PHOTO_CATEGORY_LABELS } from '../types';

interface DocumentPreviewModalProps {
  documents: DocumentAttachment[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

const DOC_TYPE_ICON_COLORS: Record<string, string> = {
  retainer: 'bg-emerald-100 text-emerald-600',
  crash_report: 'bg-blue-100 text-blue-600',
  authorization: 'bg-amber-100 text-amber-600',
  insurance_card: 'bg-cyan-100 text-cyan-600',
  medical_record: 'bg-rose-100 text-rose-600',
  photo: 'bg-teal-100 text-teal-600',
  email: 'bg-blue-100 text-blue-600',
  other: 'bg-slate-100 text-slate-500',
};

function detectIsImage(doc: DocumentAttachment): boolean {
  if (doc.mimeType?.startsWith('image/')) return true;
  const ext = doc.fileName?.toLowerCase() || '';
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|heic)$/i.test(ext);
}

function detectIsPdf(doc: DocumentAttachment): boolean {
  if (doc.mimeType?.includes('pdf')) return true;
  const ext = doc.fileName?.toLowerCase() || '';
  return /\.pdf$/i.test(ext);
}

function getPreviewSrc(doc: DocumentAttachment): string | null {
  return doc.storageUrl || doc.fileData || null;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  documents,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  const doc = documents[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < documents.length - 1;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrev) onNavigate(currentIndex - 1);
    if (e.key === 'ArrowRight' && hasNext) onNavigate(currentIndex + 1);
  }, [currentIndex, hasPrev, hasNext, onClose, onNavigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!doc) return null;

  const previewSrc = getPreviewSrc(doc);
  const isImage = detectIsImage(doc);
  const isPdf = detectIsPdf(doc);
  const canPreview = !!previewSrc && (isImage || isPdf);
  const typeColor = DOC_TYPE_ICON_COLORS[doc.type] || DOC_TYPE_ICON_COLORS.other;
  const downloadUrl = doc.storageUrl || doc.fileData;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative z-10 flex items-center justify-between px-6 py-3 bg-black/40">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColor}`}>
            {isImage ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{doc.fileName}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider">
                {DOCUMENT_NAMING_RULES[doc.type] || doc.type}
              </span>
              {doc.photoCategory && (
                <span className="text-[10px] text-white/50">
                  {PHOTO_CATEGORY_LABELS[doc.photoCategory]}
                </span>
              )}
              {doc.source && (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-[10px] text-white/50">{doc.source}</span>
                </>
              )}
              {doc.description && (
                <>
                  <span className="text-white/30">|</span>
                  <span className="text-[10px] text-white/50 truncate max-w-[200px]">{doc.description}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-white/50 mr-2">
            {currentIndex + 1} of {documents.length}
          </span>
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={doc.fileName}
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </a>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Open in new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          )}
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center p-4 min-h-0" onClick={onClose}>
        {hasPrev && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
            className="absolute left-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
        )}

        {hasNext && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
            className="absolute right-4 z-20 w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white flex items-center justify-center transition-all backdrop-blur-sm border border-white/10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        )}

        <div
          className="max-w-5xl w-full max-h-full flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          {canPreview && isImage ? (
            <img
              src={previewSrc!}
              alt={doc.fileName}
              className="max-w-full max-h-[82vh] rounded-xl shadow-2xl object-contain"
            />
          ) : canPreview && isPdf ? (
            <iframe
              src={previewSrc!}
              className="w-full rounded-xl border border-white/10 shadow-2xl bg-white"
              style={{ height: '82vh' }}
              title={doc.fileName}
            />
          ) : (
            <div className="bg-white rounded-2xl shadow-2xl p-12 text-center max-w-md">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-slate-800 font-semibold text-lg break-all">{doc.fileName}</p>
              <p className="text-sm text-slate-400 mt-2 mb-6">
                {!previewSrc ? 'This document has no preview or download available' : 'Preview is not available for this file type'}
              </p>
              {downloadUrl && (
                <div className="flex items-center justify-center gap-3">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.fileName}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-lg shadow-blue-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Download
                  </a>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Open in new tab
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {documents.length > 1 && (
        <div className="relative z-10 flex justify-center gap-2 px-6 py-3 bg-black/40">
          <div className="flex gap-1.5 items-center max-w-2xl overflow-x-auto py-1 px-2">
            {documents.map((d, i) => {
              const active = i === currentIndex;
              const thumbIsImage = detectIsImage(d);
              const thumbSrc = getPreviewSrc(d);

              return (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); onNavigate(i); }}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    active
                      ? 'border-white ring-2 ring-blue-400 scale-110'
                      : 'border-white/20 opacity-60 hover:opacity-90 hover:border-white/40'
                  }`}
                >
                  {thumbIsImage && thumbSrc ? (
                    <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${
                      detectIsPdf(d) ? 'bg-red-100' : 'bg-slate-100'
                    }`}>
                      <svg className={`w-5 h-5 ${detectIsPdf(d) ? 'text-red-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
