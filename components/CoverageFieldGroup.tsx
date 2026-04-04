import React from 'react';
import type { InsuredStatus, CoverageType } from '../types';

interface CoverageFieldGroupProps {
  insuredStatus?: InsuredStatus;
  coverageType?: CoverageType;
  coverageLimits: string;
  onChange: (field: string, value: string) => void;
  accentColor?: 'stone' | 'emerald';
}

const selectClass = "w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer";
const inputClass = "w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

export const CoverageFieldGroup: React.FC<CoverageFieldGroupProps> = ({
  insuredStatus,
  coverageType,
  coverageLimits,
  onChange,
  accentColor = 'stone',
}) => {
  const badgeBg = accentColor === 'emerald' ? 'bg-emerald-50 border-emerald-100' : 'bg-stone-50 border-stone-200';
  const badgeText = accentColor === 'emerald' ? 'text-emerald-700' : 'text-stone-700';

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-stone-500 mb-1">Insurance Status</label>
        <select
          className={selectClass}
          value={insuredStatus || ''}
          onChange={e => onChange('insuredStatus', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="insured">Insured</option>
          <option value="uninsured">Uninsured</option>
        </select>
      </div>

      {insuredStatus === 'uninsured' && (
        <div className={`px-3 py-2 rounded-lg border ${badgeBg}`}>
          <span className={`text-xs font-semibold ${badgeText}`}>Uninsured Motorist</span>
        </div>
      )}

      {insuredStatus === 'insured' && (
        <>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Coverage Type</label>
            <select
              className={selectClass}
              value={coverageType || ''}
              onChange={e => onChange('coverageType', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="liability">Liability</option>
              <option value="full_coverage">Full Coverage</option>
            </select>
          </div>

          {coverageType && (
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Coverage Limits</label>
              <input
                className={inputClass}
                value={coverageLimits}
                placeholder="e.g. 100/300/100"
                onChange={e => onChange('coverageLimits', e.target.value)}
                onBlur={e => onChange('coverageLimits', e.target.value)}
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
    </div>
  );
};
