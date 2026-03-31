import React, { useState } from 'react';
import { CaseFile, MedicalProvider, ERVisit, ActivityLog, DocumentAttachment } from '../types';
import { DocumentGenerator, DocumentFormType, DocumentContext } from './DocumentGenerator';
import { useAuth } from '../contexts/AuthContext';

export type WorkflowActionType =
  | 'lor_defendant'
  | 'lor_client_ins'
  | 'crash_report'
  | 'hipaa'
  | 'bill_request'
  | 'records_request'
  | 'er_bill_request'
  | 'er_records_request';

interface WorkflowActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: CaseFile;
  actionType: WorkflowActionType;
  provider?: MedicalProvider;
  erVisit?: ERVisit;
  onUpdateCase: (c: CaseFile) => void;
}

interface ActionConfig {
  title: string;
  description: string;
  docType: DocumentFormType;
  sentLabel: string;
  confirmLabel: string;
  icon: string;
}

const ACTION_CONFIG: Record<WorkflowActionType, ActionConfig> = {
  lor_defendant: {
    title: "Letter of Representation",
    description: "Generate and send LOR with Attorney's Lien to the defendant's insurance company.",
    docType: 'rep_lien',
    sentLabel: "LOR Sent to Defendant's Insurance",
    confirmLabel: "Mark LOR as Sent",
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  lor_client_ins: {
    title: "LOR — Client's Insurance",
    description: "Generate and send Letter of Representation to the client's own insurance company.",
    docType: 'rep_lien',
    sentLabel: "LOR Sent to Client's Insurance",
    confirmLabel: "Mark LOR as Sent",
    icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  crash_report: {
    title: "Crash Report / FOIA Request",
    description: "Generate and submit the FOIA request packet to obtain the official police crash report.",
    docType: 'foia',
    sentLabel: "Crash Report Requested",
    confirmLabel: "Mark as Submitted",
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  hipaa: {
    title: "HIPAA Authorization",
    description: "Generate the HIPAA authorization form for the client to sign, permitting release of medical records.",
    docType: 'hipaa_auth',
    sentLabel: "HIPAA Authorization Obtained",
    confirmLabel: "Mark as Signed & Filed",
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  },
  bill_request: {
    title: "Bill Request Letter",
    description: "Generate and send a formal bill request letter to the medical provider.",
    docType: 'bill_request',
    sentLabel: "Bill Request Sent",
    confirmLabel: "Mark as Sent",
    icon: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z',
  },
  records_request: {
    title: "Records Request Letter",
    description: "Generate and send a formal medical records request letter with HIPAA authorization.",
    docType: 'records_request',
    sentLabel: "Records Request Sent",
    confirmLabel: "Mark as Sent",
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z',
  },
  er_bill_request: {
    title: "ER Bill Request",
    description: "Generate and send a bill request letter to the ER / hospital facility.",
    docType: 'er_bill_request',
    sentLabel: "ER Bill Request Sent",
    confirmLabel: "Mark as Sent",
    icon: 'M19 14l-7 7m0 0l-7-7m7 7V3',
  },
  er_records_request: {
    title: "ER Records Request",
    description: "Generate and send a medical records request to the ER / hospital facility.",
    docType: 'er_records_request',
    sentLabel: "ER Records Request Sent",
    confirmLabel: "Mark as Sent",
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
};

function addActivity(c: CaseFile, message: string, author?: string): CaseFile {
  const log: ActivityLog = {
    id: Math.random().toString(36).substr(2, 9),
    type: 'user',
    message,
    timestamp: new Date().toISOString(),
    author: author || 'System',
  };
  return { ...c, activityLog: [log, ...(c.activityLog || [])] };
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export const WorkflowActionModal: React.FC<WorkflowActionModalProps> = ({
  isOpen,
  onClose,
  caseData,
  actionType,
  provider,
  erVisit,
  onUpdateCase,
}) => {
  const { profile } = useAuth();
  const [showDoc, setShowDoc] = useState(false);
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [savedDoc, setSavedDoc] = useState(false);

  const authorName = profile?.full_name || profile?.email || 'Unknown User';

  if (!isOpen) return null;

  const cfg = ACTION_CONFIG[actionType];
  const defIns = (caseData.insurance || []).find(i => i.type === 'Defendant');
  const clientIns = (caseData.insurance || []).find(i => i.type === 'Client');

  const docContext: DocumentContext = {
    provider,
    erVisit,
    insuranceType: actionType === 'lor_client_ins' ? 'Client' : 'Defendant',
  };

  const applyUpdate = () => {
    setConfirming(true);
    let updated = { ...caseData };
    const todayStr = today();
    const nowISO = new Date().toISOString();

    switch (actionType) {
      case 'lor_defendant':
        updated = { ...updated, lorDefendantSentDate: todayStr };
        updated.tasks = (updated.tasks || []).map(t =>
          t.type === 'lor_defendant' && t.status !== 'completed'
            ? { ...t, status: 'completed' as const, completedDate: nowISO }
            : t
        );
        updated = addActivity(updated, `LOR sent to ${defIns?.provider || "defendant's insurance"}${notes ? ` — ${notes}` : ''}`, authorName);
        break;

      case 'lor_client_ins':
        updated = { ...updated, lorClientInsSentDate: todayStr };
        updated.tasks = (updated.tasks || []).map(t =>
          t.type === 'lor_client_ins' && t.status !== 'completed'
            ? { ...t, status: 'completed' as const, completedDate: nowISO }
            : t
        );
        updated = addActivity(updated, `LOR sent to ${clientIns?.provider || "client's insurance"}${notes ? ` — ${notes}` : ''}`, authorName);
        break;

      case 'crash_report':
        updated = { ...updated, crashReportRequestedDate: todayStr };
        updated.tasks = (updated.tasks || []).map(t =>
          t.type === 'crash_report_request' && t.status !== 'completed'
            ? { ...t, status: 'completed' as const, completedDate: nowISO }
            : t
        );
        updated = addActivity(updated, `Crash/police report requested via FOIA${notes ? ` — ${notes}` : ''}`, authorName);
        break;

      case 'hipaa':
        updated.tasks = (updated.tasks || []).map(t =>
          t.type === 'hipaa' && t.status !== 'completed'
            ? { ...t, status: 'completed' as const, completedDate: nowISO }
            : t
        );
        updated = addActivity(updated, `HIPAA authorization obtained${notes ? ` — ${notes}` : ''}`, authorName);
        break;

      case 'bill_request':
        if (provider) {
          updated.medicalProviders = (updated.medicalProviders || []).map(p =>
            p.id === provider.id
              ? { ...p, billRequestDate: todayStr, billRequestStatus: 'requested' as const }
              : p
          );
          updated = addActivity(updated, `Bill request sent to ${provider.name}${notes ? ` — ${notes}` : ''}`, authorName);
        }
        break;

      case 'records_request':
        if (provider) {
          updated.medicalProviders = (updated.medicalProviders || []).map(p =>
            p.id === provider.id
              ? { ...p, recordsRequestDate: todayStr, recordsRequestStatus: 'requested' as const }
              : p
          );
          updated = addActivity(updated, `Records request sent to ${provider.name}${notes ? ` — ${notes}` : ''}`, authorName);
        }
        break;

      case 'er_bill_request':
        if (erVisit) {
          updated.erVisits = (updated.erVisits || []).map(v =>
            v.id === erVisit.id
              ? {
                  ...v,
                  bills: v.bills.map(b =>
                    b.status === 'not_requested'
                      ? { ...b, status: 'requested' as const, requestDate: todayStr }
                      : b
                  ),
                }
              : v
          );
          updated = addActivity(updated, `ER bill request sent to ${erVisit.facilityName}${notes ? ` — ${notes}` : ''}`, authorName);
        }
        break;

      case 'er_records_request':
        if (erVisit) {
          updated.erVisits = (updated.erVisits || []).map(v =>
            v.id === erVisit.id
              ? { ...v, recordStatus: 'requested' as const, recordRequestDate: todayStr }
              : v
          );
          updated = addActivity(updated, `ER records request sent to ${erVisit.facilityName}${notes ? ` — ${notes}` : ''}`, authorName);
        }
        break;
    }

    onUpdateCase(updated);
    setTimeout(() => {
      setConfirming(false);
      onClose();
    }, 600);
  };

  const handleSaveToDocuments = (docName: string, docFormType: DocumentFormType) => {
    const DOC_TYPE_MAP: Record<string, DocumentAttachment['type']> = {
      rep_lien: 'other',
      foia: 'crash_report',
      bill_request: 'other',
      records_request: 'medical_record',
      hipaa_auth: 'authorization',
      er_bill_request: 'other',
      er_records_request: 'medical_record',
      intake_summary: 'other',
      boss_intake_form: 'other',
    };
    const newDoc: DocumentAttachment = {
      type: DOC_TYPE_MAP[docFormType] || 'other',
      fileData: null,
      fileName: `${docName} — ${caseData.clientName} — ${today()}.pdf`,
      mimeType: 'application/pdf',
      source: 'Generated',
      category: 'workflow_generated',
      linkedFacilityId: provider?.id || erVisit?.id,
      generatedFormType: docFormType,
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

  const recipientName =
    provider?.name ||
    erVisit?.facilityName ||
    (actionType === 'lor_client_ins' ? clientIns?.provider : defIns?.provider) ||
    null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="flex items-start justify-between p-6 border-b border-slate-100">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cfg.icon} />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">{cfg.title}</h3>
                {recipientName && (
                  <p className="text-sm text-blue-600 font-medium mt-0.5">{recipientName}</p>
                )}
                <p className="text-sm text-slate-500 mt-1">{cfg.description}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-2 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Client</span>
                <span className="font-semibold text-slate-800">{caseData.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date of Loss</span>
                <span className="font-semibold text-slate-800">{caseData.accidentDate}</span>
              </div>
              {recipientName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Recipient</span>
                  <span className="font-semibold text-slate-800">{recipientName}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes (optional)</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Add any notes about this correspondence..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setShowDoc(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                Preview & Print Document
              </button>
              <button
                onClick={applyUpdate}
                disabled={confirming}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  confirming
                    ? 'bg-emerald-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                {confirming ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    Done
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {cfg.confirmLabel}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="px-6 pb-4 space-y-2">
            {savedDoc && (
              <div className="flex items-center justify-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 rounded-lg py-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Document saved to case files
              </div>
            )}
            <p className="text-xs text-slate-400 text-center">
              Marking as sent will update the case workflow and log the activity
            </p>
          </div>
        </div>
      </div>

      <DocumentGenerator
        isOpen={showDoc}
        onClose={() => setShowDoc(false)}
        caseData={caseData}
        formType={cfg.docType}
        context={docContext}
        onSaveToDocuments={handleSaveToDocuments}
      />
    </>
  );
};
