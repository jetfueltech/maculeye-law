import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Email } from '../../types';
import { getAttachmentDownloadUrl } from '../../services/outlookService';

interface EmailThreadViewProps {
  messages: Email[];
  /** When true, shows the subject line at the top (used inside expanded communication card). */
  showSubject?: boolean;
  /** Compact layout for dense lists. */
  compact?: boolean;
}

/**
 * Renders a grouped email thread: oldest-first by receivedAt, each message
 * expandable with the full HTML body (via sandboxed iframe), plus attachments
 * that can be previewed/downloaded. Pulled out of ThreadDetail so the same
 * presentation can be reused on the Case view.
 */
export const EmailThreadView: React.FC<EmailThreadViewProps> = ({ messages, showSubject, compact }) => {
  // Sort oldest → newest for case-view context (Inbox's main view sorts newest → oldest,
  // but when reading a thread inline, chronological top-to-bottom is clearer).
  const sorted = [...messages].sort((a, b) => {
    const aT = new Date(a.receivedAt || a.date).getTime() || 0;
    const bT = new Date(b.receivedAt || b.date).getTime() || 0;
    return aT - bT;
  });

  const latest = sorted[sorted.length - 1];
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([latest?.id].filter(Boolean) as string[]));

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const subject = latest?.subject || sorted[0]?.subject || 'Email Thread';

  return (
    <div className="space-y-3">
      {showSubject && (
        <div>
          <h4 className="text-sm font-bold text-stone-900 leading-tight">{subject}</h4>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {sorted.length} message{sorted.length !== 1 ? 's' : ''}
            {sorted.some(m => m.attachments?.length) && (
              <> · {sorted.reduce((n, m) => n + (m.attachments?.length || 0), 0)} attachment(s)</>
            )}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map(email => (
          <MessageCard
            key={email.id}
            email={email}
            expanded={expanded.has(email.id)}
            onToggle={() => toggle(email.id)}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Internal: single message card with collapsible body + attachment actions.
// ────────────────────────────────────────────────────────────────────────────

interface MessageCardProps {
  email: Email;
  expanded: boolean;
  onToggle: () => void;
  compact?: boolean;
}

const MessageCard: React.FC<MessageCardProps> = ({ email, expanded, onToggle, compact }) => {
  const when = formatFullDateTime(email.date, email.receivedAt);
  const shortWhen = formatShortTimestamp(email.date, email.receivedAt);

  return (
    <div className={`border rounded-xl transition-all ${expanded ? 'border-stone-200 bg-white shadow-sm' : 'border-stone-100 bg-stone-50/70 hover:bg-white hover:border-stone-200'}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${email.direction === 'outbound' ? 'bg-blue-100 text-blue-600' : 'bg-stone-200 text-stone-600'}`}>
          {(email.from || '??').substring(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-stone-700 truncate">{email.from}</span>
            {email.direction === 'outbound' && (
              <span className="text-[10px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">Sent</span>
            )}
            {email.attachments?.length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-stone-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span className="text-[10px]">{email.attachments.length}</span>
              </span>
            )}
          </div>
          {!expanded && !compact && (
            <p className="text-xs text-stone-400 truncate mt-0.5">{email.body}</p>
          )}
        </div>
        <span className="text-[11px] text-stone-400 whitespace-nowrap flex-shrink-0 tabular-nums">{expanded ? when : shortWhen}</span>
        <svg className={`w-3.5 h-3.5 text-stone-300 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-stone-100">
          <div className="py-2 space-y-1 text-[11px]">
            <div className="flex"><span className="w-12 flex-shrink-0 text-stone-400">From</span><span className="text-stone-700 break-all">{email.from}{email.fromEmail ? ` <${email.fromEmail}>` : ''}</span></div>
            {email.toRecipients && (
              <div className="flex"><span className="w-12 flex-shrink-0 text-stone-400">To</span><span className="text-stone-600 break-words">{email.toRecipients}</span></div>
            )}
            <div className="flex"><span className="w-12 flex-shrink-0 text-stone-400">Date</span><span className="text-stone-600 tabular-nums">{when}</span></div>
          </div>
          <div className="border-t border-stone-100 pt-3">
            <EmailBodyRenderer email={email} />
          </div>
          {email.attachments?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-stone-100">
              <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">
                {email.attachments.length} Attachment{email.attachments.length !== 1 ? 's' : ''}
              </h5>
              <div className="grid gap-1.5">
                {email.attachments.map((att, i) => (
                  <AttachmentRow key={i} att={att} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Email body renderer — same approach as ThreadDetail: sandboxed iframe for
// HTML, plain <div> for text-only messages.
// ────────────────────────────────────────────────────────────────────────────

const EmailBodyRenderer: React.FC<{ email: Email }> = ({ email }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(200);
  const hasHtml = !!email.bodyHtml && email.bodyHtml.trim().length > 0 && email.bodyHtml !== email.body;

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
        <!DOCTYPE html><html><head><meta charset="utf-8"><style>
          html,body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#1c1917;word-wrap:break-word;overflow-wrap:break-word;max-width:100%;overflow-x:hidden}
          body{padding:12px;box-sizing:border-box}
          *{max-width:100%;box-sizing:border-box}
          img{max-width:100%;height:auto}
          a{color:#2563eb;word-break:break-all}
          blockquote{border-left:3px solid #d6d3d1;margin:8px 0;padding:4px 12px;color:#57534e}
        </style></head><body>${email.bodyHtml}</body></html>`;
      doc.open();
      doc.write(wrappedHtml);
      doc.close();
      setTimeout(adjustHeight, 100);
      setTimeout(adjustHeight, 500);
    };
    if (iframe.contentDocument?.readyState === 'complete') writeContent();
    else iframe.addEventListener('load', writeContent, { once: true });
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
  return <div className="text-[13px] text-stone-700 leading-relaxed whitespace-pre-wrap font-sans">{email.body}</div>;
};

// ────────────────────────────────────────────────────────────────────────────
// Attachment row — preview/download.
// ────────────────────────────────────────────────────────────────────────────

const AttachmentRow: React.FC<{ att: Email['attachments'][0] }> = ({ att }) => {
  const [busy, setBusy] = useState<'preview' | 'download' | null>(null);
  const open = async (mode: 'preview' | 'download') => {
    if (!att.storagePath) return;
    setBusy(mode);
    const url = await getAttachmentDownloadUrl(att.storagePath);
    setBusy(null);
    if (!url) return;
    if (mode === 'download') {
      const a = document.createElement('a');
      a.href = url;
      a.download = att.name;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };
  return (
    <div className="flex items-center justify-between p-2 border border-stone-200 rounded-lg bg-stone-50/70 hover:bg-white transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
          att.type === 'pdf' ? 'bg-red-100 text-red-600' :
          att.type === 'image' ? 'bg-blue-100 text-blue-600' :
          'bg-amber-100 text-amber-600'
        }`}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-stone-800 truncate">{att.name}</p>
          <p className="text-[10px] text-stone-500">{att.size}</p>
        </div>
      </div>
      {att.storagePath && (
        <div className="flex items-center gap-1 ml-2">
          <button onClick={() => open('preview')} disabled={busy !== null} className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded hover:bg-blue-100 disabled:opacity-50">
            {busy === 'preview' ? '…' : 'View'}
          </button>
          <button onClick={() => open('download')} disabled={busy !== null} className="text-[10px] font-semibold text-stone-600 bg-white border border-stone-200 px-2 py-0.5 rounded hover:bg-stone-50 disabled:opacity-50">
            {busy === 'download' ? '…' : 'Download'}
          </button>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Date helpers — fall back gracefully for the "Just Now" / "10:45 AM" mock strings.
// ────────────────────────────────────────────────────────────────────────────

function formatFullDateTime(dateStr: string, receivedAt?: string): string {
  const src = receivedAt || dateStr;
  const d = new Date(src);
  if (isNaN(d.getTime())) return dateStr || '';
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatShortTimestamp(dateStr: string, receivedAt?: string): string {
  const src = receivedAt || dateStr;
  const d = new Date(src);
  if (isNaN(d.getTime())) return dateStr || '';
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}
