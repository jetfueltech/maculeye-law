import React, { useState, useMemo } from 'react';
import type { Email, EmailThread, EmailAttachment } from '../../types';

interface AggregatedAttachment {
  attachment: EmailAttachment;
  attachmentIndex: number;
  sourceEmail: Email;
  key: string;
}

interface AttachmentHubProps {
  thread: EmailThread;
  linkedCaseId?: string;
  onPreview: (att: EmailAttachment) => void;
  onDownload: (att: EmailAttachment) => void;
  onAddToCase?: (email: Email, attachmentIndex: number) => void;
  processedAttachments: Set<string>;
  processingAttachment: string | null;
  downloadingAttachment: string | null;
  loadingPreview: string | null;
}

function formatShortDate(isoOrRelative: string, receivedAt?: string): string {
  const src = receivedAt || isoOrRelative;
  const d = new Date(src);
  if (isNaN(d.getTime())) return isoOrRelative;
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  pdf: { bg: 'bg-red-100', text: 'text-red-600' },
  image: { bg: 'bg-blue-100', text: 'text-blue-600' },
  doc: { bg: 'bg-amber-100', text: 'text-amber-600' },
};

const TypeIcon: React.FC<{ type: string; className?: string }> = ({ type, className = 'w-4 h-4' }) => {
  if (type === 'pdf') return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
  if (type === 'image') return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
};

export const AttachmentHub: React.FC<AttachmentHubProps> = ({
  thread,
  linkedCaseId,
  onPreview,
  onDownload,
  onAddToCase,
  processedAttachments,
  processingAttachment,
  downloadingAttachment,
  loadingPreview,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const allAttachments = useMemo<AggregatedAttachment[]>(() => {
    const result: AggregatedAttachment[] = [];
    for (const email of thread.messages) {
      email.attachments.forEach((att, idx) => {
        result.push({
          attachment: att,
          attachmentIndex: idx,
          sourceEmail: email,
          key: `${email.id}-${idx}`,
        });
      });
    }
    return result;
  }, [thread.messages]);

  if (allAttachments.length === 0) return null;

  const typeCounts = allAttachments.reduce<Record<string, number>>((acc, a) => {
    acc[a.attachment.type] = (acc[a.attachment.type] || 0) + 1;
    return acc;
  }, {});

  const typeSummary = Object.entries(typeCounts)
    .map(([type, count]) => {
      const label = type === 'pdf' ? 'PDF' : type === 'image' ? 'Image' : 'Doc';
      return `${count} ${label}${count !== 1 ? 's' : ''}`;
    })
    .join(', ');

  return (
    <div className="mx-6 mt-1 mb-3">
      <div className="border border-stone-200 rounded-xl bg-stone-50/80 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-stone-100/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </div>
            <span className="text-xs font-bold text-stone-700">Attachments</span>
            <span className="text-[10px] font-semibold text-stone-400 bg-stone-200/60 px-1.5 py-0.5 rounded-full">
              {allAttachments.length} file{allAttachments.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-stone-400 hidden sm:inline">{typeSummary}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isExpanded && (
              <div className="flex items-center border border-stone-200 rounded-md overflow-hidden mr-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 transition-colors ${viewMode === 'grid' ? 'bg-stone-200 text-stone-700' : 'bg-white text-stone-400 hover:text-stone-600'}`}
                  title="Grid view"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 transition-colors ${viewMode === 'list' ? 'bg-stone-200 text-stone-700' : 'bg-white text-stone-400 hover:text-stone-600'}`}
                  title="List view"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
              </div>
            )}
            <svg className={`w-4 h-4 text-stone-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="border-t border-stone-200/60">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 p-3">
                {allAttachments.map((item) => (
                  <GridCard
                    key={item.key}
                    item={item}
                    linkedCaseId={linkedCaseId}
                    onPreview={onPreview}
                    onDownload={onDownload}
                    onAddToCase={onAddToCase}
                    isProcessed={processedAttachments.has(item.key)}
                    isProcessing={processingAttachment === item.key}
                    isDownloading={downloadingAttachment === (item.attachment.attachmentId || item.attachment.name)}
                    isLoadingPreview={loadingPreview === (item.attachment.attachmentId || item.attachment.name)}
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-stone-100 px-3 pb-2">
                {allAttachments.map((item) => (
                  <ListRow
                    key={item.key}
                    item={item}
                    linkedCaseId={linkedCaseId}
                    onPreview={onPreview}
                    onDownload={onDownload}
                    onAddToCase={onAddToCase}
                    isProcessed={processedAttachments.has(item.key)}
                    isProcessing={processingAttachment === item.key}
                    isDownloading={downloadingAttachment === (item.attachment.attachmentId || item.attachment.name)}
                    isLoadingPreview={loadingPreview === (item.attachment.attachmentId || item.attachment.name)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AttachmentItemProps {
  item: AggregatedAttachment;
  linkedCaseId?: string;
  onPreview: (att: EmailAttachment) => void;
  onDownload: (att: EmailAttachment) => void;
  onAddToCase?: (email: Email, attachmentIndex: number) => void;
  isProcessed: boolean;
  isProcessing: boolean;
  isDownloading: boolean;
  isLoadingPreview: boolean;
}

const GridCard: React.FC<AttachmentItemProps> = ({
  item, linkedCaseId, onPreview, onDownload, onAddToCase,
  isProcessed, isProcessing, isDownloading, isLoadingPreview,
}) => {
  const { attachment: att, sourceEmail, attachmentIndex } = item;
  const style = TYPE_STYLES[att.type] || TYPE_STYLES.doc;
  const canPreview = !!att.storagePath;

  return (
    <div
      className={`border border-stone-200 rounded-lg bg-white transition-all group overflow-hidden ${canPreview ? 'hover:border-blue-200 hover:shadow-sm cursor-pointer' : ''}`}
      onClick={() => canPreview && onPreview(att)}
    >
      <div className={`h-16 ${style.bg} flex items-center justify-center relative`}>
        {isLoadingPreview ? (
          <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
        ) : (
          <TypeIcon type={att.type} className="w-7 h-7 opacity-60" />
        )}
        {att.type === 'image' && (
          <div className={`absolute inset-0 flex items-center justify-center ${style.text} opacity-0 group-hover:opacity-100 transition-opacity bg-black/5`}>
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-semibold text-stone-800 truncate leading-tight">{att.name}</p>
        <p className="text-[10px] text-stone-400 mt-0.5">{att.size}</p>
        <p className="text-[10px] text-stone-400 truncate mt-0.5">
          {sourceEmail.from} - {formatShortDate(sourceEmail.date, sourceEmail.receivedAt)}
        </p>
        <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
          {att.storagePath && (
            <>
              <button
                onClick={() => onPreview(att)}
                disabled={isLoadingPreview}
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                View
              </button>
              <button
                onClick={() => onDownload(att)}
                disabled={isDownloading}
                className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-stone-600 bg-white border border-stone-200 px-1.5 py-0.5 rounded hover:bg-stone-50 transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <div className="w-2.5 h-2.5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                ) : (
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                )}
                Save
              </button>
            </>
          )}
          {isProcessed ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Added
            </span>
          ) : linkedCaseId && onAddToCase ? (
            <button
              onClick={() => onAddToCase(sourceEmail, attachmentIndex)}
              disabled={isProcessing}
              className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <div className="w-2.5 h-2.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              )}
              To Case
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const ListRow: React.FC<AttachmentItemProps> = ({
  item, linkedCaseId, onPreview, onDownload, onAddToCase,
  isProcessed, isProcessing, isDownloading, isLoadingPreview,
}) => {
  const { attachment: att, sourceEmail, attachmentIndex } = item;
  const style = TYPE_STYLES[att.type] || TYPE_STYLES.doc;
  const canPreview = !!att.storagePath;

  return (
    <div
      className={`flex items-center justify-between py-2 first:pt-2 group ${canPreview ? 'cursor-pointer' : ''}`}
      onClick={() => canPreview && onPreview(att)}
    >
      <div className="flex items-center flex-1 min-w-0 gap-2.5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} ${style.text}`}>
          {isLoadingPreview ? (
            <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          ) : (
            <TypeIcon type={att.type} />
          )}
        </div>
        <div className="min-w-0">
          <p className={`text-xs font-medium truncate ${canPreview ? 'text-blue-700 group-hover:text-blue-800' : 'text-stone-800'}`}>{att.name}</p>
          <p className="text-[10px] text-stone-400 truncate">
            {att.size} - {sourceEmail.from} - {formatShortDate(sourceEmail.date, sourceEmail.receivedAt)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {att.storagePath && (
          <>
            <button
              onClick={() => onPreview(att)}
              disabled={isLoadingPreview}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              View
            </button>
            <button
              onClick={() => onDownload(att)}
              disabled={isDownloading}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-600 bg-white border border-stone-200 px-2 py-1 rounded-md hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              {isDownloading ? (
                <div className="w-3 h-3 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              )}
              Download
            </button>
          </>
        )}
        {isProcessed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            Added
          </span>
        ) : linkedCaseId && onAddToCase ? (
          <button
            onClick={() => onAddToCase(sourceEmail, attachmentIndex)}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            )}
            To Case
          </button>
        ) : null}
      </div>
    </div>
  );
};
