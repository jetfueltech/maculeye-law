import React, { useState } from 'react';
import { CaseFile, DocumentAttachment, ActivityLog, PreservationRecipient } from '../types';
import { DocumentGenerator, DocumentFormType, EvidenceRecipient } from './DocumentGenerator';
import { useAuth } from '../contexts/AuthContext';

interface PreservationOfEvidencePanelProps {
  caseData: CaseFile;
  onUpdateCase: (c: CaseFile) => void;
}

interface SearchResult {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  types: string[];
}

type RightPanel = 'compose' | 'search';

export const PreservationOfEvidencePanel: React.FC<PreservationOfEvidencePanelProps> = ({
  caseData,
  onUpdateCase,
}) => {
  const { profile } = useAuth();
  const authorName = profile?.full_name || profile?.email || 'Unknown User';

  const [rightPanel, setRightPanel] = useState<RightPanel>('compose');
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const sentRecipients = caseData.preservationRecipients || [];
  const accidentLocation = caseData.location || caseData.extendedIntake?.accident?.accident_location || '';

  const handleSearch = async () => {
    if (!accidentLocation) {
      setSearchError('No accident location set on this case. Enter the location in the case details first.');
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
          body: JSON.stringify({ query: searchQuery.trim(), location: accidentLocation }),
        }
      );

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data.results || []);
      if ((data.results || []).length === 0) {
        setSearchError('No businesses found near that location.');
      }
    } catch {
      setSearchError('Search is currently unavailable. Please enter the recipient information manually.');
    } finally {
      setSearching(false);
    }
  };

  const selectResult = (result: SearchResult) => {
    setRecipient({
      recipientName: result.name,
      contactName: '',
      address: result.address,
      city: result.city,
      state: result.state,
      zip: result.zip,
    });
    setRightPanel('compose');
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

  return (
    <>
      <div className="animate-fade-in bg-white rounded-2xl border border-stone-200 min-h-[500px] flex flex-col">
        <div className="flex items-center justify-between px-8 pt-6 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-lg text-stone-800">Preservation of Evidence</h3>
              <p className="text-xs text-stone-400">Formal demand to preserve footage, records, and evidence related to the accident</p>
            </div>
          </div>
          {accidentLocation && (
            <div className="text-right">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">Accident Location</p>
              <p className="text-sm font-medium text-stone-700 mt-0.5">{accidentLocation}</p>
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-[380px] flex-shrink-0 border-r border-stone-100 flex flex-col">
            <div className="px-5 py-3 border-b border-stone-50">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Sent Letters
                {sentRecipients.length > 0 && (
                  <span className="ml-2 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">
                    {sentRecipients.length}
                  </span>
                )}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sentRecipients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-14 h-14 bg-stone-50 text-stone-300 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-stone-500 mb-1">No letters sent yet</p>
                  <p className="text-xs text-stone-400">Use the form to compose and send your first preservation request</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {sentRecipients.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 p-3.5 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-bold text-stone-800 truncate">{r.recipientName}</p>
                        </div>
                        {r.contactName && (
                          <p className="text-xs text-stone-600 mt-0.5">Attn: {r.contactName}</p>
                        )}
                        <p className="text-xs text-stone-400 mt-0.5 truncate">
                          {r.address}, {r.city}, {r.state} {r.zip}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Sent {r.sentDate}
                          </span>
                          <span className="text-[10px] text-stone-400">by {r.sentBy}</span>
                        </div>
                        {r.notes && (
                          <p className="text-[10px] text-stone-400 mt-1 italic">{r.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-1 px-5 pt-3 pb-0 border-b border-stone-100">
              <button
                onClick={() => setRightPanel('compose')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 -mb-px ${
                  rightPanel === 'compose'
                    ? 'bg-white text-stone-800 border-blue-600'
                    : 'text-stone-400 hover:text-stone-600 border-transparent hover:bg-stone-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                New Request
              </button>
              <button
                onClick={() => setRightPanel('search')}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-t-lg transition-all border-b-2 -mb-px ${
                  rightPanel === 'search'
                    ? 'bg-white text-stone-800 border-blue-600'
                    : 'text-stone-400 hover:text-stone-600 border-transparent hover:bg-stone-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Search Nearby
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {rightPanel === 'compose' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1">Recipient Name *</label>
                      <input
                        type="text"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Shell Gas Station, 123 Main St Residence, Chicago PD"
                        value={recipient.recipientName}
                        onChange={e => setRecipient({ ...recipient, recipientName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1">Contact Name</label>
                      <input
                        type="text"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., John Smith, Manager"
                        value={recipient.contactName || ''}
                        onChange={e => setRecipient({ ...recipient, contactName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-stone-700 mb-1">Street Address *</label>
                      <input
                        type="text"
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 2604 N Cicero Ave"
                        value={recipient.address}
                        onChange={e => setRecipient({ ...recipient, address: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-1">City</label>
                        <input
                          type="text"
                          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Chicago"
                          value={recipient.city}
                          onChange={e => setRecipient({ ...recipient, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-1">State</label>
                        <input
                          type="text"
                          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="IL"
                          value={recipient.state}
                          onChange={e => setRecipient({ ...recipient, state: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-stone-700 mb-1">ZIP</label>
                        <input
                          type="text"
                          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="60618"
                          value={recipient.zip}
                          onChange={e => setRecipient({ ...recipient, zip: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">Notes (optional)</label>
                    <textarea
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

              {rightPanel === 'search' && (
                <div className="space-y-3">
                  {accidentLocation && (
                    <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-xs text-stone-600">
                        Showing businesses within 1000 ft of <span className="font-semibold text-stone-800">{accidentLocation}</span>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Filter results (e.g., gas station, restaurant)..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                    <button
                      onClick={() => handleSearch()}
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
                      {searchResults.length > 0 ? 'Filter' : 'Search'}
                    </button>
                  </div>

                  {searching && searchResults.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
                      <p className="text-sm font-medium text-stone-600">Finding nearby businesses...</p>
                      <p className="text-xs text-stone-400 mt-1">This may take a few seconds</p>
                    </div>
                  )}

                  {searchError && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                      {searchError}
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((result, i) => {
                        const alreadySent = sentRecipients.some(
                          r => r.recipientName === result.name && r.address === result.address
                        );
                        return (
                          <button
                            key={i}
                            onClick={() => selectResult(result)}
                            className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all group ${
                              alreadySent
                                ? 'border-emerald-200 bg-emerald-50/50'
                                : 'border-stone-200 hover:border-blue-300 hover:bg-blue-50/50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                              alreadySent ? 'bg-emerald-100' : 'bg-stone-100 group-hover:bg-blue-100'
                            }`}>
                              {alreadySent ? (
                                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4 text-stone-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold transition-colors ${
                                  alreadySent ? 'text-emerald-700' : 'text-stone-800 group-hover:text-blue-700'
                                }`}>{result.name}</p>
                                {alreadySent && (
                                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">SENT</span>
                                )}
                              </div>
                              <p className="text-xs text-stone-500">{result.address}, {result.city}, {result.state} {result.zip}</p>
                              {result.types.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {result.types.slice(0, 3).map((t, j) => (
                                    <span key={j} className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                                      {t.replace(/_/g, ' ')}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {!alreadySent && (
                              <svg className="w-4 h-4 text-stone-300 group-hover:text-blue-500 flex-shrink-0 mt-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
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
