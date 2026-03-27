import React, { useState } from 'react';
import { CaseFile, DocumentCategory, DocumentAttachment, DOCUMENT_CATEGORY_LABELS, TaskStatus } from '../types';

export interface AIDocAction {
  actionType: string;
  title: string;
  description: string;
  priority: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  taskType?: string;
}

export interface AIDocAnalysis {
  docIndex: number;
  fileName: string;
  summary: string;
  suggestedCategory: string;
  actions: AIDocAction[];
  extractedData: Record<string, string>;
}

interface DocumentActionPanelProps {
  analyses: AIDocAnalysis[];
  caseData: CaseFile;
  onUpdateCase: (updated: CaseFile) => void;
  onDismiss: () => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-rose-50 border-rose-200 text-rose-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  low: 'bg-slate-50 border-slate-200 text-slate-700',
};

const PRIORITY_BADGES: Record<string, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const ACTION_ICONS: Record<string, string> = {
  update_adjuster: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  complete_task: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  update_claim_number: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
  update_insurance_info: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  update_coverage_status: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z',
  update_liability_status: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  update_policy_limits: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  general_note: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  update_intake_field: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
};

function addActivity(c: CaseFile, message: string): CaseFile {
  const log = {
    id: Math.random().toString(36).substr(2, 9),
    type: 'system' as const,
    message,
    timestamp: new Date().toISOString(),
  };
  return { ...c, activityLog: [log, ...(c.activityLog || [])] };
}

export const DocumentActionPanel: React.FC<DocumentActionPanelProps> = ({
  analyses,
  caseData,
  onUpdateCase,
  onDismiss,
}) => {
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const [expandedDoc, setExpandedDoc] = useState<number | null>(analyses.length === 1 ? 0 : null);

  const totalActions = analyses.reduce((sum, a) => sum + a.actions.length, 0);
  const hasActions = totalActions > 0;

  const applyAction = (analysisIdx: number, actionIdx: number, action: AIDocAction, analysis: AIDocAnalysis) => {
    const actionKey = `${analysisIdx}-${actionIdx}`;
    if (appliedActions.has(actionKey)) return;

    let updated = { ...caseData };
    const nowISO = new Date().toISOString();

    switch (action.actionType) {
      case 'update_adjuster': {
        const extracted = analysis.extractedData;
        const newAdjuster = {
          id: Math.random().toString(36).substr(2, 9),
          name: extracted.adjusterName || action.newValue || 'Unknown',
          phone: extracted.adjusterPhone || '',
          email: extracted.adjusterEmail || '',
          isPrimary: true,
          insuranceType: 'Defendant' as const,
          insuranceProvider: extracted.insuranceCompany || '',
          addedDate: nowISO,
        };

        const existingAdj = (updated.adjusters || []).map(a => ({ ...a, isPrimary: false }));
        updated = { ...updated, adjusters: [...existingAdj, newAdjuster] };
        updated = addActivity(updated, `Adjuster updated to ${newAdjuster.name}${newAdjuster.phone ? ` (${newAdjuster.phone})` : ''} -- detected from uploaded document`);
        break;
      }

      case 'complete_task': {
        if (action.taskType) {
          updated.tasks = (updated.tasks || []).map(t => {
            if (t.type === action.taskType && t.status !== 'completed') {
              return { ...t, status: 'completed' as TaskStatus, completedDate: nowISO };
            }
            return t;
          });
          updated = addActivity(updated, `Task auto-completed: ${action.title} -- detected from uploaded document`);

          if (action.taskType === 'lor_defendant' && !updated.lorDefendantSentDate) {
            updated.lorDefendantSentDate = nowISO.split('T')[0];
          }
          if (action.taskType === 'lor_client_ins' && !updated.lorClientInsSentDate) {
            updated.lorClientInsSentDate = nowISO.split('T')[0];
          }
        }
        break;
      }

      case 'update_claim_number': {
        const extracted = analysis.extractedData;
        if (extracted.claimNumber && updated.insurance?.length) {
          updated.insurance = updated.insurance.map(ins => {
            if (ins.type === 'Defendant') {
              return { ...ins, claimNumber: extracted.claimNumber };
            }
            return ins;
          });
          updated = addActivity(updated, `Claim number updated to ${extracted.claimNumber} -- detected from uploaded document`);
        }
        break;
      }

      case 'update_coverage_status': {
        const decision = analysis.extractedData?.coverageDecision;
        if (decision && updated.insurance?.length) {
          const statusMap: Record<string, string> = {
            accepted: 'Accepted',
            denied: 'Denied',
            pending: 'Pending',
          };
          const newStatus = statusMap[decision.toLowerCase()] || decision;
          updated.insurance = updated.insurance.map(ins => {
            if (ins.type === 'Defendant') {
              return { ...ins, coverageStatus: newStatus as any, coverageStatusDate: nowISO.split('T')[0] };
            }
            return ins;
          });
          updated = addActivity(updated, `Coverage status updated to "${newStatus}" -- detected from uploaded document`);
        }
        break;
      }

      case 'update_liability_status': {
        const decision = analysis.extractedData?.liabilityDecision;
        if (decision && updated.insurance?.length) {
          const statusMap: Record<string, string> = {
            accepted: 'Accepted',
            denied: 'Denied',
            disputed: 'Disputed',
          };
          const newStatus = statusMap[decision.toLowerCase()] || decision;
          updated.insurance = updated.insurance.map(ins => {
            if (ins.type === 'Defendant') {
              return { ...ins, liabilityStatus: newStatus as any, liabilityStatusDate: nowISO.split('T')[0] };
            }
            return ins;
          });
          updated = addActivity(updated, `Liability status updated to "${newStatus}" -- detected from uploaded document`);
        }
        break;
      }

      case 'update_policy_limits': {
        const limits = analysis.extractedData?.policyLimitsAmount;
        if (limits && updated.insurance?.length) {
          updated.insurance = updated.insurance.map(ins => {
            if (ins.type === 'Defendant') {
              return {
                ...ins,
                policyLimitsAmount: limits,
                policyLimitsStatus: 'Received' as any,
                policyLimitsReceivedDate: nowISO.split('T')[0],
              };
            }
            return ins;
          });
          updated = addActivity(updated, `Policy limits updated to ${limits} -- detected from uploaded document`);
        }
        break;
      }

      default: {
        updated = addActivity(updated, `AI note: ${action.title} -- ${action.description}`);
        break;
      }
    }

    if (analysis.suggestedCategory) {
      const validCategories = Object.keys(DOCUMENT_CATEGORY_LABELS);
      if (validCategories.includes(analysis.suggestedCategory)) {
        const docs = [...updated.documents];
        if (docs[analysis.docIndex] && !docs[analysis.docIndex].category) {
          docs[analysis.docIndex] = {
            ...docs[analysis.docIndex],
            category: analysis.suggestedCategory as DocumentCategory,
          };
          updated = { ...updated, documents: docs };
        }
      }
    }

    onUpdateCase(updated);
    setAppliedActions(prev => new Set([...prev, actionKey]));
  };

  const applyAllForAnalysis = (analysisIdx: number, analysis: AIDocAnalysis) => {
    let updated = { ...caseData };
    const nowISO = new Date().toISOString();
    const newApplied = new Set(appliedActions);

    analysis.actions.forEach((action, actionIdx) => {
      const actionKey = `${analysisIdx}-${actionIdx}`;
      if (newApplied.has(actionKey)) return;

      switch (action.actionType) {
        case 'update_adjuster': {
          const extracted = analysis.extractedData;
          const newAdjuster = {
            id: Math.random().toString(36).substr(2, 9),
            name: extracted.adjusterName || action.newValue || 'Unknown',
            phone: extracted.adjusterPhone || '',
            email: extracted.adjusterEmail || '',
            isPrimary: true,
            insuranceType: 'Defendant' as const,
            insuranceProvider: extracted.insuranceCompany || '',
            addedDate: nowISO,
          };
          const existingAdj = (updated.adjusters || []).map(a => ({ ...a, isPrimary: false }));
          updated = { ...updated, adjusters: [...existingAdj, newAdjuster] };
          updated = addActivity(updated, `Adjuster updated to ${newAdjuster.name} -- detected from uploaded document`);
          break;
        }
        case 'complete_task': {
          if (action.taskType) {
            updated.tasks = (updated.tasks || []).map(t =>
              t.type === action.taskType && t.status !== 'completed'
                ? { ...t, status: 'completed' as TaskStatus, completedDate: nowISO }
                : t
            );
            updated = addActivity(updated, `Task auto-completed: ${action.title}`);
            if (action.taskType === 'lor_defendant') updated.lorDefendantSentDate = updated.lorDefendantSentDate || nowISO.split('T')[0];
            if (action.taskType === 'lor_client_ins') updated.lorClientInsSentDate = updated.lorClientInsSentDate || nowISO.split('T')[0];
          }
          break;
        }
        case 'update_claim_number': {
          const cn = analysis.extractedData?.claimNumber;
          if (cn && updated.insurance?.length) {
            updated.insurance = updated.insurance.map(ins =>
              ins.type === 'Defendant' ? { ...ins, claimNumber: cn } : ins
            );
            updated = addActivity(updated, `Claim number updated to ${cn}`);
          }
          break;
        }
        default: {
          updated = addActivity(updated, `AI note: ${action.title} -- ${action.description}`);
        }
      }
      newApplied.add(actionKey);
    });

    if (analysis.suggestedCategory) {
      const validCategories = Object.keys(DOCUMENT_CATEGORY_LABELS);
      if (validCategories.includes(analysis.suggestedCategory)) {
        const docs = [...updated.documents];
        if (docs[analysis.docIndex] && !docs[analysis.docIndex].category) {
          docs[analysis.docIndex] = { ...docs[analysis.docIndex], category: analysis.suggestedCategory as DocumentCategory };
          updated = { ...updated, documents: docs };
        }
      }
    }

    onUpdateCase(updated);
    setAppliedActions(newApplied);
  };

  if (!hasActions && analyses.every(a => !a.summary)) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-blue-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">AI Document Analysis</h3>
              <p className="text-xs text-slate-500">
                {totalActions > 0
                  ? `${totalActions} recommended action${totalActions !== 1 ? 's' : ''} found`
                  : 'Document analyzed -- no actions needed'}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {analyses.map((analysis, aIdx) => {
          const isExpanded = expandedDoc === aIdx;
          const allApplied = analysis.actions.every((_, idx) => appliedActions.has(`${aIdx}-${idx}`));

          return (
            <div key={aIdx}>
              <button
                onClick={() => setExpandedDoc(isExpanded ? null : aIdx)}
                className="w-full px-6 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
              >
                <svg className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{analysis.fileName}</p>
                  {analysis.summary && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{analysis.summary}</p>
                  )}
                </div>
                {analysis.actions.length > 0 && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {allApplied ? (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Applied
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {analysis.actions.length} action{analysis.actions.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}
              </button>

              {isExpanded && (
                <div className="px-6 pb-4">
                  {analysis.summary && (
                    <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-600">{analysis.summary}</p>
                    </div>
                  )}

                  {Object.keys(analysis.extractedData || {}).filter(k => analysis.extractedData[k]).length > 0 && (
                    <div className="mb-3 p-3 bg-cyan-50 rounded-xl border border-cyan-100">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-700 mb-2">Extracted Information</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {Object.entries(analysis.extractedData).filter(([, v]) => v).map(([key, value]) => (
                          <div key={key} className="flex items-baseline gap-1.5">
                            <span className="text-[10px] text-cyan-600 font-medium capitalize whitespace-nowrap">
                              {key.replace(/([A-Z])/g, ' $1').trim()}:
                            </span>
                            <span className="text-xs text-slate-700 truncate">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {analysis.actions.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Recommended Actions</p>
                        {!allApplied && analysis.actions.length > 1 && (
                          <button
                            onClick={() => applyAllForAnalysis(aIdx, analysis)}
                            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Apply All
                          </button>
                        )}
                      </div>
                      {analysis.actions.map((action, actIdx) => {
                        const actionKey = `${aIdx}-${actIdx}`;
                        const isApplied = appliedActions.has(actionKey);
                        const priority = action.priority || 'medium';
                        const iconPath = ACTION_ICONS[action.actionType] || ACTION_ICONS.general_note;

                        return (
                          <div
                            key={actIdx}
                            className={`p-3 rounded-xl border transition-all ${
                              isApplied ? 'bg-emerald-50 border-emerald-200' : PRIORITY_STYLES[priority]
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isApplied ? 'bg-emerald-100' : 'bg-white/80'
                              }`}>
                                {isApplied ? (
                                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className={`text-sm font-semibold ${isApplied ? 'text-emerald-800' : 'text-slate-800'}`}>
                                    {action.title}
                                  </p>
                                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${PRIORITY_BADGES[priority]}`}>
                                    {priority}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600">{action.description}</p>
                                {action.oldValue && action.newValue && (
                                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                                    <span className="text-slate-400 line-through">{action.oldValue}</span>
                                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                    <span className="font-medium text-blue-700">{action.newValue}</span>
                                  </div>
                                )}
                              </div>
                              {!isApplied && (
                                <button
                                  onClick={() => applyAction(aIdx, actIdx, action, analysis)}
                                  className="flex-shrink-0 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                  Apply
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {analysis.actions.length === 0 && (
                    <p className="text-xs text-slate-400 italic">No actionable items detected in this document.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
