import React, { useState } from 'react';
import { CaseFile, CaseStatus, DocumentAttachment } from '../types';
import { DocumentUploadStep, PendingDocument } from './intake/DocumentUploadStep';
import { IntakeReviewStep } from './intake/IntakeReviewStep';
import { ManualIntakeForm } from './intake/ManualIntakeForm';
import { IdentifiedDocument, ExtractedIntakeData } from '../services/documentExtractionService';
import { generateDocumentNameWithExt } from '../services/documentNamingService';
import { buildExtendedIntake } from '../services/intakeMapper';

interface NewIntakePageProps {
  onBack: () => void;
  onSubmit: (newCase: CaseFile) => void;
}

type IntakeMode = 'extraction' | 'manual';

export const NewIntakePage: React.FC<NewIntakePageProps> = ({ onBack, onSubmit }) => {
  const [mode, setMode] = useState<IntakeMode>('extraction');
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingDocs, setPendingDocs] = useState<PendingDocument[]>([]);
  const [identifiedDocs, setIdentifiedDocs] = useState<IdentifiedDocument[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedIntakeData>({});
  const [referralSource, setReferralSource] = useState('Agency Portal');
  const [processingStatus, setProcessingStatus] = useState('');
  const [completedScanCount, setCompletedScanCount] = useState(0);
  const [scanningIndex, setScanningIndex] = useState(-1);
  const [extractionPhase, setExtractionPhase] = useState(false);
  const [liveExtractedData, setLiveExtractedData] = useState<ExtractedIntakeData>({});
  const [clientNames, setClientNames] = useState<string[]>(['']);

  const trimmedClientNames = clientNames.map(n => n.trim()).filter(Boolean);
  const hasClientName = trimmedClientNames.length > 0;

  const handleModeSwitch = (newMode: IntakeMode) => {
    setMode(newMode);
    setStep(1);
    setPendingDocs([]);
    setIdentifiedDocs([]);
    setExtractedData({});
    setLiveExtractedData({});
    setClientNames(['']);
  };

  const handleProceedToReview = async () => {
    setStep(2);
    setIsExtracting(true);
    setIdentifiedDocs([]);
    setCompletedScanCount(0);
    setScanningIndex(-1);
    setExtractionPhase(false);
    setLiveExtractedData({});
    setExtractedData({});
    setProcessingStatus('Starting document analysis...');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const documentsPayload = pendingDocs.map(doc => ({
        fileData: doc.fileData,
        mimeType: doc.mimeType,
        fileName: doc.file.name,
      }));

      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documents: documentsPayload, clientNames: trimmedClientNames, apiKey: (typeof process !== 'undefined' && process.env?.API_KEY) || '' }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        let errorMsg = 'Analysis failed';
        try { errorMsg = JSON.parse(errorText).error || errorMsg; } catch {}
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(eventType, data);
            } catch {}
            eventType = '';
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 400));
    } catch (err) {
      console.error('Extraction error:', err);
      setProcessingStatus('Analysis encountered an error. You can still fill in fields manually.');
      await new Promise(resolve => setTimeout(resolve, 1500));
    } finally {
      setIsExtracting(false);
      setProcessingStatus('');
      setScanningIndex(-1);
      setExtractionPhase(false);
    }
  };

  const handleSSEEvent = (event: string, data: any) => {
    switch (event) {
      case 'scan_start':
        setScanningIndex(data.index);
        setProcessingStatus(`Scanning document ${data.index + 1} of ${data.total}: ${data.fileName}`);
        break;

      case 'doc_identified':
        setCompletedScanCount(prev => prev + 1);
        setIdentifiedDocs(prev => {
          const updated = [...prev];
          const pendingDoc = pendingDocs[data.index];
          if (pendingDoc) {
            updated[data.index] = {
              file: pendingDoc.file,
              fileData: pendingDoc.fileData,
              mimeType: pendingDoc.mimeType,
              identifiedType: data.type,
              suggestedName: data.suggestedName,
              confidence: data.confidence,
            };
          }
          return updated;
        });
        break;

      case 'extraction_start':
        setExtractionPhase(true);
        setScanningIndex(-1);
        setProcessingStatus(data.message || 'Extracting client information...');
        break;

      case 'fields_extracted':
        setLiveExtractedData(prev => ({ ...prev, ...data.fields }));
        setExtractedData(prev => ({ ...prev, ...data.fields }));
        break;

      case 'extraction_error':
        setProcessingStatus('Some extraction failed. You can fill in fields manually.');
        break;

      case 'complete':
        setProcessingStatus('Analysis complete');
        break;
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);

    setTimeout(() => {
      const insuranceList: any[] = [];

      if (extractedData.defendantInsurance) {
        insuranceList.push({
          type: 'Defendant',
          provider: extractedData.defendantInsurance,
          claimNumber: extractedData.defendantPolicyNumber,
        });
      }

      if (extractedData.clientInsurance) {
        insuranceList.push({
          type: 'Client',
          provider: extractedData.clientInsurance,
          policyNumber: extractedData.clientPolicyNumber,
        });
      }

      const accidentDate = extractedData.accidentDate || new Date().toISOString().split('T')[0];
      const solDate = new Date(accidentDate);
      solDate.setFullYear(solDate.getFullYear() + 2);

      const clientName = trimmedClientNames[0] || extractedData.clientName || 'Unknown Client';
      const typeCounts: Record<string, number> = {};

      const caseDocuments: DocumentAttachment[] = identifiedDocs.map(doc => {
        const typeKey = doc.identifiedType;
        typeCounts[typeKey] = (typeCounts[typeKey] || 0) + 1;

        const fileName = generateDocumentNameWithExt({
          clientName,
          dol: accidentDate,
          docType: doc.identifiedType,
          source: doc.suggestedName?.replace(/^.*?-\s*/, '').trim() || undefined,
          version: typeCounts[typeKey],
          originalFileName: doc.file.name,
        });

        return {
          type: doc.identifiedType,
          fileData: doc.fileData,
          fileName,
          mimeType: doc.mimeType,
          source: 'Intake Upload',
        };
      });

      const fullAddress = [extractedData.clientAddress, extractedData.clientCity, extractedData.clientState, extractedData.clientZip].filter(Boolean).join(', ');
      const extendedIntake = buildExtendedIntake(extractedData, referralSource);

      const newCase: CaseFile = {
        id: Math.random().toString(36).substr(2, 9),
        clientName,
        clientDob: extractedData.clientDob,
        clientAddress: fullAddress || extractedData.clientAddress,
        clientEmail: extractedData.clientEmail || 'no-email@example.com',
        clientPhone: extractedData.clientPhone || '555-0000',
        accidentDate: accidentDate,
        location: [extractedData.accidentLocation, extractedData.accidentCity].filter(Boolean).join(', ') || extractedData.accidentLocation,
        description: extractedData.accidentDescription || 'No description provided.',
        statuteOfLimitationsDate: solDate.toISOString().split('T')[0],
        vehicleInfo: {
          year: extractedData.vehicleYear || '',
          make: extractedData.vehicleMake || '',
          model: extractedData.vehicleModel || '',
          damage: extractedData.vehicleDamage || '',
        },
        parties: [
          ...trimmedClientNames.slice(1).map(name => ({ name, role: 'Plaintiff' as const })),
          ...(extractedData.defendantName ? [{ name: extractedData.defendantName, role: 'Defendant' as const }] : []),
        ],
        insurance: insuranceList,
        treatmentProviders: extractedData.treatmentProviders,
        status: CaseStatus.NEW,
        createdAt: new Date().toISOString(),
        referralSource: referralSource,
        documents: caseDocuments,
        extendedIntake,
        activityLog: [
          {
            id: Math.random().toString(36).substr(2, 9),
            type: 'system',
            message: `Case created via Document Extraction Intake. ${identifiedDocs.length} document(s) uploaded.${extractedData.retainerSigned ? ' Retainer verified as signed.' : ''}${extractedData.hipaaSigned ? ' HIPAA verified as signed.' : ''}`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      onSubmit(newCase);
      setIsSubmitting(false);
    }, 1000);
  };

  const extractionSteps = ['Upload Documents', 'Review & Submit'];
  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 transition-all shadow-sm";

  return (
    <div className={`animate-fade-in pb-20 mx-auto transition-all ${mode === 'extraction' && step === 2 ? 'max-w-7xl' : 'max-w-5xl'}`}>
      <button
        onClick={mode === 'extraction' && step === 2 && !isExtracting ? () => setStep(1) : onBack}
        disabled={isExtracting}
        className={`mb-6 flex items-center transition-colors font-medium ${isExtracting ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {mode === 'extraction' && step === 2 ? 'Back to Documents' : 'Back to Dashboard'}
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">New Client Intake</h3>
            <p className="text-sm text-slate-500">
              {mode === 'extraction'
                ? 'Upload documents and auto-extract client information'
                : 'Enter client information manually'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => handleModeSwitch('extraction')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === 'extraction'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
                Extraction
              </button>
              <button
                onClick={() => handleModeSwitch('manual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  mode === 'manual'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Manual
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Source:</label>
              <select
                className={inputClass + " !w-auto"}
                value={referralSource}
                onChange={e => setReferralSource(e.target.value)}
              >
                <option value="Agency Portal">Agency Portal</option>
                <option value="Google Ads">Google Ads</option>
                <option value="Organic Web">Organic Web</option>
                <option value="Social Media">Social Media</option>
                <option value="Billboard">Billboard</option>
                <option value="TV">TV</option>
                <option value="Radio">Radio</option>
                <option value="Attorney Referral">Attorney Referral</option>
                <option value="Past Client">Past Client</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {mode === 'extraction' && (
          <>
            <div className="px-8 pt-8">
              <div className="flex items-center justify-center gap-0 relative max-w-md mx-auto">
                <div className="absolute left-8 right-8 top-4 h-0.5 bg-slate-200 -z-10" />
                <div className="absolute left-8 top-4 h-0.5 bg-blue-500 -z-10 transition-all duration-500" style={{ width: step >= 2 ? '100%' : '0%', maxWidth: 'calc(100% - 64px)' }} />
                {extractionSteps.map((label, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center cursor-pointer group bg-white px-4 z-10"
                    onClick={() => {
                      if (isExtracting) return;
                      if (i === 0) setStep(1);
                      if (i === 1 && pendingDocs.length > 0 && hasClientName) handleProceedToReview();
                    }}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                      step > i + 1
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : step === i + 1
                        ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-50'
                        : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'
                    }`}>
                      {step > i + 1 ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : i + 1}
                    </div>
                    <span className={`text-xs mt-2 font-bold uppercase tracking-wider ${step === i + 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8">
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">
                      Client Name(s) <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-400 mb-3">
                      Enter the client name so the AI can identify them on the police report. Add additional clients for multi-party matters.
                    </p>
                    <div className="space-y-2 max-w-md">
                      {clientNames.map((name, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="relative flex-1">
                            {idx === 0 && (
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-500 uppercase tracking-wide pointer-events-none">Primary</span>
                            )}
                            <input
                              type="text"
                              className={inputClass + (idx === 0 ? ' !pl-[68px]' : '')}
                              placeholder={idx === 0 ? 'e.g. Jane Doe' : 'Additional client name'}
                              value={name}
                              onChange={e => {
                                const updated = [...clientNames];
                                updated[idx] = e.target.value;
                                setClientNames(updated);
                              }}
                            />
                          </div>
                          {idx > 0 && (
                            <button
                              onClick={() => setClientNames(clientNames.filter((_, i) => i !== idx))}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove client"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => setClientNames([...clientNames, ''])}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mt-1 px-1 py-1 hover:bg-blue-50 rounded transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Another Client
                      </button>
                    </div>
                  </div>
                  <DocumentUploadStep
                    documents={pendingDocs}
                    setDocuments={setPendingDocs}
                  />
                </div>
              )}

              {step === 2 && (
                <IntakeReviewStep
                  extractedData={extractedData}
                  setExtractedData={setExtractedData}
                  identifiedDocs={identifiedDocs}
                  isExtracting={isExtracting}
                  processingStatus={processingStatus}
                  liveExtractedData={liveExtractedData}
                  pendingDocs={pendingDocs}
                  scanningIndex={scanningIndex}
                  extractionPhase={extractionPhase}
                  completedScanCount={completedScanCount}
                />
              )}
            </div>

            <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-between flex-shrink-0">
              {step === 2 && !isExtracting ? (
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2.5 text-slate-600 font-bold hover:text-slate-900 transition-colors hover:bg-slate-200 rounded-lg"
                >
                  Back to Documents
                </button>
              ) : <div />}

              {step === 1 ? (
                <button
                  onClick={handleProceedToReview}
                  disabled={pendingDocs.length === 0 || !hasClientName}
                  className={`px-8 py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center ${
                    pendingDocs.length === 0 || !hasClientName
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
                  }`}
                >
                  Extract & Review
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              ) : !isExtracting ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={`px-8 py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center ${
                    isSubmitting
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating Case...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Submit Intake
                    </>
                  )}
                </button>
              ) : <div />}
            </div>
          </>
        )}

        {mode === 'manual' && (
          <div className="p-8">
            <ManualIntakeForm
              onSubmit={onSubmit}
              referralSource={referralSource}
            />
          </div>
        )}
      </div>
    </div>
  );
};
