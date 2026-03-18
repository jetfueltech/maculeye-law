import React, { useState, useEffect } from 'react';
import { IdentifiedDocument, ExtractedIntakeData } from '../../services/documentExtractionService';

interface DocumentScanScreenProps {
  documents: { file: File; fileData: string; mimeType: string }[];
  processingStatus: string;
  completedCount: number;
  scanningIndex: number;
  extractionPhase: boolean;
  liveExtractedData: ExtractedIntakeData;
  identifiedDocs: IdentifiedDocument[];
}

const DOC_TYPE_LABELS: Record<string, string> = {
  retainer: 'Retainer Agreement',
  crash_report: 'Crash Report',
  authorization: 'HIPAA Authorization',
  insurance_card: 'Insurance Card',
  medical_record: 'Medical Record',
  photo: 'Photo',
  email: 'Email',
  other: 'Other Document',
};

const DOC_TYPE_COLORS: Record<string, string> = {
  retainer: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  crash_report: 'bg-blue-50 text-blue-700 border-blue-200',
  authorization: 'bg-amber-50 text-amber-700 border-amber-200',
  insurance_card: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  medical_record: 'bg-rose-50 text-rose-700 border-rose-200',
  photo: 'bg-slate-50 text-slate-700 border-slate-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

const FIELD_LABELS: Record<string, { label: string; section: string }> = {
  clientName: { label: 'Client Name', section: 'Client' },
  clientDob: { label: 'Date of Birth', section: 'Client' },
  clientEmail: { label: 'Email', section: 'Client' },
  clientPhone: { label: 'Phone', section: 'Client' },
  clientAddress: { label: 'Address', section: 'Client' },
  accidentDate: { label: 'Accident Date', section: 'Accident' },
  accidentLocation: { label: 'Location', section: 'Accident' },
  accidentDescription: { label: 'Description', section: 'Accident' },
  policeReportNumber: { label: 'Report #', section: 'Accident' },
  policeAgency: { label: 'Agency', section: 'Accident' },
  defendantName: { label: 'Defendant', section: 'Parties' },
  defendantInsurance: { label: 'Def. Insurance', section: 'Parties' },
  defendantPolicyNumber: { label: 'Def. Policy #', section: 'Parties' },
  defendantVehicle: { label: 'Def. Vehicle', section: 'Parties' },
  clientInsurance: { label: 'Client Insurance', section: 'Insurance' },
  clientPolicyNumber: { label: 'Client Policy #', section: 'Insurance' },
  vehicleYear: { label: 'Vehicle Year', section: 'Vehicle' },
  vehicleMake: { label: 'Vehicle Make', section: 'Vehicle' },
  vehicleModel: { label: 'Vehicle Model', section: 'Vehicle' },
  vehicleDamage: { label: 'Damage', section: 'Vehicle' },
  injuries: { label: 'Injuries', section: 'Medical' },
  treatmentProviders: { label: 'Providers', section: 'Medical' },
  retainerSigned: { label: 'Retainer Signed', section: 'Signatures' },
  hipaaSigned: { label: 'HIPAA Signed', section: 'Signatures' },
};

const FieldRow: React.FC<{ fieldKey: string; value: string | boolean; isNew: boolean }> = ({ fieldKey, value, isNew }) => {
  const info = FIELD_LABELS[fieldKey];
  if (!info) return null;

  const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${
      isNew ? 'bg-emerald-50 ring-1 ring-emerald-200 animate-field-in' : 'bg-slate-50'
    }`}>
      <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${isNew ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-[10px] font-bold text-slate-400 uppercase w-24 flex-shrink-0 tracking-wide">{info.label}</span>
      <span className={`text-sm font-medium truncate transition-colors ${isNew ? 'text-emerald-700' : 'text-slate-700'}`}>
        {displayValue}
      </span>
    </div>
  );
};

export const DocumentScanScreen: React.FC<DocumentScanScreenProps> = ({
  documents,
  processingStatus,
  completedCount,
  scanningIndex,
  extractionPhase,
  liveExtractedData,
  identifiedDocs,
}) => {
  const [recentFields, setRecentFields] = useState<Set<string>>(new Set());
  const [prevFieldKeys, setPrevFieldKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentKeys = new Set(
      Object.entries(liveExtractedData)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k]) => k)
    );
    const newKeys = new Set<string>();
    currentKeys.forEach(k => {
      if (!prevFieldKeys.has(k)) newKeys.add(k);
    });

    if (newKeys.size > 0) {
      setRecentFields(newKeys);
      setPrevFieldKeys(currentKeys);
      const timer = setTimeout(() => setRecentFields(new Set()), 2000);
      return () => clearTimeout(timer);
    }
    setPrevFieldKeys(currentKeys);
  }, [liveExtractedData]);

  const activeDoc = scanningIndex >= 0 ? documents[scanningIndex] : null;
  const isImage = activeDoc?.mimeType.includes('image');
  const isPdf = activeDoc?.mimeType.includes('pdf');

  const totalSteps = documents.length + 1;
  const currentStep = extractionPhase ? documents.length : completedCount;
  const progress = Math.round((currentStep / totalSteps) * 100);

  const extractedEntries = Object.entries(liveExtractedData).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes scanDown {
          0% { top: -2%; }
          50% { top: 98%; }
          100% { top: -2%; }
        }
        @keyframes field-in {
          0% { opacity: 0; transform: translateY(-4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-field-in { animation: field-in 0.4s ease-out; }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(59,130,246,0); }
        }
      `}</style>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!extractionPhase ? (
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}
                <h4 className="text-sm font-bold text-slate-700">
                  {extractionPhase ? 'Extracting Data' : 'Scanning Documents'}
                </h4>
              </div>
              <span className="text-xs font-semibold text-blue-600">{progress}%</span>
            </div>

            <div className="relative" style={{ minHeight: '340px' }}>
              {activeDoc && !extractionPhase ? (
                <div className="relative w-full h-80 bg-slate-50 flex items-center justify-center overflow-hidden">
                  {isImage && activeDoc.fileData ? (
                    <img
                      src={activeDoc.fileData}
                      alt={activeDoc.file.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 p-6">
                      <svg className={`w-16 h-16 ${isPdf ? 'text-red-300' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <div className="space-y-1.5 w-48">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="h-1.5 rounded-full bg-slate-200" style={{ width: `${55 + Math.sin(i) * 35}%` }} />
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden z-10">
                    <div
                      className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_3px_rgba(59,130,246,0.5)]"
                      style={{ animation: 'scanDown 2.5s ease-in-out infinite' }}
                    />
                    <div
                      className="absolute inset-x-0 h-12 bg-gradient-to-b from-blue-400/10 to-transparent"
                      style={{ animation: 'scanDown 2.5s ease-in-out infinite' }}
                    />
                  </div>
                </div>
              ) : extractionPhase ? (
                <div className="w-full h-80 bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col items-center justify-center gap-4 p-6">
                  <div className="relative">
                    <svg className="w-16 h-16 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <div className="absolute inset-0 rounded-full" style={{ animation: 'pulse-glow 2s ease-in-out infinite' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700 mb-1">Cross-referencing all documents</p>
                    <p className="text-xs text-slate-400">AI is reading every document to extract case data</p>
                  </div>
                  {extractedEntries.length > 0 && (
                    <div className="mt-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
                      <span className="text-xs font-bold text-emerald-700">{extractedEntries.length} fields found</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-80 bg-slate-50 flex items-center justify-center">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500">{processingStatus}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {documents.map((doc, i) => {
              const identified = identifiedDocs[i];
              const isDone = !!identified;
              const isActive = i === scanningIndex;
              const docIsImage = doc.mimeType.includes('image');

              return (
                <div
                  key={i}
                  className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all duration-300 ${
                    isActive
                      ? 'border-blue-400 bg-blue-50 shadow-md shadow-blue-100'
                      : isDone
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-slate-200 bg-white opacity-60'
                  }`}
                >
                  <div className="relative w-14 h-16 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
                    {docIsImage && doc.fileData ? (
                      <img src={doc.fileData} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className={`w-6 h-6 ${doc.mimeType.includes('pdf') ? 'text-red-300' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    )}
                    {isDone && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden">
                        <div className="absolute inset-x-0 h-px bg-blue-500 shadow-[0_0_6px_1px_rgba(59,130,246,0.5)]" style={{ animation: 'scanDown 2s ease-in-out infinite' }} />
                      </div>
                    )}
                  </div>
                  <div className="text-center max-w-[72px]">
                    {identified ? (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border inline-block ${DOC_TYPE_COLORS[identified.identifiedType] || DOC_TYPE_COLORS.other}`}>
                        {DOC_TYPE_LABELS[identified.identifiedType]?.split(' ')[0] || 'Doc'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-medium text-slate-400 truncate block">
                        {isActive ? 'Scanning...' : 'Waiting'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Extracted Fields</h4>
              {extractedEntries.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  {extractedEntries.length}
                </span>
              )}
            </div>

            <div className="p-3 max-h-[480px] overflow-y-auto space-y-1.5">
              {extractedEntries.length === 0 && !extractionPhase && (
                <div className="py-12 text-center">
                  <svg className="w-8 h-8 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs text-slate-400">Fields will appear here as documents are analyzed</p>
                </div>
              )}

              {extractedEntries.length === 0 && extractionPhase && (
                <div className="py-12 text-center">
                  <div className="flex gap-1 justify-center mb-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">Reading documents...</p>
                </div>
              )}

              {extractedEntries.map(([key, value]) => (
                <FieldRow
                  key={key}
                  fieldKey={key}
                  value={value as string | boolean}
                  isNew={recentFields.has(key)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
