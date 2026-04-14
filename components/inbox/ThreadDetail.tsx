import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Email, EmailThread, CaseFile, EmailCategory } from '../../types';
import { EMAIL_CATEGORY_LABELS } from '../../types';
import { getAttachmentDownloadUrl } from '../../services/outlookService';

interface ThreadDetailProps {
  thread: EmailThread;
  cases: CaseFile[];
  onOpenLinkModal: () => void;
  onProcessAttachment?: (caseId: string, email: Email, attachmentIndex: number) => void;
  getCaseTag: (caseId: string) => string;
  performLink: (caseId: string, email: Email) => void;
  CATEGORY_COLORS: Record<EmailCategory, string>;
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
    if (h > 0) setIframeHeight(Math.min(h + 32, 800));
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
            body {
              margin: 0;
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #1c1917;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            img { max-width: 100%; height: auto; }
            a { color: #2563eb; }
            table { max-width: 100%; }
            pre, code { white-space: pre-wrap; word-wrap: break-word; }
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
}) => {
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set([thread.messages[0]?.id])
  );
  const [processedAttachments, setProcessedAttachments] = useState<Set<string>>(new Set());
  const [processingAttachment, setProcessingAttachment] = useState<string | null>(null);
  const [downloadingAtt, setDownloadingAtt] = useState<string | null>(null);

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

  const latestEmail = thread.messages[0];
  const aiSuggestion = latestEmail?.aiMatch;

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-stone-100 rounded text-stone-500" title="Reply">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
          </button>
          <button className="p-2 hover:bg-stone-100 rounded text-stone-500" title="Delete">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          {thread.messageCount > 1 && (
            <div className="flex items-center gap-1 ml-2 border-l border-stone-200 pl-3">
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
          className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors ${thread.linkedCaseId ? 'bg-blue-50 text-blue-700 cursor-default border border-blue-100' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'}`}
        >
          {thread.linkedCaseId ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              {getCaseTag(thread.linkedCaseId)}
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
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

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-stone-900">{thread.subject}</h1>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-stone-500">
              {thread.messageCount} message{thread.messageCount !== 1 ? 's' : ''}
            </span>
            {thread.totalAttachments > 0 && (
              <>
                <span className="text-xs text-stone-400">|</span>
                <span className="text-xs text-stone-500 flex items-center gap-1">
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

        <div className="space-y-2">
          {thread.messages.map((email, idx) => {
            const isExpanded = expandedMessages.has(email.id);

            return (
              <div
                key={email.id}
                className={`border rounded-xl transition-all ${isExpanded ? 'border-stone-200 bg-white shadow-sm' : 'border-stone-100 bg-stone-50 hover:bg-white hover:border-stone-200'}`}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                  onClick={() => toggleMessage(email.id)}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${email.direction === 'outbound' ? 'bg-blue-100 text-blue-600' : 'bg-stone-200 text-stone-600'}`}>
                    {email.from.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold truncate ${!email.isRead && !isExpanded ? 'text-stone-900' : 'text-stone-700'}`}>
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
                    {!isExpanded && (
                      <p className="text-xs text-stone-500 truncate mt-0.5">{email.body}</p>
                    )}
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap flex-shrink-0">{email.date}</span>
                  <svg className={`w-4 h-4 text-stone-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-stone-100">
                    <div className="py-3 mb-1 space-y-1">
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] text-stone-400 w-10 flex-shrink-0 pt-0.5">From</span>
                        <span className="text-[11px] text-stone-700 font-medium">
                          {email.from} &lt;{email.fromEmail}&gt;
                        </span>
                      </div>
                      {email.toRecipients && (
                        <div className="flex items-start gap-2">
                          <span className="text-[11px] text-stone-400 w-10 flex-shrink-0 pt-0.5">To</span>
                          <span className="text-[11px] text-stone-700">{email.toRecipients}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <span className="text-[11px] text-stone-400 w-10 flex-shrink-0 pt-0.5">Date</span>
                        <span className="text-[11px] text-stone-700">{email.date}</span>
                      </div>
                    </div>

                    <div className="border-t border-stone-100 pt-3">
                      <EmailBodyRenderer email={email} />
                    </div>

                    {email.attachments.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-stone-100">
                        <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center">
                          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          {email.attachments.length} Attachment{email.attachments.length !== 1 ? 's' : ''}
                        </h5>
                        <div className="space-y-2">
                          {email.attachments.map((att, i) => {
                            const attKey = `${email.id}-${i}`;
                            const isProcessed = processedAttachments.has(attKey);
                            const isProcessing = processingAttachment === attKey;
                            const canProcess = thread.linkedCaseId && onProcessAttachment && !isProcessed;
                            const isDownloading = downloadingAtt === (att.attachmentId || att.name);

                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between p-2.5 border border-stone-200 rounded-lg bg-stone-50 group"
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-2.5 flex-shrink-0 ${att.type === 'pdf' ? 'bg-red-100 text-red-600' : att.type === 'image' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                    {att.type === 'pdf' ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    ) : att.type === 'image' ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-stone-800 truncate">{att.name}</p>
                                    <p className="text-[10px] text-stone-500">{att.size}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                                  {att.storagePath && (
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
                                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
                                    >
                                      {isProcessing ? (
                                        <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
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
    </div>
  );
};
