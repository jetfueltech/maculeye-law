import React from 'react';
import { CaseFile } from '../types';

interface DemandReadinessProps {
  caseData: CaseFile;
}

interface ChecklistItem {
  label: string;
  complete: boolean;
  detail?: string;
  critical?: boolean;
}

export const DemandReadiness: React.FC<DemandReadinessProps> = ({ caseData }) => {
  const defIns = (caseData.insurance || []).find(i => i.type === 'Defendant');

  const coverageConfirmed = defIns?.coverageStatus === 'accepted';
  const liabilityAccepted = defIns?.liabilityStatus === 'accepted';
  const policyLimitsObtained = defIns?.policyLimitsStatus === 'received';
  const treatmentComplete = !!caseData.treatmentEndDate;

  const erVisits = caseData.erVisits || [];
  const allERComplete = erVisits.length === 0 || erVisits.every(v => {
    const billsOk = v.bills.every(b => b.status === 'received' || b.status === 'na');
    const recordOk = v.recordStatus === 'received' || v.recordStatus === 'na';
    return billsOk && recordOk;
  });

  const providers = caseData.medicalProviders || [];
  const allProviderBills = providers.length === 0 || providers.every(p => p.totalCost !== undefined && p.totalCost > 0);

  const specialsReady = caseData.specials?.status === 'complete' || caseData.specials?.status === 'sent_to_attorney';

  const checklist: ChecklistItem[] = [
    { label: 'Coverage Confirmed', complete: coverageConfirmed, detail: defIns?.coverageStatus ? `Status: ${defIns.coverageStatus}` : 'No defendant insurance', critical: true },
    { label: 'Liability Accepted', complete: liabilityAccepted, detail: defIns?.liabilityStatus ? `Status: ${defIns.liabilityStatus}` : 'No defendant insurance', critical: true },
    { label: 'Policy Limits Obtained', complete: policyLimitsObtained, detail: defIns?.policyLimitsAmount || (defIns?.policyLimitsStatus ? `Status: ${defIns.policyLimitsStatus}` : 'Not requested') },
    { label: 'Treatment Completed', complete: treatmentComplete, detail: caseData.treatmentEndDate ? `Ended: ${new Date(caseData.treatmentEndDate).toLocaleDateString()}` : 'Ongoing or not set' },
    { label: 'All ER Records & Bills Received', complete: allERComplete, detail: erVisits.length === 0 ? 'No ER visits recorded' : `${erVisits.filter(v => v.bills.every(b => b.status === 'received' || b.status === 'na')).length}/${erVisits.length} visits complete`, critical: !allERComplete && erVisits.length > 0 },
    { label: 'All Provider Bills Received', complete: allProviderBills, detail: `${providers.filter(p => p.totalCost !== undefined && p.totalCost > 0).length}/${providers.length} providers with bills` },
    { label: 'Specials Package Compiled', complete: specialsReady, detail: caseData.specials ? `Status: ${caseData.specials.status}` : 'Not started' },
  ];

  const completedCount = checklist.filter(i => i.complete).length;
  const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  const isReady = checklist.every(i => i.complete);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              Demand Readiness
              {isReady && (
                <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Ready</span>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-1">{completedCount} of {checklist.length} requirements met</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress === 100 ? 'bg-emerald-500' : progress >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={`text-sm font-bold ${progress === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>{progress}%</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {checklist.map((item, idx) => (
          <div key={idx} className={`px-6 py-4 flex items-center gap-4 ${item.complete ? '' : item.critical ? 'bg-rose-50/30' : ''}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
              item.complete
                ? 'bg-emerald-500 text-white'
                : item.critical
                ? 'bg-rose-100 text-rose-400 border-2 border-rose-200'
                : 'bg-slate-100 text-slate-300 border-2 border-slate-200'
            }`}>
              {item.complete ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <span className="text-xs font-bold">{idx + 1}</span>
              )}
            </div>
            <div className="flex-1">
              <span className={`text-sm font-medium ${item.complete ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                {item.label}
              </span>
              {item.detail && (
                <p className="text-[11px] text-slate-400 mt-0.5">{item.detail}</p>
              )}
            </div>
            {!item.complete && item.critical && (
              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">Blocking</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
