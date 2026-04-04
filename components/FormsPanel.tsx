
import React, { useState } from 'react';
import { CaseFile, DocumentAttachment } from '../types';
import { DocumentGenerator, DocumentFormType } from './DocumentGenerator';

interface FormsPanelProps {
  caseData: CaseFile;
  onUpdateCase: (updatedCase: CaseFile) => void;
}

interface FormCategory {
  label: string;
  forms: { key: DocumentFormType; title: string; description: string; icon: string }[];
}

const FORM_CATEGORIES: FormCategory[] = [
  {
    label: 'Intake & Representation',
    forms: [
      { key: 'rep_lien', title: 'Letter of Representation & Lien', description: 'Notification to insurance carrier and attorney lien notice.', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { key: 'intake_summary', title: 'Client Intake Summary', description: 'Detailed form with accident, client, medical, and insurance info.', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
      { key: 'boss_intake_form', title: 'Boss Intake Form', description: 'Auto-populated intake spreadsheet with all case data.', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    ],
  },
  {
    label: 'Records & Authorization',
    forms: [
      { key: 'hipaa_auth', title: 'HIPAA Authorization', description: 'Patient authorization for release of health information.', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
      { key: 'bill_request', title: 'Medical Records & Bills Request', description: 'Request for medical records and billing from a provider.', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
      { key: 'records_request', title: 'Records Request', description: 'General records request letter to a provider.', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
      { key: 'foia', title: 'FOIA / Crash Report Request', description: 'Freedom of information request for crash report documentation.', icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
    ],
  },
  {
    label: 'Evidence & Financials',
    forms: [
      { key: 'preservation_of_evidence', title: 'Preservation of Evidence', description: 'Demand to preserve evidence related to the case.', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
      { key: 'distribution_sheet', title: 'Distribution Sheet', description: 'Settlement distribution breakdown for all parties.', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    ],
  },
];

const FORM_TITLE_MAP: Record<DocumentFormType, string> = {
  rep_lien: 'Letter of Representation & Lien',
  foia: 'FOIA / Crash Report Request',
  intake_summary: 'Intake Summary',
  boss_intake_form: 'Boss Intake Form',
  bill_request: 'Medical Records & Bills Request',
  records_request: 'Records Request',
  hipaa_auth: 'HIPAA Authorization',
  er_bill_request: 'ER Records & Bills Request',
  er_records_request: 'ER Records Request',
  distribution_sheet: 'Distribution Sheet',
  preservation_of_evidence: 'Preservation of Evidence',
  medical_bill_request: 'Medical Records & Bills Request',
};

export const FormsPanel: React.FC<FormsPanelProps> = ({ caseData, onUpdateCase }) => {
  const [activeForm, setActiveForm] = useState<DocumentFormType | null>(null);
  const [viewingGenerated, setViewingGenerated] = useState<DocumentFormType | null>(null);

  const generatedDocs = caseData.documents.filter(d => d.generatedFormType);

  const getGeneratedForType = (formType: DocumentFormType) =>
    generatedDocs.filter(d => d.generatedFormType === formType);

  const handleSaveToDocuments = (docName: string, docFormType: DocumentFormType) => {
    const newDoc: DocumentAttachment = {
      type: 'other',
      fileData: null,
      fileName: `${docName} — ${caseData.clientName} — ${new Date().toISOString().split('T')[0]}.pdf`,
      mimeType: 'application/pdf',
      source: 'Generated',
      category: 'intake',
      generatedFormType: docFormType,
      uploadedAt: new Date().toISOString(),
    };
    onUpdateCase({ ...caseData, documents: [...caseData.documents, newDoc] });
  };

  const handleDeleteGenerated = (doc: DocumentAttachment) => {
    if (!confirm(`Remove "${doc.fileName}" from saved documents?`)) return;
    onUpdateCase({
      ...caseData,
      documents: caseData.documents.filter(d => d !== doc),
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="animate-fade-in p-8 bg-white rounded-2xl border border-stone-200 min-h-[400px]">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-stone-900">Legal Forms & Documents</h3>
            <p className="text-sm text-stone-500 mt-1">Generate, preview, and manage case documents</p>
          </div>
          {generatedDocs.length > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span className="text-sm font-medium">{generatedDocs.length} saved</span>
            </div>
          )}
        </div>

        {generatedDocs.length > 0 && (
          <div className="mb-10">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Saved / Generated Documents</h4>
            <div className="bg-stone-50 rounded-xl border border-stone-200 divide-y divide-stone-200">
              {generatedDocs.map((doc, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-100 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{FORM_TITLE_MAP[doc.generatedFormType as DocumentFormType] || doc.generatedFormType}</p>
                      <p className="text-xs text-stone-400">{formatDate(doc.uploadedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setViewingGenerated(doc.generatedFormType as DocumentFormType)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:border-blue-200 transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteGenerated(doc)}
                      className="text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 hover:border-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-8">
          {FORM_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{cat.label}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.forms.map(form => {
                  const generated = getGeneratedForType(form.key);
                  return (
                    <button
                      key={form.key}
                      onClick={() => setActiveForm(form.key)}
                      className="text-left bg-white rounded-xl border border-stone-200 p-5 hover:border-blue-300 hover:shadow-md transition-all group relative"
                    >
                      {generated.length > 0 && (
                        <div className="absolute top-3 right-3">
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-100">
                            {generated.length}x saved
                          </span>
                        </div>
                      )}
                      <div className="w-10 h-10 rounded-lg bg-stone-100 group-hover:bg-blue-50 flex items-center justify-center mb-3 transition-colors">
                        <svg className="w-5 h-5 text-stone-500 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={form.icon} />
                        </svg>
                      </div>
                      <h5 className="text-sm font-bold text-stone-800 mb-1">{form.title}</h5>
                      <p className="text-xs text-stone-500 leading-relaxed">{form.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <DocumentGenerator
        isOpen={activeForm !== null}
        onClose={() => setActiveForm(null)}
        caseData={caseData}
        formType={activeForm}
        onSaveToDocuments={handleSaveToDocuments}
      />

      <DocumentGenerator
        isOpen={viewingGenerated !== null}
        onClose={() => setViewingGenerated(null)}
        caseData={caseData}
        formType={viewingGenerated}
      />
    </div>
  );
};
