import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Email, CaseFile, EmailCategory, EMAIL_CATEGORY_LABELS, EmailThread } from '../types';
import { matchEmailToCase } from '../services/geminiService';
import { getSyncedEmails, syncOutlookEmails, updateSyncedEmail, getOutlookConnection, groupEmailsIntoThreads } from '../services/outlookService';
import { ThreadDetail } from './inbox/ThreadDetail';

interface InboxProps {
  cases: CaseFile[];
  emails: Email[];
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  onLinkCase: (caseId: string, email: Email) => void;
  onProcessAttachment?: (caseId: string, email: Email, attachmentIndex: number) => void;
  firmId?: string;
}

export const Inbox: React.FC<InboxProps> = ({ cases, emails, setEmails, onLinkCase, onProcessAttachment, firmId }) => {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSorting, setIsSorting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const [outlookConnected, setOutlookConnected] = useState(false);
  const [isSyncingOutlook, setIsSyncingOutlook] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const hasLoadedSynced = useRef(false);
  const autoSyncInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSync = async (silent = false) => {
    if (!firmId) return;
    if (!silent) setIsSyncingOutlook(true);
    setSyncMessage(silent ? '' : 'Syncing...');
    const result = await syncOutlookEmails(firmId);
    if (result.error) {
      if (!silent) setSyncMessage(result.error);
    } else {
      const synced = await getSyncedEmails(firmId);
      if (synced.length > 0) {
        setEmails(prev => {
          const mockEmails = prev.filter(e => e.id.startsWith('e'));
          return [...synced, ...mockEmails];
        });
      }
      if (!silent) {
        setSyncMessage(result.synced > 0 ? `Synced ${result.synced} emails` : 'Up to date');
        setTimeout(() => setSyncMessage(''), 4000);
      }
    }
    if (!silent) setIsSyncingOutlook(false);
  };

  useEffect(() => {
    if (!firmId || hasLoadedSynced.current) return;
    hasLoadedSynced.current = true;

    (async () => {
      const conn = await getOutlookConnection(firmId);
      setOutlookConnected(!!conn);

      const synced = await getSyncedEmails(firmId);
      if (synced.length > 0) {
        setEmails(prev => {
          const existingIds = new Set(prev.map(e => e.id));
          const newEmails = synced.filter(e => !existingIds.has(e.id));
          return [...newEmails, ...prev];
        });
      } else if (conn) {
        await runSync();
      }
    })();
  }, [firmId]);

  useEffect(() => {
    if (!outlookConnected || !firmId) return;
    autoSyncInterval.current = setInterval(() => runSync(true), 5 * 60 * 1000);
    return () => {
      if (autoSyncInterval.current) clearInterval(autoSyncInterval.current);
    };
  }, [outlookConnected, firmId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'outlook_connected') {
        setOutlookConnected(true);
        runSync();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [firmId]);

  const hasSimulatedRef = useRef(false);

  useEffect(() => {
    if (emails.some(e => e.id === 'e_live_incoming')) return;
    if (hasSimulatedRef.current) return;

    hasSimulatedRef.current = true;

    const incomingEmail: Email = {
      id: 'e_live_incoming',
      from: 'Allstate Claims Div',
      fromEmail: 'claims@allstate.com',
      subject: 'Coverage Position - James Rodriguez',
      body: 'Please see attached coverage position letter regarding the incident on 12/10/2023. After review of the policy limits and liability investigation, we are accepting 100% liability.',
      date: 'Just Now',
      isRead: false,
      direction: 'inbound',
      attachments: [{ name: 'Coverage_Ltr_Rodriguez.pdf', type: 'pdf', size: '0.5 MB' }]
    };

    const arrivalTimer = setTimeout(() => {
      setEmails(prev => [incomingEmail, ...prev]);

      setTimeout(async () => {
        try {
          const match = await matchEmailToCase(incomingEmail, cases);
          if (match.suggestedCaseId && match.confidenceScore > 85) {
            setEmails(prev => prev.map(e =>
              e.id === incomingEmail.id
                ? { ...e, aiMatch: match, linkedCaseId: match.suggestedCaseId }
                : e
            ));
          }
        } catch (e) {
          console.error("Auto-process failed", e);
        }
      }, 2000);
    }, 1000);

    return () => clearTimeout(arrivalTimer);
  }, []);

  const getCaseTag = (caseId: string) => {
    const c = cases.find(x => x.id === caseId);
    if (!c) return caseId;
    const clientLast = c.clientName.split(' ').pop();
    const def = c.parties?.find(p => p.role === 'Defendant');
    const defName = def ? def.name : 'Unknown Defendant';
    const shortDef = defName.length > 20 ? defName.substring(0, 18) + '...' : defName;
    return `${clientLast} v. ${shortDef}`;
  };

  const performLink = (caseId: string, email: Email) => {
    onLinkCase(caseId, email);
    setIsLinkModalOpen(false);
  };

  const runAIAutoSort = async () => {
    setIsSorting(true);
    const unlinkedEmails = emails.filter(e => !e.linkedCaseId);
    let updatedEmails = [...emails];
    let hasUpdates = false;

    for (const email of unlinkedEmails) {
      try {
        const match = await matchEmailToCase(email, cases);
        const emailIndex = updatedEmails.findIndex(e => e.id === email.id);
        if (emailIndex !== -1) {
          updatedEmails[emailIndex] = { ...updatedEmails[emailIndex], aiMatch: match };
          hasUpdates = true;
          if (match.suggestedCaseId && match.confidenceScore >= 90) {
            updatedEmails[emailIndex].linkedCaseId = match.suggestedCaseId;
            onLinkCase(match.suggestedCaseId, updatedEmails[emailIndex]);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (hasUpdates) setEmails(updatedEmails);
    setIsSorting(false);
  };

  const CATEGORY_COLORS: Record<EmailCategory, string> = {
    offer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    counteroffer: 'bg-teal-100 text-teal-700 border-teal-200',
    coverage_response: 'bg-blue-100 text-blue-700 border-blue-200',
    liability_decision: 'bg-amber-100 text-amber-700 border-amber-200',
    medical_records: 'bg-rose-100 text-rose-700 border-rose-200',
    medical_bills: 'bg-orange-100 text-orange-700 border-orange-200',
    policy_limits_response: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    client_communication: 'bg-sky-100 text-sky-700 border-sky-200',
    attorney_correspondence: 'bg-stone-100 text-stone-700 border-stone-200',
    general: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const threads = useMemo(() => groupEmailsIntoThreads(emails), [emails]);

  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      const matchSearch =
        t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.participants.some(p => p.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [threads, searchTerm, categoryFilter]);

  const selectedThread = selectedThreadId
    ? threads.find(t => t.threadId === selectedThreadId) || null
    : null;

  const selectedLatestEmail = selectedThread?.messages[0] || null;

  const handleConfirmLink = (caseId: string) => {
    if (selectedThread && selectedLatestEmail) {
      performLink(caseId, selectedLatestEmail);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex animate-fade-in bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="w-[360px] border-r border-stone-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-stone-100 bg-stone-50 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-800">Inbox</h2>
              {syncMessage && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${syncMessage.includes('error') || syncMessage.includes('Error') || syncMessage.includes('failed') ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {syncMessage}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {outlookConnected && (
                <button
                  onClick={() => runSync(false)}
                  disabled={isSyncingOutlook}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center transition-all ${isSyncingOutlook ? 'bg-blue-100 text-blue-400' : 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50'}`}
                >
                  {isSyncingOutlook ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 mr-1.5" viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="2" width="9" height="9" fill="#F25022"/>
                        <rect x="13" y="2" width="9" height="9" fill="#7FBA00"/>
                        <rect x="2" y="13" width="9" height="9" fill="#00A4EF"/>
                        <rect x="13" y="13" width="9" height="9" fill="#FFB900"/>
                      </svg>
                      Sync
                    </>
                  )}
                </button>
              )}
              <button
                onClick={runAIAutoSort}
                disabled={isSorting}
                className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center transition-all ${isSorting ? 'bg-sky-100 text-sky-400' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}
              >
                {isSorting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Reading...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>
                    Scan
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search conversations..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-4 h-4 text-stone-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select
            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {Object.entries(EMAIL_CATEGORY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.map(thread => {
            const latest = thread.messages[0];
            const isSelected = selectedThreadId === thread.threadId;

            return (
              <div
                key={thread.threadId}
                onClick={() => {
                  setSelectedThreadId(thread.threadId);
                  if (thread.unreadCount > 0) {
                    setEmails(prev => prev.map(e =>
                      e.threadId === thread.threadId || (thread.messages.some(m => m.id === e.id))
                        ? { ...e, isRead: true }
                        : e
                    ));
                  }
                }}
                className={`p-4 border-b border-stone-100 cursor-pointer transition-colors hover:bg-stone-50 ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
              >
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`text-sm truncate ${thread.unreadCount > 0 ? 'font-bold text-stone-900' : 'font-semibold text-stone-600'}`}>
                      {thread.participants.length > 2
                        ? `${thread.participants[0]} +${thread.participants.length - 1}`
                        : thread.participants.join(', ')}
                    </span>
                    {thread.messageCount > 1 && (
                      <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full flex-shrink-0">
                        {thread.messageCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap ml-2">{thread.latestDate}</span>
                </div>
                <h3 className={`text-sm mb-1 truncate ${thread.unreadCount > 0 ? 'font-bold text-stone-800' : 'font-medium text-stone-600'}`}>
                  {thread.subject}
                </h3>
                <p className="text-xs text-stone-500 truncate">{latest?.body}</p>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {thread.linkedCaseId ? (
                    <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 animate-scale-in">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                      {getCaseTag(thread.linkedCaseId)}
                    </div>
                  ) : latest?.aiMatch?.suggestedCaseId ? (
                    <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Review ({latest.aiMatch.confidenceScore}%)
                    </div>
                  ) : null}

                  {thread.category && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${CATEGORY_COLORS[thread.category]}`}>
                      {EMAIL_CATEGORY_LABELS[thread.category]}
                    </span>
                  )}

                  {thread.hasAttachments && (
                    <div className="inline-flex items-center text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      {thread.totalAttachments}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {filteredThreads.length === 0 && (
            <div className="p-8 text-center text-stone-400 text-sm">
              No conversations found
            </div>
          )}
        </div>
      </div>

      {selectedThread ? (
        <ThreadDetail
          thread={selectedThread}
          cases={cases}
          onOpenLinkModal={() => setIsLinkModalOpen(true)}
          onProcessAttachment={onProcessAttachment}
          getCaseTag={getCaseTag}
          performLink={performLink}
          CATEGORY_COLORS={CATEGORY_COLORS}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
          <svg className="w-16 h-16 mb-4 text-stone-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          <p className="font-medium">Select a conversation to view</p>
          <p className="text-xs mt-1 text-stone-300">Emails are grouped by conversation thread</p>
        </div>
      )}

      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-bold text-stone-800">Tag Conversation to Case</h3>
              <button onClick={() => setIsLinkModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 mb-4">Select a case to tag <strong>{selectedThread?.subject}</strong></p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cases.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleConfirmLink(c.id)}
                    className="w-full text-left p-3 rounded-lg border border-stone-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-stone-900 group-hover:text-blue-700">{getCaseTag(c.id)}</p>
                      <p className="text-xs text-stone-500">ID: {c.id} - {c.status.replace(/_/g, ' ')}</p>
                    </div>
                    <svg className="w-5 h-5 text-stone-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
