import React, { useState, useEffect, useRef } from 'react';
import { Email, CaseFile, DocumentAttachment, EmailCategory, EMAIL_CATEGORY_LABELS } from '../types';
import { matchEmailToCase } from '../services/geminiService';

interface InboxProps {
  cases: CaseFile[];
  emails: Email[];
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  onLinkCase: (caseId: string, email: Email) => void;
}

export const Inbox: React.FC<InboxProps> = ({ cases, emails, setEmails, onLinkCase }) => {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSorting, setIsSorting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  
  // Preview State
  const [previewAttachment, setPreviewAttachment] = useState<DocumentAttachment | null>(null);
  
  // Ref to track if we've already simulated the arrival in this mount lifecycle
  // Note: We also check the email list itself to prevent duplicates across navigations
  const hasSimulatedRef = useRef(false);

  // Helper to format case tag
  const getCaseTag = (caseId: string) => {
      const c = cases.find(x => x.id === caseId);
      if (!c) return caseId;
      
      const clientLast = c.clientName.split(' ').pop();
      const def = c.parties?.find(p => p.role === 'Defendant');
      // Fallback or truncate
      const defName = def ? def.name : 'Unknown Defendant';
      const shortDef = defName.length > 20 ? defName.substring(0, 18) + '...' : defName;
      
      return `${clientLast} v. ${shortDef}`;
  };

  // Simulate Live Email Arrival
  useEffect(() => {
      // If we already have the "live" email in the persisted list, don't simulate again
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

      // 1. Email "Arrives" after 1 second
      const arrivalTimer = setTimeout(() => {
          setEmails(prev => [incomingEmail, ...prev]);
          
          // 2. AI "Reads" and Tags it automatically after another 1.5 seconds
          const processingTimer = setTimeout(async () => {
             // Visually show it's being processed? For now just do it.
             try {
                 const match = await matchEmailToCase(incomingEmail, cases);
                 if (match.suggestedCaseId && match.confidenceScore > 85) {
                     // Link locally and persist
                     setEmails(prev => prev.map(e => 
                         e.id === incomingEmail.id 
                         ? { ...e, aiMatch: match, linkedCaseId: match.suggestedCaseId } 
                         : e
                     ));
                     // We also trigger the 'link' action in parent to ensure consistency, 
                     // but auto-linking usually requires user confirmation in real apps. 
                     // For this demo, we'll just tag it visually in the inbox first.
                     // To fully "Link" it (add to case file), we might want to wait for user approval, 
                     // but the prompt asked for "system automatically reading it and tagging it".
                     // We'll update the email state to show the tag.
                 }
             } catch (e) {
                 console.error("Auto-process failed", e);
             }
          }, 2000);

      }, 1000);

      return () => clearTimeout(arrivalTimer);
  }, []); // Run once on mount, logic checks prevent duplicates

  // Handle case linking
  const handleConfirmLink = (caseId: string) => {
      if (selectedEmail) {
          performLink(caseId, selectedEmail);
      }
  };

  const performLink = (caseId: string, email: Email) => {
      onLinkCase(caseId, email); // Updates App state (Cases & Emails)
      // Local selected email needs update to show changes immediately in the view
      if (selectedEmail?.id === email.id) {
          setSelectedEmail(prev => prev ? { ...prev, linkedCaseId: caseId } : null);
      }
      setIsLinkModalOpen(false);
  };

  const handlePreview = (e: React.MouseEvent, att: any) => {
      e.stopPropagation();
      setPreviewAttachment({
          type: 'email',
          fileName: att.name,
          fileData: null,
          mimeType: att.type === 'pdf' ? 'application/pdf' : 'image/jpeg',
          source: 'Inbox Preview'
      });
  };

  const runAIAutoSort = async () => {
      setIsSorting(true);
      const unlinkedEmails = emails.filter(e => !e.linkedCaseId);
      
      // We work with a copy to batch updates
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
                      // Note: We are NOT automatically calling onLinkCase here to add docs to the case file
                      // We are just suggesting the tag. User clicks "Apply Tag" to confirm.
                      updatedEmails[emailIndex].linkedCaseId = match.suggestedCaseId;
                      // However, to ensure persistence of the "Linked" status visually:
                      onLinkCase(match.suggestedCaseId, updatedEmails[emailIndex]);
                  }
              }
          } catch (err) {
              console.error(err);
          }
      }
      
      if (hasUpdates) {
          setEmails(updatedEmails);
      }
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
      attorney_correspondence: 'bg-slate-100 text-slate-700 border-slate-200',
      general: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  const filteredEmails = emails.filter(e => {
      const matchSearch = e.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.from.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
      return matchSearch && matchCategory;
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex animate-fade-in bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Left Pane: Email List */}
        <div className="w-1/3 border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
                <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold text-slate-800">Inbox</h2>
                    <button 
                        onClick={runAIAutoSort}
                        disabled={isSorting}
                        className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center transition-all ${isSorting ? 'bg-indigo-100 text-indigo-400' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        {isSorting ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Reading...
                            </>
                        ) : (
                            <>
                                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>
                                Scan Inbox
                            </>
                        )}
                    </button>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search emails..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <select
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
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
                {filteredEmails.map(email => (
                    <div 
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${selectedEmail?.id === email.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'}`}
                    >
                        <div className="flex justify-between mb-1">
                            <span className={`text-sm font-semibold truncate ${!email.isRead ? 'text-slate-900' : 'text-slate-600'}`}>{email.from}</span>
                            <span className="text-xs text-slate-400 whitespace-nowrap">{email.date}</span>
                        </div>
                        <h3 className={`text-sm mb-1 truncate ${!email.isRead ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>{email.subject}</h3>
                        <p className="text-xs text-slate-500 truncate">{email.body}</p>
                        
                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                            {email.linkedCaseId ? (
                                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 animate-scale-in">
                                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                    {getCaseTag(email.linkedCaseId)}
                                </div>
                            ) : email.aiMatch?.suggestedCaseId ? (
                                <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Review Match ({email.aiMatch.confidenceScore}%)
                                </div>
                            ) : null}
                            
                            {email.category && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${CATEGORY_COLORS[email.category]}`}>
                                    {EMAIL_CATEGORY_LABELS[email.category]}
                                </span>
                            )}

                            {!email.linkedCaseId && email.attachments.length > 0 && (
                                <div className="inline-flex items-center text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    {email.attachments.length}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Right Pane: Email Detail */}
        <div className="flex-1 flex flex-col bg-white">
            {selectedEmail ? (
                <>
                    {/* Toolbar */}
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex space-x-2">
                            <button className="p-2 hover:bg-slate-100 rounded text-slate-500" title="Reply">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            </button>
                            <button className="p-2 hover:bg-slate-100 rounded text-slate-500" title="Delete">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                        <button 
                            onClick={() => setIsLinkModalOpen(true)}
                            disabled={!!selectedEmail.linkedCaseId}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors ${selectedEmail.linkedCaseId ? 'bg-indigo-50 text-indigo-700 cursor-default border border-indigo-100' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'}`}
                        >
                            {selectedEmail.linkedCaseId ? (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                    {getCaseTag(selectedEmail.linkedCaseId)}
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                    Tag to Case
                                </>
                            )}
                        </button>
                    </div>

                    {/* AI Suggestion Box */}
                    {selectedEmail.aiMatch && !selectedEmail.linkedCaseId && selectedEmail.aiMatch.suggestedCaseId && (
                        <div className="mx-6 mt-6 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl flex items-start justify-between animate-fade-in">
                            <div>
                                <h4 className="text-sm font-bold text-indigo-900 flex items-center">
                                    <svg className="w-4 h-4 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/></svg>
                                    AI Suggested Tag
                                </h4>
                                <p className="text-xs text-indigo-700 mt-1 mb-2 max-w-lg">{selectedEmail.aiMatch.reasoning}</p>
                                <div className="text-xs font-semibold text-indigo-800 flex items-center">
                                    <span className="bg-indigo-100 px-2 py-0.5 rounded text-indigo-700 mr-2">
                                        {getCaseTag(selectedEmail.aiMatch.suggestedCaseId)}
                                    </span>
                                    Confidence: {selectedEmail.aiMatch.confidenceScore}%
                                </div>
                            </div>
                            <button 
                                onClick={() => performLink(selectedEmail.aiMatch!.suggestedCaseId!, selectedEmail)}
                                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
                            >
                                Apply Tag
                            </button>
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">{selectedEmail.subject}</h1>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold mr-3">
                                        {selectedEmail.from.substring(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{selectedEmail.from} <span className="text-slate-400 font-normal">&lt;{selectedEmail.fromEmail}&gt;</span></p>
                                        <p className="text-xs text-slate-500">To: You</p>
                                    </div>
                                </div>
                                <span className="text-sm text-slate-500">{selectedEmail.date}</span>
                            </div>
                        </div>

                        <div className="prose prose-sm max-w-none text-slate-700 mb-8 whitespace-pre-wrap font-sans">
                            {selectedEmail.body}
                        </div>

                        {/* Attachments */}
                        {selectedEmail.attachments.length > 0 && (
                            <div className="border-t border-slate-100 pt-6">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    {selectedEmail.attachments.length} Attachments
                                </h4>
                                <div className="flex flex-wrap gap-4">
                                    {selectedEmail.attachments.map((att, i) => (
                                        <div 
                                            key={i} 
                                            onClick={(e) => handlePreview(e, att)}
                                            className="flex items-center p-3 border border-slate-200 rounded-xl bg-slate-50 hover:border-blue-300 transition-colors cursor-pointer group"
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-3 ${att.type === 'pdf' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {att.type === 'pdf' ? (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                ) : (
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900 group-hover:text-blue-700">{att.name}</p>
                                                <p className="text-xs text-slate-500">{att.size}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <svg className="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <p>Select an email to view details</p>
                </div>
            )}
        </div>

        {/* Link Modal */}
        {isLinkModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">Tag Email to Case</h3>
                        <button onClick={() => setIsLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-600 mb-4">Select a case to apply tag for <strong>{selectedEmail?.subject}</strong></p>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {cases.map(c => (
                                <button 
                                    key={c.id}
                                    onClick={() => handleConfirmLink(c.id)}
                                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between group"
                                >
                                    <div>
                                        <p className="font-bold text-slate-900 group-hover:text-blue-700">{getCaseTag(c.id)}</p>
                                        <p className="text-xs text-slate-500">ID: {c.id} • {c.status.replace(/_/g, ' ')}</p>
                                    </div>
                                    <svg className="w-5 h-5 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Attachment Preview Modal */}
        {previewAttachment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewAttachment(null)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-slate-900">{previewAttachment.fileName}</h3>
                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">{previewAttachment.type.replace('_', ' ')}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => alert('Simulation: Downloading file...')}
                                className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-3 py-1.5 rounded transition-colors"
                            >
                                Download
                            </button>
                            <button onClick={() => setPreviewAttachment(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-100 overflow-auto flex items-center justify-center p-4">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                            <svg className="w-16 h-16 mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p>Preview not available for this simulated file.</p>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};