import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Email, EmailThread, CaseFile, EmailCategory } from '../../types';
import { EMAIL_CATEGORY_LABELS } from '../../types';
import { getAttachmentDownloadUrl, copyAttachmentToCaseDocuments } from '../../services/outlookService';
import { ComposeEmail, ComposeMode } from './ComposeEmail';

interface ThreadDetailProps {
  thread: EmailThread;
  cases: CaseFile[];
  onOpenLinkModal: () => void;
  onProcessAttachment?: (caseId: string, email: Email, attachmentIndex: number) => void;
  getCaseTag: (caseId: string) => string;
  performLink: (caseId: string, email: Email) => void;
  CATEGORY_COLORS: Record<EmailCategory, string>;
  firmId?: string;
  senderEmail?: string;
  onEmailSent?: () => void;
}

function formatFullDateTime(isoOrRelative: string, receivedAt?: string): string {
  const src = receivedAt || isoOrRelative;
  const d = new Date(src);
  if (isNaN(d.getTime())) return isoOrRelative;

  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;

  const thisYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(thisYear ? {} : { year: 'numeric' }),
  });

  return `${dateStr} at ${time}`;
}

const EmailBodyRenderer: React.FC<{ email: Email }> = ({ email }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(200);

  const hasHtml = !!email.bodyHtml && email.bodyHtml.trim().length > 0 &&
    email.bodyHtml !== email.body;

  const adjustHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentDocument?.body) return;
    const h = iframe.contentDocument.body.scrollHeight;
    if (h > 0) setIframeHeight(Math.min(h + 32, 2000));
  }, []);

  useEffect(() => {
    if (!hasHtml) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const writeContent = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;

      const wrappedHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            html, body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #1c1917;
              word-wrap: break-word;
              overflow-wrap: break-word;
              max-width: 100%;
              overflow-x: hidden;
            }
            body { padding: 16px; box-sizing: border-box; }
            * { max-width: 100%; box-sizing: border-box; }
            img { max-width: 100%; height: auto; }
            a { color: #2563eb; word-break: break-all; }
            table { max-width: 100%; table-layout: fixed; overflow-wrap: break-word; }
            td, th { overflow-wrap: break-word; word-break: break-word; }
            pre, code { white-space: pre-wrap; word-wrap: break-word; overflow-x: auto; }
            blockquote {
              border-left: 3px solid #d6d3d1;
              margin: 8px 0;
              padding: 4px 12px;
              color: #57534e;
            }
          </style>
        </head>
        <body>${email.bodyHtml}</body>
        </html>
      `;

      doc.open();
      doc.write(wrappedHtml);
      doc.close();

      setTimeout(adjustHeight, 100);
      setTimeout(adjustHeight, 500);
      setTimeout(adjustHeight, 1500);
    };

    if (iframe.contentDocument?.readyState === 'complete') {
      writeContent();
    } else {
      iframe.addEventListener('load', writeContent, { once: true });
    }
  }, [email.bodyHtml, hasHtml, adjustHeight]);

  if (hasHtml) {
    return (
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        style={{ width: '100%', height: iframeHeight, border: 'none', display: 'block' }}
        title="Email content"
      />
    );
  }

  return (
    <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap font-sans">
      {email.body}
    </div>
  );
};

export const ThreadDetail: React.FC<ThreadDetailProps> = ({
  thread,
  cases,
  onOpenLinkModal,
  onProcessAttachment,
  getCaseTag,
  performLink,
  CATEGORY_COLORS,
  firmId,
  senderEmail,
  onEmailSent,
}) => {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set([thread.messages[0]?.id])
  );
  const [processedAttachments, setProcessedAttachments] = useState<Set<string>>(new Set());
  const [processingAttachment, setProcessingAttachment] = useState<string | null>(null);
  const [downloadingAtt, setDownloadingAtt] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>('');
  const [previewContentType, setPreviewContentType] = useState<string>('');
  const [previewStoragePath, setPreviewStoragePath] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [addingToDocuments, setAddingToDocuments] = useState(false);
  const [addedToDocuments, setAddedToDocuments] = useState(false);
  const [composeMode, setComposeMode] = useState<ComposeMode | null>(null);
  const [composeTargetEmail, setComposeTargetEmail] = useState<Email | null>(null);

  const openCompose = (mode: ComposeMode, email?: Email) => {
    setComposeMode(mode);
    setComposeTargetEmail(email || thread.messages[0] || null);
  };

  const closeCompose = () => {
    setComposeMode(null);
    setComposeTargetEmail(null);
  };

  const toggleMessage = (id: string) => {
    setExpandedMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedMessages(new Set(thread.messages.map(m => m.id)));
  };

  const collapseAll = () => {
    setExpandedMessages(new Set([thread.messages[0]?.id]));
  };

  const handleDownload = async (att: Email['attachments'][0]) => {
    if (!att.storagePath) return;
    setDownloadingAtt(att.attachmentId || att.name);
    const url = await getAttachmentDownloadUrl(att.storagePath);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = att.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setDownloadingAtt(null);
  };

  const handlePreview = async (att: Email['attachments'][0]) => {
    if (!att.storagePath) return;
    const key = att.attachmentId || att.name;
    setLoadingPreview(key);
    const url = await getAttachmentDownloadUrl(att.storagePath);
    if (url) {
      setPreviewUrl(url);
      setPreviewName(att.name);
      setPreviewContentType(att.contentType || '');
      setPreviewStoragePath(att.storagePath);
      setAddedToDocuments(false);
    }
    setLoadingPreview(null);
  };

  const handleAddToDocuments = async () => {
    if (!previewStoragePath || !thread.linkedCaseId) return;
    setAddingToDocuments(true);
    const result = await copyAttachmentToCaseDocuments(
      previewStoragePath,
      thread.linkedCaseId,
      previewName,
      previewContentType || 'application/octet-stream'
    );
    if ('error' in result) {
      console.error('Failed to add to documents:', result.error);
    } else {
      const linkedCase = cases.find(c => c.id === thread.linkedCaseId);
      if (linkedCase && onProcessAttachment) {
        const msg = thread.messages.find(m =>
          m.attachments?.some(a => a.storagePath === previewStoragePath)
        );
        if (msg) {
          const attIdx = msg.attachments!.findIndex(a => a.storagePath === previewStoragePath);
          if (attIdx >= 0) {
            onProcessAttachment(thread.linkedCaseId, msg, attIdx);
          }
        }
      }
      setAddedToDocuments(true);
    }
    setAddingToDocuments(false);
  };

  const latestEmail = thread.messages[0];
  const aiSuggestion = latestEmail?.aiMatch;

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      <div className="px-6 py-3 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
        <div className="flex items-center gap-1">
          <button onClick={() => openCompose('reply')} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors" title="Reply">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          <button onClick={() => openCompose('replyAll')} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors" title="Reply All">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10a8 8 0 018 8v2" opacity="0.4" /></svg>
          </button>
          <button onClick={() => openCompose('forward')} className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors" title="Forward">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </button>
          <div className="w-px h-4 bg-stone-200 mx-0.5" />
          <button className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors" title="Delete">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          {thread.messageCount > 1 && (
            <div className="flex items-center gap-1 ml-1 border-l border-stone-200 pl-2">
              <button
                onClick={expandAll}
                className="text-[10px] font-medium text-stone-500 hover:text-stone-700 px-2 py-1 rounded hover:bg-stone-100 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="text-[10px] font-medium text-stone-500 hover:text-stone-700 px-2 py-1 rounded hover:bg-stone-100 transition-colors"
              >
                Collapse
              </button>
            </div>
          )}
        </div>
        <button
          onClick={onOpenLinkModal}
          disabled={!!thread.linkedCaseId}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center transition-colors ${thread.linkedCaseId ? 'bg-blue-50 text-blue-700 cursor-default border border-blue-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
        >
          {thread.linkedCaseId ? (
            <>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              {getCaseTag(thread.linkedCaseId)}
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Tag to Case
            </>
          )}
        </button>
      </div>

      {aiSuggestion && !thread.linkedCaseId && aiSuggestion.suggestedCaseId && (
        <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-100 rounded-xl flex items-start justify-between animate-fade-in">
          <div>
            <h4 className="text-sm font-bold text-blue-900 flex items-center">
              <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>
              AI Suggested Tag
            </h4>
            <p className="text-xs text-blue-700 mt-1 mb-2 max-w-lg">{aiSuggestion.reasoning}</p>
            <div className="text-xs font-semibold text-blue-800 flex items-center">
              <span className="bg-blue-100 px-2 py-0.5 rounded text-blue-700 mr-2">
                {getCaseTag(aiSuggestion.suggestedCaseId)}
              </span>
              Confidence: {aiSuggestion.confidenceScore}%
            </div>
          </div>
          <button
            onClick={() => performLink(aiSuggestion.suggestedCaseId!, latestEmail)}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
          >
            Apply Tag
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        <div className="px-6 pt-5 pb-3">
          <h1 className="text-lg font-bold text-stone-900 leading-tight">{thread.subject}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-[11px] text-stone-400">
              {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}
            </span>
            {thread.totalAttachments > 0 && (
              <>
                <span className="text-[11px] text-stone-300">|</span>
                <span className="text-[11px] text-stone-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                  {thread.totalAttachments} attachment{thread.totalAttachments !== 1 ? 's' : ''}
                </span>
              </>
            )}
            {thread.category && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${CATEGORY_COLORS[thread.category]}`}>
                {EMAIL_CATEGORY_LABELS[thread.category]}
              </span>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 space-y-3 min-w-0">
          {thread.messages.map((email) => {
            const isExpanded = expandedMessages.has(email.id);
            const fullDate = formatFullDateTime(email.date, email.receivedAt);

            return (
              <div
                key={email.id}
                className={`border rounded-xl transition-all ${isExpanded ? 'border-stone-200 bg-white shadow-sm' : 'border-stone-100 bg-stone-50/80 hover:bg-white hover:border-stone-200'}`}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                  onClick={() => toggleMessage(email.id)}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${email.direction === 'outbound' ? 'bg-blue-100 text-blue-600' : 'bg-stone-200 text-stone-600'}`}>
                    {email.from.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] truncate ${!email.isRead && !isExpanded ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'}`}>
                        {email.from}
                      </span>
                      {email.direction === 'outbound' && (
                        <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Sent</span>
                      )}
                      {!isExpanded && email.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-stone-400">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          <span className="text-[10px]">{email.attachments.length}</span>
                        </span>
                      )}
                    </div>
                    {!isExpanded ? (
                      <p className="text-xs text-stone-400 truncate mt-0.5">{email.body}</p>
                    ) : (
                      <span className="text-[11px] text-stone-400">{fullDate}</span>
                    )}
                  </div>
                  {!isExpanded && (
                    <span className="text-[11px] text-stone-400 whitespace-nowrap flex-shrink-0 tabular-nums">{email.date}</span>
                  )}
                  <svg className={`w-4 h-4 text-stone-300 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-stone-100 min-w-0 overflow-hidden">
                    <div className="py-3 space-y-1.5">
                      <div className="flex items-start min-w-0">
                        <span className="text-[11px] text-stone-400 w-12 flex-shrink-0 pt-px">From</span>
                        <span className="text-[11px] text-stone-700 font-medium break-all min-w-0">
                          {email.from} &lt;{email.fromEmail}&gt;
                        </span>
                      </div>
                      {email.toRecipients && (
                        <div className="flex items-start min-w-0">
                          <span className="text-[11px] text-stone-400 w-12 flex-shrink-0 pt-px">To</span>
                          <span className="text-[11px] text-stone-600 break-words min-w-0">{email.toRecipients}</span>
                        </div>
                      )}
                      <div className="flex items-start">
                        <span className="text-[11px] text-stone-400 w-12 flex-shrink-0 pt-px">Date</span>
                        <span className="text-[11px] text-stone-600 tabular-nums">{fullDate}</span>
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4 overflow-hidden">
                      <EmailBodyRenderer email={email} />
                    </div>

                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center gap-2">
                      <button
                        onClick={() => openCompose('reply', email)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                        Reply
                      </button>
                      <button
                        onClick={() => openCompose('replyAll', email)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10a8 8 0 018 8v2" opacity="0.4" /></svg>
                        Reply All
                      </button>
                      <button
                        onClick={() => openCompose('forward', email)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 hover:border-stone-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        Forward
                      </button>
                    </div>

                    {email.attachments.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-stone-100">
                        <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2.5 flex items-center">
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          {email.attachments.length} Attachment{email.attachments.length !== 1 ? 's' : ''}
                        </h5>
                        <div className="grid gap-2">
                          {email.attachments.map((att, i) => {
                            const attKey = `${email.id}-${i}`;
                            const isProcessed = processedAttachments.has(attKey);
                            const isProcessing = processingAttachment === attKey;
                            const canProcess = thread.linkedCaseId && onProcessAttachment && !isProcessed;
                            const isDownloading = downloadingAtt === (att.attachmentId || att.name);
                            const isLoadingPreview = loadingPreview === (att.attachmentId || att.name);
                            const canPreview = !!att.storagePath;

                            return (
                              <div
                                key={i}
                                className={`flex items-center justify-between p-2.5 border border-stone-200 rounded-lg bg-stone-50/80 transition-colors group ${canPreview ? 'hover:bg-blue-50/50 hover:border-blue-200 cursor-pointer' : 'hover:bg-stone-50'}`}
                                onClick={() => canPreview && handlePreview(att)}
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 flex-shrink-0 ${att.type === 'pdf' ? 'bg-red-100 text-red-600' : att.type === 'image' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {isLoadingPreview ? (
                                      <div className="w-4 h-4 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
                                    ) : att.type === 'pdf' ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    ) : att.type === 'image' ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className={`text-xs font-medium truncate ${canPreview ? 'text-blue-700 group-hover:text-blue-800' : 'text-stone-800'}`}>
                                      {att.name}
                                    </p>
                                    <p className="text-[10px] text-stone-500">{att.size}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {att.storagePath && (
                                    <>
                                      <button
                                        onClick={() => handlePreview(att)}
                                        disabled={isLoadingPreview}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-50"
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        View
                                      </button>
                                      <button
                                        onClick={() => handleDownload(att)}
                                        disabled={isDownloading}
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-600 bg-white border border-stone-200 px-2 py-1 rounded-md hover:bg-stone-50 hover:border-stone-300 transition-colors disabled:opacity-50"
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
                                  ) : canProcess ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setProcessingAttachment(attKey);
                                        onProcessAttachment!(thread.linkedCaseId!, email, i);
                                        setTimeout(() => {
                                          setProcessedAttachments(prev => new Set(prev).add(attKey));
                                          setProcessingAttachment(null);
                                        }, 800);
                                      }}
                                      disabled={isProcessing}
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                    >
                                      {isProcessing ? (
                                        <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                                      ) : (
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                      )}
                                      To Case
                                    </button>
                                  ) : !thread.linkedCaseId ? (
                                    <span className="text-[10px] text-stone-400 italic">Tag first</span>
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {composeMode && firmId && (
        <ComposeEmail
          mode={composeMode}
          originalEmail={composeTargetEmail || undefined}
          firmId={firmId}
          senderEmail={senderEmail}
          onClose={closeCompose}
          onSent={() => {
            closeCompose();
            onEmailSent?.();
          }}
        />
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => { setPreviewUrl(null); setPreviewName(''); setPreviewContentType(''); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  previewContentType.includes('pdf') ? 'bg-red-100 text-red-600' :
                  previewContentType.includes('image') ? 'bg-blue-100 text-blue-600' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {previewContentType.includes('pdf') ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  ) : previewContentType.includes('image') ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-stone-800 truncate">{previewName}</h3>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={previewUrl}
                  download={previewName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Download
                </a>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 bg-white border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  Open
                </a>
                {thread.linkedCaseId && previewStoragePath && (
                  <button
                    onClick={handleAddToDocuments}
                    disabled={addingToDocuments || addedToDocuments}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      addedToDocuments
                        ? 'text-green-700 bg-green-50 border border-green-200'
                        : 'text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                    } disabled:opacity-60`}
                  >
                    {addingToDocuments ? (
                      <div className="w-3.5 h-3.5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                    ) : addedToDocuments ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                    {addedToDocuments ? 'Added' : 'Add to Documents'}
                  </button>
                )}
                <button
                  onClick={() => { setPreviewUrl(null); setPreviewName(''); setPreviewContentType(''); setPreviewStoragePath(''); }}
                  className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-stone-100">
              {previewContentType.includes('image') ? (
                <div className="w-full h-full flex items-center justify-center p-6">
                  <img
                    src={previewUrl}
                    alt={previewName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewContentType.includes('pdf') ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-none"
                  title={previewName}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 p-8">
                  <svg className="w-16 h-16 text-stone-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  <p className="text-sm font-medium mb-2">Preview not available for this file type</p>
                  <p className="text-xs text-stone-400 mb-4">{previewContentType || 'Unknown type'}</p>
                  <a
                    href={previewUrl}
                    download={previewName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
