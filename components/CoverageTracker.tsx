import React, { useState } from 'react';
import { CaseFile, Insurance, CoverageStatusType, LiabilityStatusType, PolicyLimitsStatusType, ActivityLog } from '../types';
import { useAuth } from '../contexts/AuthContext';

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
  not_requested: 'bg-stone-50 text-stone-600 border-stone-200',
  requested: 'bg-blue-50 text-blue-700 border-blue-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  na: 'bg-stone-50 text-stone-400 border-stone-200',
};

function addActivity(c: CaseFile, message: string, author?: string): CaseFile {
  const log: ActivityLog = {
    id: Math.random().toString(36).substr(2, 9),
    type: author ? 'user' : 'system',
    message,
    timestamp: new Date().toISOString(),
    author: author || 'System',
  };
  return { ...c, activityLog: [log, ...(c.activityLog || [])] };
}

export const CoverageTracker: React.FC<CoverageTrackerProps> = ({ caseData, onUpdateCase }) => {
  const { profile } = useAuth();
  const authorName = profile?.full_name || profile?.email || 'Unknown User';
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState(false);

  const defInsurance = (caseData.insurance || []).filter(i => i.type === 'Defendant');
  const clientInsurance = (caseData.insurance || []).find(i => i.type === 'Client');
  const defendantUninsured =
    defInsurance.length === 0 ||
    defInsurance.every(ins => ins.insuredStatus === 'uninsured' || !ins.provider);
  const inputClass = "w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  const updateClientInsurance = (updates: Partial<Insurance>) => {
    const allIns = [...(caseData.insurance || [])];
    const cIdx = allIns.findIndex(i => i.type === 'Client');
    if (cIdx >= 0) {
      allIns[cIdx] = { ...allIns[cIdx], ...updates };
    } else {
      allIns.push({ type: 'Client', provider: '', ...updates } as Insurance);
    }
    let updated = { ...caseData, insurance: allIns };
    if (updates.umCoverageStatus && updates.umCoverageStatus !== clientInsurance?.umCoverageStatus) {
      const label = updates.umCoverageStatus === 'has_um' ? 'Has UM/UIM'
        : updates.umCoverageStatus === 'no_um' ? 'No UM/UIM'
        : 'Unknown';
      updated = addActivity(updated, `Client UM/UIM coverage status set to "${label}"`, authorName);
    }
    onUpdateCase(updated);
  };

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
        updated = addActivity(updated, `Coverage status updated to "${COVERAGE_LABELS[updates.coverageStatus]}" for ${allIns[defIdx].provider}`, authorName);
      }
      if (updates.liabilityStatus && updates.liabilityStatus !== caseData.insurance?.[defIdx]?.liabilityStatus) {
        updated = addActivity(updated, `Liability status updated to "${LIABILITY_LABELS[updates.liabilityStatus]}" for ${allIns[defIdx].provider}`, authorName);
      }
      if (updates.policyLimitsStatus && updates.policyLimitsStatus !== caseData.insurance?.[defIdx]?.policyLimitsStatus) {
        updated = addActivity(updated, `Policy limits status updated to "${POLICY_LIMITS_LABELS[updates.policyLimitsStatus]}" for ${allIns[defIdx].provider}`, authorName);
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
            <p className="text-xs text-amber-600 mt-0.5">Follow up with the defendant's insurer weekly until confirmed. Client treatment may be at risk.</p>
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

      {/* 1P · Client Coverage card */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border bg-emerald-50 text-emerald-700 border-emerald-200">
              1P · Client
            </span>
            <div>
              <h4 className="font-bold text-stone-900 text-base">{clientInsurance?.provider || 'Client Insurance'}</h4>
              <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                {clientInsurance?.policyNumber && <span>Policy: {clientInsurance.policyNumber}</span>}
                {clientInsurance?.claimNumber && <span>Claim: {clientInsurance.claimNumber}</span>}
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditingClient(v => !v)}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            {editingClient ? 'Done' : 'Update'}
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">Insurance Status</h5>
            {editingClient ? (
              <select
                className={inputClass}
                value={clientInsurance?.insuredStatus || ''}
                onChange={e => updateClientInsurance({ insuredStatus: (e.target.value || undefined) as Insurance['insuredStatus'] })}
              >
                <option value="">Select...</option>
                <option value="insured">Insured</option>
                <option value="uninsured">Uninsured</option>
              </select>
            ) : (
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${
                clientInsurance?.insuredStatus === 'insured' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : clientInsurance?.insuredStatus === 'uninsured' ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-stone-50 text-stone-600 border-stone-200'
              }`}>
                {clientInsurance?.insuredStatus === 'insured' ? 'Insured'
                  : clientInsurance?.insuredStatus === 'uninsured' ? 'Uninsured'
                  : 'Not Set'}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">Coverage Type</h5>
            {editingClient ? (
              <select
                className={inputClass}
                value={clientInsurance?.coverageType || ''}
                onChange={e => updateClientInsurance({ coverageType: (e.target.value || undefined) as Insurance['coverageType'] })}
              >
                <option value="">Select...</option>
                <option value="liability">Liability</option>
                <option value="full_coverage">Full Coverage</option>
              </select>
            ) : (
              <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${
                clientInsurance?.coverageType === 'full_coverage' ? 'bg-blue-50 text-blue-700 border-blue-200'
                : clientInsurance?.coverageType === 'liability' ? 'bg-stone-100 text-stone-600 border-stone-200'
                : 'bg-stone-50 text-stone-400 border-stone-200'
              }`}>
                {clientInsurance?.coverageType === 'full_coverage' ? 'Full Coverage'
                  : clientInsurance?.coverageType === 'liability' ? 'Liability'
                  : 'Not Set'}
              </span>
            )}
          </div>
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">Coverage Limits</h5>
            {editingClient ? (
              <input
                className={inputClass}
                value={clientInsurance?.coverageLimits || ''}
                onChange={e => updateClientInsurance({ coverageLimits: e.target.value })}
                placeholder="e.g. 100/300/100"
              />
            ) : clientInsurance?.coverageLimits ? (
              <span className="bg-stone-50 border border-stone-200 text-stone-700 px-2 py-1 rounded font-mono text-sm font-bold inline-block">
                {clientInsurance.coverageLimits}
              </span>
            ) : (
              <span className="text-xs text-stone-400">Not Set</span>
            )}
          </div>
        </div>

        {/* UM/UIM section — only when defendant is uninsured or missing */}
        {defendantUninsured && (
          <div className="mx-6 mb-6 p-4 rounded-lg border bg-amber-50/70 border-amber-200">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <h5 className="text-sm font-bold text-amber-900">Uninsured Motorist (UM/UIM) Coverage</h5>
                <p className="text-xs text-amber-700 mt-0.5">
                  Defendant has no insurance. The client's UM/UIM coverage may be the only avenue for recovery — confirm and track it here.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">UM Coverage Status</label>
                {editingClient ? (
                  <select
                    className={inputClass}
                    value={clientInsurance?.umCoverageStatus || ''}
                    onChange={e => updateClientInsurance({ umCoverageStatus: (e.target.value || undefined) as Insurance['umCoverageStatus'] })}
                  >
                    <option value="">Select...</option>
                    <option value="has_um">Has UM/UIM</option>
                    <option value="no_um">No UM/UIM</option>
                    <option value="unknown">Unknown</option>
                  </select>
                ) : (
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${
                    clientInsurance?.umCoverageStatus === 'has_um' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : clientInsurance?.umCoverageStatus === 'no_um' ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}>
                    {clientInsurance?.umCoverageStatus === 'has_um' ? 'Has UM/UIM'
                      : clientInsurance?.umCoverageStatus === 'no_um' ? 'No UM/UIM'
                      : clientInsurance?.umCoverageStatus === 'unknown' ? 'Unknown'
                      : 'Not Set'}
                  </span>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">UM Coverage Limits</label>
                {editingClient ? (
                  <input
                    className={inputClass}
                    value={clientInsurance?.umCoverageLimits || ''}
                    onChange={e => updateClientInsurance({ umCoverageLimits: e.target.value })}
                    placeholder="e.g. 100/300"
                    disabled={clientInsurance?.umCoverageStatus === 'no_um'}
                  />
                ) : clientInsurance?.umCoverageLimits && clientInsurance?.umCoverageStatus !== 'no_um' ? (
                  <span className="bg-stone-50 border border-stone-200 text-stone-700 px-2 py-1 rounded font-mono text-sm font-bold inline-block">
                    UM: {clientInsurance.umCoverageLimits}
                  </span>
                ) : (
                  <span className="text-xs text-stone-400">Not Set</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {defInsurance.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h3 className="text-lg font-bold text-stone-800 mb-1">No Defendant Insurance</h3>
          <p className="text-sm text-stone-500">Add defendant insurance info in the Overview tab to track coverage and liability.</p>
        </div>
      ) : (
        defInsurance.map((ins, idx) => {
          const isEditing = editingIdx === idx;
          const coverageStatus = ins.coverageStatus || 'pending';
          const liabilityStatus = ins.liabilityStatus || 'pending';
          const policyStatus = ins.policyLimitsStatus || 'not_requested';

          return (
            <div key={idx} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border bg-indigo-50 text-indigo-700 border-indigo-200">
                    3P · Defendant
                  </span>
                  <div>
                    <h4 className="font-bold text-stone-900 text-base">{ins.provider || 'Unknown Insurer'}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                      {ins.claimNumber && <span>Claim: {ins.claimNumber}</span>}
                      {ins.adjuster && <span>Adjuster: {ins.adjuster}</span>}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEditingIdx(isEditing ? null : idx)}
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                >
                  {isEditing ? 'Done' : 'Update'}
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">Coverage</h5>
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
                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Follow-up Date</label>
                        <input type="date" className={inputClass} value={ins.coverageFollowUpDate || ''} onChange={e => updateInsurance(idx, { coverageFollowUpDate: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[coverageStatus]}`}>
                        {COVERAGE_LABELS[coverageStatus]}
                      </span>
                      {ins.coverageStatusDate && (
                        <p className="text-[10px] text-stone-400 mt-2">Updated: {new Date(ins.coverageStatusDate).toLocaleDateString()}</p>
                      )}
                      {ins.coverageFollowUpDate && coverageStatus === 'pending' && (
                        <p className="text-[10px] text-amber-600 font-medium mt-1">Follow-up: {new Date(ins.coverageFollowUpDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">Liability</h5>
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
                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Follow-up Date</label>
                        <input type="date" className={inputClass} value={ins.liabilityFollowUpDate || ''} onChange={e => updateInsurance(idx, { liabilityFollowUpDate: e.target.value })} />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[liabilityStatus]}`}>
                        {LIABILITY_LABELS[liabilityStatus]}
                      </span>
                      {ins.liabilityStatusDate && (
                        <p className="text-[10px] text-stone-400 mt-2">Updated: {new Date(ins.liabilityStatusDate).toLocaleDateString()}</p>
                      )}
                      {ins.liabilityFollowUpDate && liabilityStatus === 'pending' && (
                        <p className="text-[10px] text-amber-600 font-medium mt-1">Follow-up: {new Date(ins.liabilityFollowUpDate).toLocaleDateString()}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h5 className="text-xs font-bold text-stone-400 uppercase tracking-wider pb-1 border-b border-stone-100">Policy Limits</h5>
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
                        <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Limits Amount</label>
                        <input className={inputClass} value={ins.policyLimitsAmount || ''} onChange={e => updateInsurance(idx, { policyLimitsAmount: e.target.value })} placeholder="e.g. 25/50" />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[policyStatus]}`}>
                        {POLICY_LIMITS_LABELS[policyStatus]}
                      </span>
                      {ins.policyLimitsAmount && (
                        <p className="text-sm font-bold text-stone-900 mt-2">{ins.policyLimitsAmount}</p>
                      )}
                      {ins.policyLimitsRequestDate && (
                        <p className="text-[10px] text-stone-400 mt-1">Requested: {new Date(ins.policyLimitsRequestDate).toLocaleDateString()}</p>
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
                  <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                    <span className="text-xs font-bold text-stone-400 uppercase">Existing Coverage Info: </span>
                    <span className="text-sm font-medium text-stone-700">{ins.coverageLimits}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h4 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          MRI & Treatment Status
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded border-stone-300 focus:ring-blue-500"
                checked={caseData.mriCompleted || false}
                onChange={e => {
                  let updated = { ...caseData, mriCompleted: e.target.checked };
                  if (e.target.checked && !caseData.mriCompletedDate) {
                    updated.mriCompletedDate = new Date().toISOString().split('T')[0];
                  }
                  updated = addActivity(updated, e.target.checked ? 'MRI marked as completed' : 'MRI completion status removed', authorName);
                  onUpdateCase(updated);
                }}
              />
              <span className="text-sm text-stone-700 font-medium">MRI Completed</span>
            </label>
            {caseData.mriCompleted && (
              <input
                type="date"
                className="mt-2 w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none"
                value={caseData.mriCompletedDate || ''}
                onChange={e => onUpdateCase({ ...caseData, mriCompletedDate: e.target.value })}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Treatment End Date</label>
            <input
              type="date"
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none"
              value={caseData.treatmentEndDate || ''}
              onChange={e => {
                let updated = { ...caseData, treatmentEndDate: e.target.value };
                if (e.target.value) {
                  updated = addActivity(updated, `Treatment end date set to ${e.target.value}`, authorName);
                }
                onUpdateCase(updated);
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Treatment Status</label>
            <input
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none"
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
