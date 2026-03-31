import React, { useState } from 'react';
import { CaseFile, DocumentAttachment, ActivityLog, PreservationRecipient } from '../types';
import { DocumentGenerator, DocumentFormType, EvidenceRecipient } from './DocumentGenerator';
import { useAuth } from '../contexts/AuthContext';

interface PreservationOfEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: CaseFile;
  onUpdateCase: (c: CaseFile) => void;
}

interface BusinessResult {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  types: string[];
}

type ModalTab = 'compose' | 'search' | 'sent';

export const PreservationOfEvidenceModal: React.FC<PreservationOfEvidenceModalProps> = ({
  isOpen,
  onClose,
  caseData,
  onUpdateCase,
}) => {
  const { profile } = useAuth();
  const authorName = profile?.full_name || profile?.email || 'Unknown User';

  const [activeTab, setActiveTab] = useState<ModalTab>('compose');
  const [recipient, setRecipient] = useState<EvidenceRecipient>({
    recipientName: '',
    contactName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });
  const [notes, setNotes] = useState('');
  const [showDoc, setShowDoc] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [savedDoc, setSavedDoc] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BusinessResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  if (!isOpen) return null;

  const sentRecipients = caseData.preservationRecipients || [];
  const accidentLocation = caseData.location || caseData.extendedIntake?.accident?.accident_location || '';

  const handleSearch = async () => {
    const query = searchQuery.trim() || 'businesses';
    if (!accidentLocation) {
      setSearchError('No accident location set on this case. Enter the location in the case details first, or search manually.');
      return;
    }

    setSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/search-businesses`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, location: accidentLocation }),
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data.results || []);
      if ((data.results || []).length === 0) {
        setSearchError('No results found near that location. Try a different search term.');
      }
    } catch {
      setSearchError('Search is currently unavailable. Please enter the recipient information manually.');
    } finally {
      setSearching(false);
    }
  };

  const selectBusiness = (biz: BusinessResult) => {
    setRecipient({
      recipientName: biz.name,
      contactName: '',
      address: biz.address,
      city: biz.city,
      state: biz.state,
      zip: biz.zip,
    });
    setActiveTab('compose');
  };

  const isValid = recipient.recipientName.trim() && recipient.address.trim();

  const applyUpdate = () => {
    setConfirming(true);
    const nowISO = new Date().toISOString();
    const todayStr = new Date().toISOString().split('T')[0];

    const newRecipient: PreservationRecipient = {
      id: Math.random().toString(36).substr(2, 9),
      recipientName: recipient.recipientName,
      contactName: recipient.contactName || undefined,
      address: recipient.address,
      city: recipient.city,
      state: recipient.state,
      zip: recipient.zip,
      sentDate: todayStr,
      sentBy: authorName,
      notes: notes || undefined,
    };

    const log: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user',
      message: `Preservation of Evidence letter sent to ${recipient.recipientName}${recipient.contactName ? ` (Attn: ${recipient.contactName})` : ''}${notes ? ` — ${notes}` : ''}`,
      timestamp: nowISO,
      author: authorName,
    };

    const updated: CaseFile = {
      ...caseData,
      preservationRecipients: [...sentRecipients, newRecipient],
      activityLog: [log, ...(caseData.activityLog || [])],
    };

    onUpdateCase(updated);

    setTimeout(() => {
      setConfirming(false);
      setRecipient({ recipientName: '', contactName: '', address: '', city: '', state: '', zip: '' });
      setNotes('');
    }, 600);
  };

  const handleSaveToDocuments = (docName: string, _docFormType: DocumentFormType) => {
    const newDoc: DocumentAttachment = {
      type: 'other',
      fileData: null,
      fileName: `${docName} — ${recipient.recipientName} — ${caseData.clientName} — ${new Date().toISOString().split('T')[0]}.pdf`,
      mimeType: 'application/pdf',
      source: 'Generated',
      category: 'workflow_generated',
      generatedFormType: 'preservation_of_evidence',
      uploadedAt: new Date().toISOString(),
    };
    const updated = {
      ...caseData,
      documents: [...caseData.documents, newDoc],
    };
    onUpdateCase(updated);
    setSavedDoc(true);
    setTimeout(() => setSavedDoc(false), 2000);
  };

  const tabItems: { key: ModalTab; label: string; icon: string; badge?: number }[] = [
    {
      key: 'compose',
      label: 'New Request',
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
    },
    {
      key: 'search',
      label: 'Search Nearby',
      icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
    },
    {
      key: 'sent',
      label: 'Sent',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      badge: sentRecipients.length || undefined,
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="flex items-start justify-between p-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">Preservation of Evidence</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Formal demand to preserve surveillance footage, records, and evidence related to the accident.
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="bg-slate-50 border-b border-slate-200 px-6">
            <div className="flex gap-1 pt-2">
              {tabItems.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'bg-white text-slate-800 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700 border-transparent hover:bg-white/50'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                  </svg>
                  {tab.label}
                  {tab.badge !== undefined && (
                    <span className="ml-1 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full w-5 h-5 flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {activeTab !== 'sent' && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Client</span>
                  <span className="font-semibold text-slate-800">{caseData.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date of Loss</span>
                  <span className="font-semibold text-slate-800">{caseData.accidentDate}</span>
                </div>
                {accidentLocation && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Accident Location</span>
                    <span className="font-semibold text-slate-800">{accidentLocation}</span>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'compose' && (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Recipient Name *</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Shell Gas Station, 123 Main St Residence, Chicago PD"
                      value={recipient.recipientName}
                      onChange={e => setRecipient({ ...recipient, recipientName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Contact Name</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., John Smith, Manager"
                      value={recipient.contactName || ''}
                      onChange={e => setRecipient({ ...recipient, contactName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 2604 N Cicero Ave"
                      value={recipient.address}
                      onChange={e => setRecipient({ ...recipient, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Chicago"
                        value={recipient.city}
                        onChange={e => setRecipient({ ...recipient, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="IL"
                        value={recipient.state}
                        onChange={e => setRecipient({ ...recipient, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">ZIP</label>
                      <input
                        type="text"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="60618"
                        value={recipient.zip}
                        onChange={e => setRecipient({ ...recipient, zip: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes (optional)</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                    placeholder="Add any notes about this preservation request..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setShowDoc(true)}
                    disabled={!isValid}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Preview & Print
                  </button>
                  <button
                    onClick={applyUpdate}
                    disabled={confirming || !isValid}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                      confirming
                        ? 'bg-emerald-500 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    {confirming ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Saved
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Mark as Sent
                      </>
                    )}
                  </button>
                </div>

                {savedDoc && (
                  <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 rounded-lg py-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Document saved to case files
                  </div>
                )}
              </>
            )}

            {activeTab === 'search' && (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search near accident location (e.g., gas station, residence, police dept)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {searching ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    )}
                    Search
                  </button>
                </div>

                {accidentLocation && (
                  <p className="text-xs text-slate-500">
                    Searching near: <span className="font-medium text-slate-700">{accidentLocation}</span>
                  </p>
                )}

                {searchError && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                    {searchError}
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {searchResults.map((biz, i) => {
                      const alreadySent = sentRecipients.some(
                        r => r.recipientName === biz.name && r.address === biz.address
                      );
                      return (
                        <button
                          key={i}
                          onClick={() => selectBusiness(biz)}
                          className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all group ${
                            alreadySent
                              ? 'border-emerald-200 bg-emerald-50/50'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                            alreadySent ? 'bg-emerald-100' : 'bg-slate-100 group-hover:bg-blue-100'
                          }`}>
                            {alreadySent ? (
                              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-semibold transition-colors ${
                                alreadySent ? 'text-emerald-700' : 'text-slate-800 group-hover:text-blue-700'
                              }`}>{biz.name}</p>
                              {alreadySent && (
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">SENT</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500">{biz.address}, {biz.city}, {biz.state} {biz.zip}</p>
                            {biz.types.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {biz.types.slice(0, 3).map((t, j) => (
                                  <span key={j} className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                    {t.replace(/_/g, ' ')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {!alreadySent && (
                            <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sent' && (
              <div className="space-y-3">
                {sentRecipients.length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-slate-500 font-medium">No preservation letters sent yet</p>
                    <p className="text-xs text-slate-400 mt-1">Use the "New Request" tab to compose and send letters</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-700">
                        {sentRecipients.length} letter{sentRecipients.length !== 1 ? 's' : ''} sent
                      </p>
                    </div>
                    {sentRecipients.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white"
                      >
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-bold text-slate-800">{r.recipientName}</p>
                            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Sent {r.sentDate}
                            </span>
                          </div>
                          {r.contactName && (
                            <p className="text-xs text-slate-600 mt-0.5">Attn: {r.contactName}</p>
                          )}
                          <p className="text-xs text-slate-500 mt-0.5">
                            {r.address}, {r.city}, {r.state} {r.zip}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                            <span>By: {r.sentBy}</span>
                            {r.notes && <span>Note: {r.notes}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DocumentGenerator
        isOpen={showDoc}
        onClose={() => setShowDoc(false)}
        caseData={caseData}
        formType="preservation_of_evidence"
        context={{ evidenceRecipient: recipient }}
        onSaveToDocuments={handleSaveToDocuments}
      />
    </>
  );
};
