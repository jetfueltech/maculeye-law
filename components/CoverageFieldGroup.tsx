import React, { useCallback } from 'react';
import type { InsuredStatus, CoverageType } from '../types';

interface CoverageFieldGroupProps {
  insuredStatus?: InsuredStatus;
  coverageType?: CoverageType;
  coverageLimits: string;
  onChange: (field: string, value: string) => void;
  onBatchChange?: (fields: Record<string, string>) => void;
  accentColor?: 'stone' | 'emerald';
  /** Party label shown in a badge at the top of the section. */
  partyLabel?: '1P' | '3P';
  /** When true, renders a UM/UIM coverage limits input below the main coverage
   * fields. Used on the 1P (client) block when the 3P (defendant) is uninsured. */
  showUmCoverage?: boolean;
  umCoverageLimits?: string;
  umCoverageStatus?: 'has_um' | 'no_um' | 'unknown';
}

const selectClass = "w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer";
const inputClass = "w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

const COVERAGE_TYPE_LABELS: Record<string, string> = {
  liability: 'Liability',
  full_coverage: 'Full Coverage',
};

export const CoverageFieldGroup: React.FC<CoverageFieldGroupProps> = ({
  insuredStatus,
  coverageType,
  coverageLimits,
  onChange,
  onBatchChange,
  accentColor = 'stone',
  partyLabel,
  showUmCoverage = false,
  umCoverageLimits = '',
  umCoverageStatus,
}) => {
  const badgeBg = accentColor === 'emerald' ? 'bg-emerald-50 border-emerald-100' : 'bg-stone-50 border-stone-200';
  const badgeText = accentColor === 'emerald' ? 'text-emerald-700' : 'text-stone-700';

  const handleInsuredStatusChange = useCallback((value: string) => {
    if (value !== 'insured') {
      if (onBatchChange) {
        onBatchChange({ insuredStatus: value, coverageType: '', coverageLimits: '' });
      } else {
        onChange('insuredStatus', value);
        onChange('coverageType', '');
        onChange('coverageLimits', '');
      }
    } else {
      if (onBatchChange) {
        onBatchChange({ insuredStatus: value });
      } else {
        onChange('insuredStatus', value);
      }
    }
  }, [onChange, onBatchChange]);

  const handleCoverageTypeChange = useCallback((value: string) => {
    if (onBatchChange) {
      onBatchChange({ coverageType: value, coverageLimits: '' });
    } else {
      onChange('coverageType', value);
      onChange('coverageLimits', '');
    }
  }, [onChange, onBatchChange]);

  const partyBadge = partyLabel ? (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide border ${
      partyLabel === '1P'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
    }`}>
      {partyLabel === '1P' ? '1P · Client' : '3P · Defendant'}
    </span>
  ) : null;

  return (
    <div className="space-y-3">
      {partyBadge && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-stone-600 uppercase tracking-wide">Coverage & Limits</label>
          {partyBadge}
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Insurance Status</label>
        <select
          className={selectClass}
          value={insuredStatus || ''}
          onChange={e => handleInsuredStatusChange(e.target.value)}
        >
          <option value="">Select...</option>
          <option value="insured">Insured</option>
          <option value="uninsured">Uninsured</option>
        </select>
      </div>

      {insuredStatus === 'uninsured' && (
        <div className="px-3 py-2.5 rounded-lg border bg-amber-50 border-amber-200 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs font-semibold text-amber-700">Uninsured Motorist</span>
        </div>
      )}

      {insuredStatus === 'insured' && (
        <>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Coverage Type</label>
            <select
              className={selectClass}
              value={coverageType || ''}
              onChange={e => handleCoverageTypeChange(e.target.value)}
            >
              <option value="">Select type...</option>
              <option value="liability">Liability</option>
              <option value="full_coverage">Full Coverage</option>
            </select>
          </div>

          {coverageType && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-stone-500">Coverage Limits</label>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                  coverageType === 'full_coverage'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-stone-100 text-stone-500'
                }`}>
                  {COVERAGE_TYPE_LABELS[coverageType]}
                </span>
              </div>
              <input
                className={inputClass}
                value={coverageLimits}
                placeholder="e.g. 100/300/100"
                onChange={e => onChange('coverageLimits', e.target.value)}
              />
              {coverageLimits && (
                <div className="mt-1.5">
                  <span className={`${badgeBg} ${badgeText} px-2 py-1 rounded font-mono text-sm font-bold border inline-block`}>
                    {coverageLimits}
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {showUmCoverage && (
        <div className="mt-2 p-3 bg-amber-50/60 border border-amber-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <label className="block text-xs font-bold text-amber-800 uppercase tracking-wide">
                Uninsured Motorist (UM/UIM) Coverage
              </label>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
              Defendant Uninsured
            </span>
          </div>
          <p className="text-[11px] text-amber-700 mb-2">
            The defendant has no insurance. Capture the client's UM/UIM coverage, which may be the only recovery source.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-stone-500 mb-1">UM Coverage Status</label>
              <select
                className={selectClass}
                value={umCoverageStatus || ''}
                onChange={e => onChange('umCoverageStatus', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="has_um">Has UM/UIM</option>
                <option value="no_um">No UM/UIM</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-medium text-stone-500 mb-1">UM Coverage Limits</label>
              <input
                className={inputClass}
                value={umCoverageLimits}
                placeholder="e.g. 100/300"
                disabled={umCoverageStatus === 'no_um'}
                onChange={e => onChange('umCoverageLimits', e.target.value)}
              />
            </div>
          </div>
          {umCoverageLimits && umCoverageStatus !== 'no_um' && (
            <div className="mt-2">
              <span className={`${badgeBg} ${badgeText} px-2 py-1 rounded font-mono text-sm font-bold border inline-block`}>
                UM: {umCoverageLimits}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
