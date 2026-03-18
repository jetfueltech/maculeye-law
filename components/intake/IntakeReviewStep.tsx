import React, { useState, useEffect, useRef } from 'react';
import { ExtractedIntakeData, IdentifiedDocument, EXTRACTED_FIELD_SECTIONS } from '../../services/documentExtractionService';
import { DocumentPreviewPanel } from './DocumentPreviewPanel';
import {
  ClientSection,
  AccidentSection,
  DefendantSection,
  InsuranceSection,
  VehicleSection,
  MedicalSection,
  EmploymentSection,
} from './IntakeFormSections';

interface IntakeReviewStepProps {
  extractedData: ExtractedIntakeData;
  setExtractedData: React.Dispatch<React.SetStateAction<ExtractedIntakeData>>;
  identifiedDocs: IdentifiedDocument[];
  isExtracting: boolean;
  processingStatus: string;
  liveExtractedData?: ExtractedIntakeData;
  pendingDocs?: { file: File; fileData: string; mimeType: string }[];
  scanningIndex?: number;
  extractionPhase?: boolean;
  completedScanCount?: number;
}

type SectionKey = 'client' | 'accident' | 'defendant' | 'insurance' | 'vehicle' | 'medical' | 'employment' | 'documents';

const DOC_TYPE_LABELS: Record<string, string> = {
  retainer: 'Retainer Agreement',
  crash_report: 'Police / Crash Report',
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
  email: 'bg-slate-50 text-slate-600 border-slate-200',
  other: 'bg-slate-50 text-slate-600 border-slate-200',
};

interface AnimatingField {
  key: string;
  targetValue: string;
  currentDisplay: string;
}

export const IntakeReviewStep: React.FC<IntakeReviewStepProps> = ({
  extractedData,
  setExtractedData,
  identifiedDocs,
  isExtracting,
  processingStatus,
  liveExtractedData,
  pendingDocs,
  scanningIndex,
  extractionPhase,
  completedScanCount,
}) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('client');
  const [previewOpen, setPreviewOpen] = useState(true);
  const [previewDoc, setPreviewDoc] = useState<IdentifiedDocument | null>(null);
  const [animatingFields, setAnimatingFields] = useState<Map<string, AnimatingField>>(new Map());
  const [recentlyFilledFields, setRecentlyFilledFields] = useState<Set<string>>(new Set());
  const prevExtractedRef = useRef<ExtractedIntakeData>({});
  const animationTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const sectionForField = (key: string): SectionKey | null => {
    for (const [sectionKey, sectionDef] of Object.entries(EXTRACTED_FIELD_SECTIONS)) {
      if (sectionDef.fields.includes(key)) return sectionKey as SectionKey;
    }
    return null;
  };

  useEffect(() => {
    return () => {
      animationTimersRef.current.forEach(t => clearTimeout(t));
      animationTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!liveExtractedData || !isExtracting) return;

    const prev = prevExtractedRef.current;
    const newEntries = Object.entries(liveExtractedData).filter(([key, value]) => {
      if (value === undefined || value === null || value === '') return false;
      return (prev as any)[key] !== value;
    });

    if (newEntries.length === 0) return;
    prevExtractedRef.current = { ...liveExtractedData };

    const firstNewSection = newEntries.reduce<SectionKey | null>((found, [key]) => {
      if (found) return found;
      return sectionForField(key);
    }, null);
    if (firstNewSection && firstNewSection !== activeSection) {
      setActiveSection(firstNewSection);
    }

    newEntries.forEach(([key, value]) => {
      const existingTimer = animationTimersRef.current.get(key);
      if (existingTimer) clearTimeout(existingTimer);
      const existingStartTimer = animationTimersRef.current.get(`start-${key}`);
      if (existingStartTimer) clearTimeout(existingStartTimer);

      if (typeof value === 'boolean') {
        setExtractedData(p => ({ ...p, [key]: value }));
        setRecentlyFilledFields(s => new Set(s).add(key));
        setTimeout(() => setRecentlyFilledFields(s => { const n = new Set(s); n.delete(key); return n; }), 3000);
        return;
      }

      const strValue = String(value);
      setAnimatingFields(m => {
        const nm = new Map(m);
        nm.set(key, { key, targetValue: strValue, currentDisplay: '' });
        return nm;
      });

      let charIndex = 0;
      const typeChar = () => {
        if (charIndex >= strValue.length) {
          animationTimersRef.current.delete(key);
          setAnimatingFields(m => { const nm = new Map(m); nm.delete(key); return nm; });
          setExtractedData(p => ({ ...p, [key]: strValue }));
          setRecentlyFilledFields(s => new Set(s).add(key));
          setTimeout(() => setRecentlyFilledFields(s => { const n = new Set(s); n.delete(key); return n; }), 3000);
          return;
        }
        const charsPerTick = Math.max(1, Math.floor(strValue.length / 30));
        charIndex = Math.min(charIndex + charsPerTick, strValue.length);
        setAnimatingFields(m => {
          const nm = new Map(m);
          nm.set(key, { key, targetValue: strValue, currentDisplay: strValue.substring(0, charIndex) });
          return nm;
        });
        const timer = setTimeout(typeChar, 20 + Math.random() * 30);
        animationTimersRef.current.set(key, timer);
      };

      const startTimer = setTimeout(typeChar, 80);
      animationTimersRef.current.set(`start-${key}`, startTimer);
    });
  }, [liveExtractedData, isExtracting]);

  const updateField = (field: keyof ExtractedIntakeData, value: string | boolean) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
  };

  const getFieldValue = (key: string): string => {
    const anim = animatingFields.get(key);
    if (anim) return anim.currentDisplay;
    return (extractedData as any)[key] || '';
  };

  const getBoolValue = (key: string): boolean => {
    return !!(extractedData as any)[key];
  };

  const getFieldStyle = (key: string): string => {
    if (animatingFields.has(key)) return 'ring-2 ring-blue-300 bg-blue-50/30 border-blue-200';
    if (recentlyFilledFields.has(key)) return 'ring-1 ring-emerald-300 bg-emerald-50/30 border-emerald-200';
    const val = (extractedData as any)[key];
    if (val && typeof val === 'string' && val.trim()) return 'ring-1 ring-emerald-200 bg-emerald-50/20';
    if (val === true) return 'ring-1 ring-emerald-200 bg-emerald-50/20';
    return '';
  };

  const isFieldAnimating = (key: string): boolean => animatingFields.has(key);

  const openPreview = (doc?: IdentifiedDocument) => {
    setPreviewOpen(true);
    setPreviewDoc(doc || identifiedDocs[0] || null);
  };

  const closePreview = () => { setPreviewOpen(false); setPreviewDoc(null); };

  const activeDocForScan = (scanningIndex !== undefined && scanningIndex >= 0 && pendingDocs)
    ? pendingDocs[scanningIndex] : null;

  const totalSteps = (pendingDocs?.length || 0) + 1;
  const currentStep = extractionPhase ? (pendingDocs?.length || 0) : (completedScanCount || 0);
  const progress = Math.round((currentStep / totalSteps) * 100);

  const sectionProps = { data: extractedData, getFieldValue, getFieldStyle, isAnimating: isFieldAnimating, updateField, getBoolValue };

  const countFilledInSection = (sectionKey: string): number => {
    const def = EXTRACTED_FIELD_SECTIONS[sectionKey];
    if (!def) return 0;
    return def.fields.filter(f => {
      const v = (extractedData as any)[f];
      return v !== undefined && v !== null && v !== '' && v !== false;
    }).length;
  };

  const sections: { key: SectionKey; label: string; icon: string }[] = [
    { key: 'client', label: 'Client', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
    { key: 'accident', label: 'Accident', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
    { key: 'defendant', label: 'Defendant', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' },
    { key: 'insurance', label: 'Insurance', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { key: 'vehicle', label: 'Vehicle', icon: 'M8 7h12l2 5-4 4H6l-4-4 2-5h4zm0 0V3h8v4' },
    { key: 'medical', label: 'Medical', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
    { key: 'employment', label: 'Employment', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { key: 'documents', label: 'Documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  const totalFields = Object.entries(extractedData)
    .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
    .length;

  const renderScanStatus = () => {
    if (!isExtracting) return null;
    return (
      <div className="mb-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-white animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">AI Agent Scanning</span>
              <span className="text-[10px] text-slate-400">{progress}%</span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{processingStatus}</p>
          </div>
          {totalFields > 0 && (
            <div className="px-2 py-1 bg-emerald-50 rounded-full border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-700">{totalFields} fields</span>
            </div>
          )}
        </div>
        <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      </div>
    );
  };

  const renderFormContent = () => {
    switch (activeSection) {
      case 'client': return <ClientSection {...sectionProps} />;
      case 'accident': return <AccidentSection {...sectionProps} />;
      case 'defendant': return <DefendantSection {...sectionProps} />;
      case 'insurance': return <InsuranceSection {...sectionProps} />;
      case 'vehicle': return <VehicleSection {...sectionProps} />;
      case 'medical': return <MedicalSection {...sectionProps} />;
      case 'employment': return <EmploymentSection {...sectionProps} />;
      case 'documents': return renderDocumentsSection();
      default: return null;
    }
  };

  const renderDocumentsSection = () => (
    <div className="space-y-4 animate-fade-in">
      <p className="text-sm text-slate-500">{identifiedDocs.length} document{identifiedDocs.length !== 1 ? 's' : ''} attached.</p>
      {(extractedData.retainerSigned || extractedData.hipaaSigned) && (
        <div className="flex gap-3 mb-4">
          {extractedData.retainerSigned && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${recentlyFilledFields.has('retainerSigned') ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Retainer Signed
            </div>
          )}
          {extractedData.hipaaSigned && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${recentlyFilledFields.has('hipaaSigned') ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              HIPAA Signed
            </div>
          )}
        </div>
      )}
      {identifiedDocs.map((doc, i) => {
        const isImage = doc.mimeType.includes('image');
        return (
          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors group/doc">
            {isImage && doc.fileData ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 bg-white">
                <img src={doc.fileData} alt={doc.suggestedName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.mimeType.includes('pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{doc.suggestedName}</p>
              <p className="text-[10px] text-slate-400">{doc.file.name}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${DOC_TYPE_COLORS[doc.identifiedType] || DOC_TYPE_COLORS.other}`}>
              {DOC_TYPE_LABELS[doc.identifiedType] || 'Other'}
            </span>
            <button onClick={() => openPreview(doc)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all opacity-0 group-hover/doc:opacity-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Preview
            </button>
          </div>
        );
      })}
      {isExtracting && identifiedDocs.length === 0 && (
        <div className="py-8 text-center">
          <div className="flex gap-1.5 justify-center mb-3">{[0, 1, 2].map(i => (<div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />))}</div>
          <p className="text-xs text-slate-400">Documents being identified...</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes scanDown {
          0% { top: -2%; }
          50% { top: 98%; }
          100% { top: -2%; }
        }
      `}</style>

      {!isExtracting && (
        <div className="text-center max-w-2xl mx-auto mb-2">
          <h4 className="text-xl font-bold text-slate-800 mb-2">Review & Complete Intake</h4>
          <p className="text-sm text-slate-500 leading-relaxed">
            {totalFields > 0
              ? `Extracted ${totalFields} fields from your documents. Review, complete any missing information, and submit.`
              : 'Fill in the client intake information below.'}
          </p>
        </div>
      )}

      {isExtracting && (
        <div className="text-center max-w-2xl mx-auto mb-2">
          <h4 className="text-xl font-bold text-slate-800 mb-2">AI Agent Extracting Data</h4>
          <p className="text-sm text-slate-500 leading-relaxed">
            Watch as the AI scans your documents and fills in the intake form fields in real time.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
          {sections.map(s => {
            const count = s.key === 'documents' ? identifiedDocs.length : countFilledInSection(s.key);
            return (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  activeSection === s.key
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg>
                {s.label}
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeSection === s.key ? 'bg-blue-500 text-white' : 'bg-emerald-100 text-emerald-700'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {(identifiedDocs.length > 0 || isExtracting) && (
          <button
            onClick={() => previewOpen ? closePreview() : openPreview()}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              previewOpen ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            {previewOpen ? 'Hide Docs' : 'Show Docs'}
          </button>
        )}
      </div>

      <div className="flex gap-6 transition-all">
        <div className={`transition-all ${previewOpen ? 'w-1/2 flex-shrink-0' : 'w-full'}`}>
          {renderScanStatus()}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-h-[calc(100vh-320px)] overflow-y-auto">
            {renderFormContent()}
          </div>
        </div>

        {previewOpen && (
          <div className="w-1/2 flex-shrink-0 sticky top-0" style={{ minHeight: '500px', maxHeight: 'calc(100vh - 200px)' }}>
            {identifiedDocs.length > 0 ? (
              <DocumentPreviewPanel documents={identifiedDocs} activeDoc={previewDoc} onSelectDoc={setPreviewDoc} onClose={closePreview} />
            ) : isExtracting && pendingDocs && pendingDocs.length > 0 ? (
              <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg className="w-4 h-4 text-blue-500 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Scanning Documents</h3>
                  </div>
                  <button onClick={closePreview} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex gap-1.5 px-3 py-2 border-b border-slate-100 overflow-x-auto flex-shrink-0">
                  {pendingDocs.map((doc, i) => {
                    const identified = identifiedDocs[i];
                    const isDone = !!identified;
                    const isActive = i === scanningIndex;
                    return (
                      <div key={i} className={`flex-shrink-0 flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all ${isActive ? 'bg-blue-50 ring-2 ring-blue-300' : isDone ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'opacity-50'}`}>
                        <div className="relative w-10 h-12 rounded overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                          {doc.mimeType.includes('image') && doc.fileData ? (
                            <img src={doc.fileData} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <svg className={`w-4 h-4 ${doc.mimeType.includes('pdf') ? 'text-red-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          )}
                          {isDone && (
                            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center"><div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg></div></div>
                          )}
                          {isActive && <div className="absolute inset-0 border-2 border-blue-400 rounded animate-pulse" />}
                        </div>
                        <span className="text-[9px] font-medium text-slate-500 max-w-[48px] truncate">
                          {isDone ? (DOC_TYPE_LABELS[identified!.identifiedType]?.split(' ')[0] || 'Doc') : isActive ? 'Scanning' : 'Waiting'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-3">
                  {activeDocForScan ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                      {activeDocForScan.mimeType.includes('image') && activeDocForScan.fileData ? (
                        <img src={activeDocForScan.fileData} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-md" />
                      ) : activeDocForScan.mimeType.includes('pdf') && activeDocForScan.fileData ? (
                        <iframe src={activeDocForScan.fileData} className="w-full h-full min-h-[300px] rounded-lg border border-slate-200 bg-white" title="Scanning document" />
                      ) : (
                        <div className="flex flex-col items-center gap-3 p-6">
                          <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          <p className="text-xs text-slate-400">{activeDocForScan.file.name}</p>
                        </div>
                      )}
                      <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden rounded-lg z-10">
                        <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_3px_rgba(59,130,246,0.5)]" style={{ animation: 'scanDown 2.5s ease-in-out infinite' }} />
                      </div>
                    </div>
                  ) : extractionPhase ? (
                    <div className="text-center py-8">
                      <svg className="w-12 h-12 text-blue-400 animate-pulse mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                      <p className="text-sm font-medium text-slate-600">Cross-referencing documents</p>
                      <p className="text-xs text-slate-400 mt-1">Extracting case information...</p>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">{[0, 1, 2].map(i => (<div key={i} className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />))}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-white rounded-2xl border border-slate-200 p-12">
                <svg className="w-12 h-12 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-sm text-slate-400">No documents to preview</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
