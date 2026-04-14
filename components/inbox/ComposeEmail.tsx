import React, { useState, useRef, useEffect } from 'react';
import type { Email } from '../../types';
import { sendOutlookEmail } from '../../services/outlookService';

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

interface ComposeEmailProps {
  mode: ComposeMode;
  originalEmail?: Email;
  firmId: string;
  onClose: () => void;
  onSent: () => void;
  senderEmail?: string;
}

function buildQuotedHtml(email: Email): string {
  const date = email.receivedAt
    ? new Date(email.receivedAt).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : email.date;

  const header = `<br/><br/><div style="border-left:3px solid #d6d3d1;padding-left:12px;margin-top:16px;color:#57534e;">
    <p style="margin:0 0 8px 0;font-size:13px;"><strong>From:</strong> ${email.from} &lt;${email.fromEmail}&gt;<br/>
    <strong>Date:</strong> ${date}<br/>
    <strong>Subject:</strong> ${email.subject}${email.toRecipients ? `<br/><strong>To:</strong> ${email.toRecipients}` : ''}</p>`;

  const body = email.bodyHtml && email.bodyHtml.trim().length > 0 && email.bodyHtml !== email.body
    ? email.bodyHtml
    : `<p>${email.body.replace(/\n/g, '<br/>')}</p>`;

  return `${header}${body}</div>`;
}

function getDefaultTo(mode: ComposeMode, email?: Email, senderEmail?: string): string {
  if (!email) return '';
  if (mode === 'forward') return '';
  if (mode === 'reply') return email.fromEmail;
  if (mode === 'replyAll') {
    const addresses = new Set<string>();
    addresses.add(email.fromEmail);
    if (email.toRecipients) {
      email.toRecipients.split(',').forEach((addr) => {
        const trimmed = addr.trim();
        if (trimmed && trimmed.toLowerCase() !== senderEmail?.toLowerCase()) {
          addresses.add(trimmed);
        }
      });
    }
    return Array.from(addresses).join(', ');
  }
  return '';
}

function getDefaultSubject(mode: ComposeMode, email?: Email): string {
  if (!email) return '';
  const subj = email.subject;
  if (mode === 'forward') {
    return subj.startsWith('Fwd:') || subj.startsWith('FW:') ? subj : `Fwd: ${subj}`;
  }
  return subj.startsWith('Re:') ? subj : `Re: ${subj}`;
}

export const ComposeEmail: React.FC<ComposeEmailProps> = ({
  mode,
  originalEmail,
  firmId,
  onClose,
  onSent,
  senderEmail,
}) => {
  const [to, setTo] = useState(() => getDefaultTo(mode, originalEmail, senderEmail));
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(() => getDefaultSubject(mode, originalEmail));
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const toInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'forward' || mode === 'new') {
      toInputRef.current?.focus();
    } else {
      editorRef.current?.focus();
    }
  }, [mode]);

  const handleSend = async () => {
    const toAddresses = to.split(',').map((a) => a.trim()).filter(Boolean);
    if (toAddresses.length === 0) {
      setError('At least one recipient is required');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }

    setError('');
    setSending(true);

    const editorContent = editorRef.current?.innerHTML || '';
    const quotedHtml =
      originalEmail && mode !== 'new' ? buildQuotedHtml(originalEmail) : '';
    const fullHtml = editorContent + quotedHtml;

    const ccAddresses = cc
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const isReply = mode === 'reply' || mode === 'replyAll';

    const result = await sendOutlookEmail({
      to: toAddresses,
      cc: ccAddresses.length > 0 ? ccAddresses : undefined,
      subject,
      bodyHtml: fullHtml,
      replyToMessageId: isReply && originalEmail ? originalEmail.id : undefined,
      firmId,
    });

    setSending(false);

    if (result.success) {
      onSent();
    } else {
      setError(result.error || 'Failed to send email');
    }
  };

  const modeLabel =
    mode === 'new'
      ? 'New Email'
      : mode === 'reply'
        ? 'Reply'
        : mode === 'replyAll'
          ? 'Reply All'
          : 'Forward';

  return (
    <div className="flex flex-col bg-white border-t border-stone-200 animate-fade-in">
      <div className="flex items-center justify-between px-5 py-2.5 bg-stone-50 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            {mode === 'forward' ? (
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            ) : mode === 'new' ? (
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
            )}
          </div>
          <span className="text-xs font-bold text-stone-700">{modeLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          >
            {sending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                Send
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
          {error}
        </div>
      )}

      <div className="px-5 py-2 space-y-1.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <label className="text-[11px] text-stone-400 w-10 flex-shrink-0 font-medium">To</label>
          <input
            ref={toInputRef}
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 text-[13px] text-stone-800 bg-transparent outline-none placeholder:text-stone-300"
          />
          {!showCc && (
            <button
              onClick={() => setShowCc(true)}
              className="text-[10px] font-semibold text-stone-400 hover:text-stone-600 px-1.5 py-0.5 rounded hover:bg-stone-100 transition-colors"
            >
              Cc
            </button>
          )}
        </div>
        {showCc && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-stone-400 w-10 flex-shrink-0 font-medium">Cc</label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@example.com"
              className="flex-1 text-[13px] text-stone-800 bg-transparent outline-none placeholder:text-stone-300"
            />
          </div>
        )}
        {mode === 'new' && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-stone-400 w-10 flex-shrink-0 font-medium">Subj</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="flex-1 text-[13px] text-stone-800 bg-transparent outline-none placeholder:text-stone-300"
            />
          </div>
        )}
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="px-5 py-3 min-h-[120px] max-h-[280px] overflow-y-auto text-sm text-stone-800 leading-relaxed outline-none placeholder-stone-300"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
        data-placeholder="Write your message..."
        onInput={() => {
          if (editorRef.current) {
            setBodyHtml(editorRef.current.innerHTML);
          }
        }}
      />

      {originalEmail && mode !== 'new' && (
        <div className="px-5 pb-3 border-t border-stone-50">
          <details className="text-[11px] text-stone-400">
            <summary className="cursor-pointer hover:text-stone-600 py-1.5 select-none">
              {mode === 'forward' ? 'Forwarded message' : 'Original message'}
            </summary>
            <div className="mt-1 pl-3 border-l-2 border-stone-200 text-stone-500 text-[11px] leading-relaxed max-h-32 overflow-y-auto">
              <p className="font-medium">{originalEmail.from} &lt;{originalEmail.fromEmail}&gt;</p>
              <p>{originalEmail.subject}</p>
              <p className="mt-1 text-stone-400">{originalEmail.body.substring(0, 300)}{originalEmail.body.length > 300 ? '...' : ''}</p>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};
