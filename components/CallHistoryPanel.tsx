import React, { useState } from 'react';
import { CommunicationLog, Email } from '../types';
import { EmailThreadView } from './inbox/EmailThreadView';

interface CallHistoryPanelProps {
  communications: CommunicationLog[];
  /** Linked emails (synced from Outlook + tagged to the case). Shown under the Messages filter. */
  linkedEmails?: Email[];
  onCall?: (contactName: string, contactPhone: string) => void;
}

interface EmailThreadGroup {
  id: string;
  subject: string;
  participants: string[];
  messages: Email[];
  timestamp: string;
  hasAttachments: boolean;
}

function emailTs(e: Email): number {
  const rt = e.receivedAt ? new Date(e.receivedAt).getTime() : NaN;
  if (!isNaN(rt)) return rt;
  const dt = new Date(e.date).getTime();
  return isNaN(dt) ? 0 : dt;
}

/** Group linked emails by threadId (or subject fallback), newest-first. */
function groupThreads(emails: Email[]): EmailThreadGroup[] {
  const buckets = new Map<string, Email[]>();
  for (const e of emails) {
    const key = e.threadId || e.subject || e.id;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(e);
  }
  const threads: EmailThreadGroup[] = [];
  for (const [id, msgs] of buckets.entries()) {
    const sorted = [...msgs].sort((a, b) => emailTs(a) - emailTs(b));
    const latest = sorted[sorted.length - 1];
    const participants = Array.from(new Set(sorted.map(m => m.from).filter(Boolean)));
    threads.push({
      id,
      subject: latest?.subject || '(no subject)',
      participants,
      messages: sorted,
      timestamp: new Date(emailTs(latest) || Date.now()).toISOString(),
      hasAttachments: sorted.some(m => (m.attachments?.length || 0) > 0),
    });
  }
  return threads.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-green-50', text: 'text-green-700', label: 'Completed' },
  missed: { bg: 'bg-red-50', text: 'text-red-700', label: 'Missed' },
  voicemail: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Voicemail' },
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Sent' },
  received: { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Received' },
};

export const CallHistoryPanel: React.FC<CallHistoryPanelProps> = ({ communications, linkedEmails, onCall }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'call' | 'sms'>('all');

  const emailThreads: EmailThreadGroup[] = linkedEmails && linkedEmails.length > 0 ? groupThreads(linkedEmails) : [];

  // "Messages" shows SMS + email threads. Calls filter hides emails entirely.
  const filtered = communications.filter(c => filter === 'all' || c.type === filter);
  const showEmails = filter === 'all' || filter === 'sms';

  const grouped: { label: string; items: CommunicationLog[] }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayItems: CommunicationLog[] = [];
  const yesterdayItems: CommunicationLog[] = [];
  const olderMap = new Map<string, CommunicationLog[]>();

  filtered.forEach(c => {
    const d = new Date(c.timestamp);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) {
      todayItems.push(c);
    } else if (d.getTime() === yesterday.getTime()) {
      yesterdayItems.push(c);
    } else {
      const key = d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
      if (!olderMap.has(key)) olderMap.set(key, []);
      olderMap.get(key)!.push(c);
    }
  });

  if (todayItems.length) grouped.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length) grouped.push({ label: 'Yesterday', items: yesterdayItems });
  olderMap.forEach((items, label) => grouped.push({ label, items }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 px-6 py-4 border-b border-stone-100">
        {(['all', 'call', 'sms'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f
                ? 'bg-stone-800 text-white'
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            {f === 'all' ? 'All' : f === 'call' ? 'Calls' : 'Messages'}
          </button>
        ))}
        <span className="ml-auto text-xs text-stone-400">
          {filtered.length + (showEmails ? emailThreads.length : 0)} entries
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Email threads — shown under All and Messages */}
        {showEmails && emailThreads.length > 0 && (
          <div>
            <div className="sticky top-0 bg-stone-50/90 backdrop-blur-sm px-6 py-2 border-b border-stone-100 z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Email Threads · {emailThreads.length}
              </span>
            </div>
            {emailThreads.map(thread => {
              const key = `email-${thread.id}`;
              const isExpanded = expandedId === key;
              const dateStr = new Date(thread.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
              return (
                <div key={key} className="border-b border-stone-50 last:border-b-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : key)}
                    className="w-full px-6 py-3.5 flex items-center gap-3 text-left hover:bg-stone-50/50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-500 relative">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      {thread.messages.length > 1 && (
                        <span className="absolute -top-1 -right-1 bg-black text-white text-[9px] font-bold px-1 rounded-full border-2 border-white">
                          {thread.messages.length}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-800 truncate">{thread.subject}</span>
                        {thread.hasAttachments && (
                          <svg className="w-3 h-3 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 truncate mt-0.5">
                        {thread.participants.slice(0, 2).join(', ')}
                        {thread.participants.length > 2 ? ` +${thread.participants.length - 2}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-stone-400">{dateStr}</span>
                      <svg className={`w-3.5 h-3.5 text-stone-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-6 pb-4 pl-[4.5rem] animate-fade-in">
                      <EmailThreadView messages={thread.messages} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {grouped.length === 0 && (showEmails ? emailThreads.length === 0 : true) ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            <p className="text-sm text-stone-400 font-medium">No call history yet</p>
            <p className="text-xs text-stone-300 mt-1">Calls and messages will appear here</p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              <div className="sticky top-0 bg-stone-50/90 backdrop-blur-sm px-6 py-2 border-b border-stone-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">{group.label}</span>
              </div>
              {group.items.map(comm => {
                const isExpanded = expandedId === comm.id;
                const statusStyle = STATUS_STYLES[comm.status || 'completed'];
                const isCall = comm.type === 'call';
                const isInbound = comm.direction === 'inbound';

                return (
                  <div key={comm.id} className="border-b border-stone-50 last:border-b-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : comm.id)}
                      className="w-full px-6 py-3.5 flex items-center gap-3 text-left hover:bg-stone-50/50 transition-colors"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCall
                          ? isInbound ? 'bg-emerald-50 text-emerald-500' : 'bg-blue-50 text-blue-500'
                          : 'bg-teal-50 text-teal-500'
                      }`}>
                        {isCall ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-stone-800 truncate">{comm.contactName}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusStyle.bg} ${statusStyle.text}`}>
                            {statusStyle.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-stone-400">
                            {isCall ? (isInbound ? 'Inbound' : 'Outbound') : (comm.direction === 'outbound' ? 'Sent' : 'Received')}
                          </span>
                          {comm.duration && (
                            <>
                              <span className="text-stone-300">-</span>
                              <span className="text-xs text-stone-400 font-mono">{comm.duration}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-stone-400">{formatTimestamp(comm.timestamp)}</span>
                        <svg className={`w-3.5 h-3.5 text-stone-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-4 animate-fade-in">
                        <div className="ml-12 bg-stone-50 rounded-xl p-4 space-y-3">
                          <div className="flex items-center gap-4 text-xs text-stone-500">
                            <span>{comm.contactPhone}</span>
                            {comm.duration && <span>Duration: {comm.duration}</span>}
                            <span>{new Date(comm.timestamp).toLocaleString()}</span>
                          </div>
                          {comm.content && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Notes</span>
                              <p className="text-sm text-stone-700 mt-1 whitespace-pre-wrap">{comm.content}</p>
                            </div>
                          )}
                          {comm.aiSummary && (
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">AI Summary</span>
                              <p className="text-sm text-stone-600 mt-1">{comm.aiSummary}</p>
                            </div>
                          )}
                          {onCall && isCall && (
                            <button
                              onClick={() => onCall(comm.contactName, comm.contactPhone)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                              Call again
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
