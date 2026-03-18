import React, { useState } from 'react';
import { IdentifiedDocument } from '../../services/documentExtractionService';

const DOC_TYPE_LABELS: Record<string, string> = {
  retainer: 'Retainer Agreement',
  crash_report: 'Police / Crash Report',
  authorization: 'HIPAA Authorization',
  insurance_card: 'Insurance Card',
  medical_record: 'Medical Record',
  photo: 'Photo',
  email: 'Email',
  other: 'Other Document',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  retainer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  crash_report: 'bg-blue-50 text-blue-700 border-blue-200',
  authorization: 'bg-amber-50 text-amber-700 border-amber-200',
  insurance_card: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  medical_record: 'bg-rose-50 text-rose-700 border-rose-200',
  photo: 'bg-slate-50 text-slate-700 border-slate-200',
  email: 'bg-slate-50 text-slate-600 border-slate-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

interface DocumentPreviewPanelProps {
  documents: IdentifiedDocument[];
  activeDoc: IdentifiedDocument | null;
  onSelectDoc: (doc: IdentifiedDocument) => void;
  onClose: () => void;
}

export const DocumentPreviewPanel: React.FC<DocumentPreviewPanelProps> = ({
  documents,
  activeDoc,
  onSelectDoc,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);

  const isPdf = activeDoc?.mimeType.includes('pdf');
  const isImage = activeDoc?.mimeType.includes('image');

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Document Preview</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex gap-1.5 px-3 py-2 border-b border-slate-100 overflow-x-auto flex-shrink-0 bg-white">
        {documents.map((doc, i) => {
          const isActive = activeDoc?.file.name === doc.file.name && activeDoc?.identifiedType === doc.identifiedType;
          const docIsImage = doc.mimeType.includes('image');
          return (
            <button
              key={i}
              onClick={() => { onSelectDoc(doc); setZoom(1); }}
              className={`flex-shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-50 ring-2 ring-blue-300'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className={`w-10 h-12 rounded overflow-hidden flex items-center justify-center border ${
                isActive ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-slate-50'
              }`}>
                {docIsImage && doc.fileData ? (
                  <img src={doc.fileData} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className={`w-4 h-4 ${doc.mimeType.includes('pdf') ? 'text-red-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <span className={`text-[9px] font-medium max-w-[56px] truncate ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}>
                {DOC_TYPE_LABELS[doc.identifiedType]?.split(' ')[0] || 'Doc'}
              </span>
            </button>
          );
        })}
      </div>

      {activeDoc && (
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-xs font-semibold text-slate-700 truncate">{activeDoc.suggestedName || activeDoc.file.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${DOC_TYPE_COLORS[activeDoc.identifiedType] || DOC_TYPE_COLORS.other}`}>
                {DOC_TYPE_LABELS[activeDoc.identifiedType] || 'Other'}
              </span>
              <span className="text-[10px] text-slate-400">{activeDoc.file.name}</span>
            </div>
          </div>
          {isImage && (
            <div className="flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-lg p-0.5 flex-shrink-0">
              <button
                onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                className="p-1 text-slate-500 hover:text-slate-700 hover:bg-white rounded transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-[10px] font-medium text-slate-500 px-1 min-w-[32px] text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                className="p-1 text-slate-500 hover:text-slate-700 hover:bg-white rounded transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-3">
        {!activeDoc ? (
          <div className="text-center py-12">
            <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <p className="text-xs text-slate-400">Select a document above to preview</p>
          </div>
        ) : isPdf ? (
          <iframe
            src={activeDoc.fileData}
            className="w-full h-full min-h-[400px] rounded-lg border border-slate-200 bg-white"
            title={activeDoc.suggestedName || activeDoc.file.name}
          />
        ) : isImage ? (
          <div className="overflow-auto max-w-full max-h-full flex items-center justify-center">
            <img
              src={activeDoc.fileData}
              alt={activeDoc.suggestedName || activeDoc.file.name}
              className="rounded-lg shadow-md transition-transform duration-200 max-w-full"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-3 border border-slate-200">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 font-medium">Preview not available</p>
          </div>
        )}
      </div>
    </div>
  );
};
