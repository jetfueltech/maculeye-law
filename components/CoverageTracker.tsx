import React, { useState } from 'react';
import { CaseFile, Insurance, CoverageStatusType, LiabilityStatusType, PolicyLimitsStatusType, ActivityLog } from '../types';

interface CoverageTrackerProps {
  caseData: CaseFile;
  onUpdateCase: (c: CaseFile) => void;
}

const COVERAGE_LABELS: Record<CoverageStatusType, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  denied: 'Denied',
  under_investigation: 'Under Investigation',
};

const LIABILITY_LABELS: Record<LiabilityStatusType, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  denied: 'Denied',
  disputed: 'Disputed',
};

const POLICY_LIMITS_LABELS: Record<PolicyLimitsStatusType, string> = {
  not_requested: 'Not Requested',
  requested: 'Requested',
  received: 'Received',
  na: 'N/A',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  denied: 'bg-rose-50 text-rose-700 border-rose-200',
  under_investigation: 'bg-blue-50 text-blue-700 border-blue-200',
  disputed: 'bg-orange-50 text-orange-700 border-orange-200',
  not_requested: 'bg-slate-50 text-slate-600 border-slate-200',
  requested: 'bg-blue-50 text-blue-700 border-blue-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  na: 'bg-slate-50 text-slate-400 border-slate-200',
};

function addActivity(c: CaseFile, message: string): CaseFile {
  const log: ActivityLog = {
    id: Math.random().toString(36).substr(2, 9),
    type: 'system',
    message,
    timestamp: new Date().toISOString(),
  };
  return { ...c, activityLog: [log, ...(c.activityLog || [])] };
}

export const CoverageTracker: React.FC<CoverageTrackerProps> = ({ caseData, onUpdateCase }) => {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const defInsurance = (caseData.insurance || []).filter(i => i.type === 'Defendant');
  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  const updateInsurance = (idx: number, updates: Partial<Insurance>) => {
    const allIns = [...(caseData.insurance || [])];
    const defIdx = allIns.findIndex((ins, i) => {
      let defCount = 0;
      for (let j = 0; j <= i; j++) {
        if (allIns[j].type === 'Defendant') defCount++;
      }
      return ins.type === 'Defendant' && defCount - 1 === idx;
    });
    if (defIdx >= 0) {
      allIns[defIdx] = { ...allIns[defIdx], ...updates };
      let updated = { ...caseData, insurance: allIns };
      if (updates.coverageStatus && updates.coverageStatus !== caseData.insurance?.[defIdx]?.coverageStatus) {
        updated = addActivity(updated, `Coverage status updated to "${COVERAGE_LABELS[updates.coverageStatus]}" for ${allIns[defIdx].provider}`);
      }
      if (updates.liabilityStatus && updates.liabilityStatus !== caseData.insurance?.[defIdx]?.liabilityStatus) {
        updated = addActivity(updated, `Liability status updated to "${LIABILITY_LABELS[updates.liabilityStatus]}" for ${allIns[defIdx].provider}`);
      }
      if (updates.policyLimitsStatus && updates.policyLimitsStatus !== caseData.insurance?.[defIdx]?.policyLimitsStatus) {
        updated = addActivity(updated, `Policy limits status updated to "${POLICY_LIMITS_LABELS[updates.policyLimitsStatus]}" for ${allIns[defIdx].provider}`);
      }
      onUpdateCase(updated);
    }
  };

  const needsAttention = defInsurance.some(ins =>
    ins.coverageStatus === 'pending' || ins.liabilityStatus === 'pending' || !ins.coverageStatus || !ins.liabilityStatus
  );

  const needsPolicyLimits = defInsurance.some(ins =>
    !ins.policyLimitsStatus || ins.policyLimitsStatus === 'not_requested'
  );

  return (
    <div className="space-y-6">
      {needsAttention && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/></svg>
          <div>
            <p className="text-sm font-bold text-amber-800">Coverage or liability confirmation pending</p>
            <p className="text-xs text-amber-600 mt-0.5">Follow up with the at-fault insurer weekly until confirmed. Client treatment may be at risk.</p>
          </div>
        </div>
      )}

      {needsPolicyLimits && caseData.mriCompleted && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div>
            <p className="text-sm font-bold text-blue-800">MRI completed -- request policy limits</p>
            <p className="text-xs text-blue-600 mt-0.5">Send MRI bill and record to the insurer to request policy limits before approving further treatment.</p>
          </div>
        </div>
      )}

      {defInsurance.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Defendant Insurance</h3>
          <p className="text-sm text-slate-500">Add defendant insurance info in the Overview tab to track coverage and liability.</p>
        </div>
      ) : (
        defInsurance.map((ins, idx) => {
          const isEditing = editingIdx === idx;
          const coverageStatus = ins.coverageStatus || 'pending';
          const liabilityStatus = ins.liabilityStatus || 'pending';
          const policyStatus = ins.policyLimitsStatus || 'not_requested';

          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{ins.provider || 'Unknown Insurer'}</h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                    {ins.claimNumber && <span>Claim: {ins.claimNumber}</span>}
                    {ins.adjuster && <span>Adjuster: {ins.adjuster}</span>}
                  </div>
                </div>
                <button
                  onClick={() => setEditingIdx(isEditing ? null : idx)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {isEditing ? 'Done' : 'Update'}
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">Coverage</h5>
                  {isEditing ? (
                    <div className="space-y-3">
                      <select
                        className={inputClass}
                        value={coverageStatus}
                        onChange={e => updateInsurance(idx, { coverageStatus: e.target.value as CoverageStatusType, coverageStatusDate: new Date().toISOString() })}
                      >
                        {Object.entries(COVERAGE_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Follow-up Date</label>
                        <input type="date" className={inputClass} value={ins.coverageFollowUpDate || ''} onChange={e => updateInsurance(idx, { coverageFollowUpDate: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[coverageStatus]}`}>
                        {COVERAGE_LABELS[coverageStatus]}
                      </span>
                      {ins.coverageStatusDate && (
                        <p className="text-[10px] text-slate-400 mt-2">Updated: {new Date(ins.coverageStatusDate).toLocaleDateString()}</p>
                      )}
                      {ins.coverageFollowUpDate && coverageStatus === 'pending' && (
                        <p className="text-[10px] text-amber-600 font-medium mt-1">Follow-up: {new Date(ins.coverageFollowUpDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">Liability</h5>
                  {isEditing ? (
                    <div className="space-y-3">
                      <select
                        className={inputClass}
                        value={liabilityStatus}
                        onChange={e => updateInsurance(idx, { liabilityStatus: e.target.value as LiabilityStatusType, liabilityStatusDate: new Date().toISOString() })}
                      >
                        {Object.entries(LIABILITY_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Follow-up Date</label>
                        <input type="date" className={inputClass} value={ins.liabilityFollowUpDate || ''} onChange={e => updateInsurance(idx, { liabilityFollowUpDate: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[liabilityStatus]}`}>
                        {LIABILITY_LABELS[liabilityStatus]}
                      </span>
                      {ins.liabilityStatusDate && (
                        <p className="text-[10px] text-slate-400 mt-2">Updated: {new Date(ins.liabilityStatusDate).toLocaleDateString()}</p>
                      )}
                      {ins.liabilityFollowUpDate && liabilityStatus === 'pending' && (
                        <p className="text-[10px] text-amber-600 font-medium mt-1">Follow-up: {new Date(ins.liabilityFollowUpDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100">Policy Limits</h5>
                  {isEditing ? (
                    <div className="space-y-3">
                      <select
                        className={inputClass}
                        value={policyStatus}
                        onChange={e => {
                          const updates: Partial<Insurance> = { policyLimitsStatus: e.target.value as PolicyLimitsStatusType };
                          if (e.target.value === 'requested') updates.policyLimitsRequestDate = new Date().toISOString();
                          if (e.target.value === 'received') updates.policyLimitsReceivedDate = new Date().toISOString();
                          updateInsurance(idx, updates);
                        }}
                      >
                        {Object.entries(POLICY_LIMITS_LABELS).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Limits Amount</label>
                        <input className={inputClass} value={ins.policyLimitsAmount || ''} onChange={e => updateInsurance(idx, { policyLimitsAmount: e.target.value })} placeholder="e.g. 25/50" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[policyStatus]}`}>
                        {POLICY_LIMITS_LABELS[policyStatus]}
                      </span>
                      {ins.policyLimitsAmount && (
                        <p className="text-sm font-bold text-slate-900 mt-2">{ins.policyLimitsAmount}</p>
                      )}
                      {ins.policyLimitsRequestDate && (
                        <p className="text-[10px] text-slate-400 mt-1">Requested: {new Date(ins.policyLimitsRequestDate).toLocaleDateString()}</p>
                      )}
                      {ins.policyLimitsReceivedDate && (
                        <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Received: {new Date(ins.policyLimitsReceivedDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {ins.coverageLimits && (
                <div className="px-6 pb-4">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 uppercase">Existing Coverage Info: </span>
                    <span className="text-sm font-medium text-slate-700">{ins.coverageLimits}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          MRI & Treatment Status
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                checked={caseData.mriCompleted || false}
                onChange={e => {
                  let updated = { ...caseData, mriCompleted: e.target.checked };
                  if (e.target.checked && !caseData.mriCompletedDate) {
                    updated.mriCompletedDate = new Date().toISOString().split('T')[0];
                  }
                  updated = addActivity(updated, e.target.checked ? 'MRI marked as completed' : 'MRI completion status removed');
                  onUpdateCase(updated);
                }}
              />
              <span className="text-sm text-slate-700 font-medium">MRI Completed</span>
            </label>
            {caseData.mriCompleted && (
              <input
                type="date"
                className="mt-2 w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                value={caseData.mriCompletedDate || ''}
                onChange={e => onUpdateCase({ ...caseData, mriCompletedDate: e.target.value })}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Treatment End Date</label>
            <input
              type="date"
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              value={caseData.treatmentEndDate || ''}
              onChange={e => {
                let updated = { ...caseData, treatmentEndDate: e.target.value };
                if (e.target.value) {
                  updated = addActivity(updated, `Treatment end date set to ${e.target.value}`);
                }
                onUpdateCase(updated);
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Treatment Status</label>
            <input
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              value={caseData.treatmentStatus || ''}
              onChange={e => onUpdateCase({ ...caseData, treatmentStatus: e.target.value })}
              placeholder="e.g. Currently treating, Discharged"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
