
import React, { useState } from 'react';
import { useFirm } from '../contexts/FirmContext';
import { CaseFile, CaseStatus } from '../types';

interface AnalyticsProps {
  cases: CaseFile[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ cases }) => {
  const { firms, activeFirm, canViewCombinedAnalytics } = useFirm();
  const [viewMode, setViewMode] = useState<'firm' | 'combined'>('firm');

  const activeCases = cases.filter(c =>
    c.status !== CaseStatus.REJECTED && c.status !== CaseStatus.LOST_CONTACT
  );
  const newCount = cases.filter(c => c.status === CaseStatus.NEW || c.status === CaseStatus.ANALYZING).length;
  const reviewCount = cases.filter(c => c.status === CaseStatus.REVIEW_NEEDED).length;
  const acceptedCount = cases.filter(c => c.status === CaseStatus.ACCEPTED || c.status === CaseStatus.INTAKE_PROCESSING).length;
  const completeCount = cases.filter(c => c.status === CaseStatus.INTAKE_COMPLETE).length;
  const totalActive = newCount + reviewCount + acceptedCount + completeCount;

  const referralCounts: Record<string, number> = {};
  cases.forEach(c => {
    if (c.referralSource) {
      referralCounts[c.referralSource] = (referralCounts[c.referralSource] || 0) + 1;
    }
  });
  const totalReferrals = Object.values(referralCounts).reduce((a, b) => a + b, 0);
  const referralData = Object.entries(referralCounts)
    .map(([label, count]) => ({
      label,
      val: totalReferrals > 0 ? Math.round((count / totalReferrals) * 100) : 0,
      count
    }))
    .sort((a, b) => b.count - a.count);

  const referralColors = ['bg-blue-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-orange-500', 'bg-slate-400'];

  const funnelStages = [
    { label: 'New / Analyzing', val: newCount, color: 'bg-blue-100 text-blue-800' },
    { label: 'Review Needed', val: reviewCount, color: 'bg-amber-100 text-amber-800' },
    { label: 'Accepted / Processing', val: acceptedCount, color: 'bg-emerald-100 text-emerald-800' },
    { label: 'Intake Complete', val: completeCount, color: 'bg-slate-100 text-slate-800' },
  ];
  const maxFunnelVal = funnelStages[0].val || 1;

  const teamACases = cases.filter(c => c.assignedTeam === 'Team A').length;
  const teamBCases = cases.filter(c => c.assignedTeam === 'Team B').length;
  const maxTeam = Math.max(teamACases, teamBCases, 1);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Intake Performance</h1>
          <p className="text-slate-500 mt-2 text-lg">Metrics focused on intake process efficiency and completion rates.</p>
        </div>

        {canViewCombinedAnalytics && firms.length > 1 && (
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm flex-shrink-0">
            <button
              onClick={() => setViewMode('firm')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'firm'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {activeFirm?.name || 'Current Firm'}
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'combined'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Combined
            </button>
          </div>
        )}
      </div>

      {canViewCombinedAnalytics && firms.length > 1 && viewMode === 'combined' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <p className="text-sm text-blue-700 font-medium">
            Showing combined analytics across {firms.length} firms: {firms.map(f => f.name).join(', ')}
          </p>
        </div>
      )}

      {canViewCombinedAnalytics && firms.length > 1 && viewMode === 'combined' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {firms.map((firm, i) => {
            const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-cyan-600', 'bg-orange-600'];
            return (
              <div key={firm.id} className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${colors[i % colors.length]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {firm.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-sm">{firm.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{activeCases.length} active cases (demo)</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Intakes Completed (MTD)</h3>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold text-slate-900">{completeCount}</span>
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+8%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Signed retainers this month</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Cases</h3>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold text-slate-900">{activeCases.length}</span>
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+2%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Across all active stages</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Retainer Sign-up Rate</h3>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-bold text-slate-900">32.4%</span>
            <span className="text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+2.1%</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Leads converted to clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 text-lg">Intake Pipeline Funnel</h3>
          <div className="space-y-5">
            {funnelStages.map((stage, i) => {
              const width = totalActive > 0 ? (stage.val / maxFunnelVal) * 100 : 0;
              return (
                <div key={i} className="relative">
                  <div className="flex items-center justify-between mb-1 text-sm font-bold text-slate-700">
                    <span>{stage.label}</span>
                    <span>{stage.val} Cases</span>
                  </div>
                  <div className="h-10 bg-slate-50 rounded-r-lg overflow-hidden relative">
                    <div
                      className={`h-full rounded-r-lg ${stage.color.split(' ')[0]} transition-all duration-1000 flex items-center px-3`}
                      style={{ width: `${Math.max(width, stage.val > 0 ? 5 : 0)}%` }}
                    >
                      {stage.val > 0 && (
                        <span className={`text-xs font-bold ${stage.color.split(' ')[1]}`}>{Math.round(width)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">* Drop-offs include Rejected and Lost Contact statuses.</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 text-lg">Team Case Load</h3>

          <div className="space-y-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">A</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Team A</h4>
                    <p className="text-xs text-slate-500">2 Senior • 3 Junior</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-slate-900 text-lg">{teamACases} Active</span>
                  <span className="text-xs text-emerald-600 font-medium">{maxTeam > 0 ? Math.round((teamACases / maxTeam) * 100) : 0}% Capacity</span>
                </div>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${maxTeam > 0 ? (teamACases / maxTeam) * 100 : 0}%` }}></div>
              </div>
              <div className="flex gap-4 mt-2">
                <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded">Avg Close: 24h</span>
                <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded">Satisfaction: 4.8/5</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold mr-3">B</div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Team B</h4>
                    <p className="text-xs text-slate-500">1 Senior • 4 Junior</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-slate-900 text-lg">{teamBCases} Active</span>
                  <span className="text-xs text-slate-500 font-medium">{maxTeam > 0 ? Math.round((teamBCases / maxTeam) * 100) : 0}% Capacity</span>
                </div>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 rounded-full transition-all duration-700" style={{ width: `${maxTeam > 0 ? (teamBCases / maxTeam) * 100 : 0}%` }}></div>
              </div>
              <div className="flex gap-4 mt-2">
                <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded">Avg Close: 31h</span>
                <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded">Satisfaction: 4.6/5</span>
              </div>
            </div>
          </div>

          {teamACases > teamBCases * 1.3 && (
            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start">
              <div className="w-5 h-5 text-amber-500 mr-2 flex-shrink-0 font-bold">!</div>
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Load Balancing Recommendation:</strong> Team A is carrying significantly more cases. Consider routing new cases to Team B.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-800 mb-6 text-lg">Referral Sources</h3>
        {referralData.length > 0 ? (
          <div className="space-y-6">
            {referralData.slice(0, 5).map((item, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm font-medium text-slate-700 mb-2">
                  <span>{item.label}</span>
                  <span>{item.val}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${referralColors[i % referralColors.length]}`} style={{ width: `${item.val}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No referral data available yet.</p>
        )}
        <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center">
            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            AI Insight
          </h4>
          <p className="text-sm text-slate-600">Google Ads leads have a <strong>12% higher completion rate</strong> than Social Media leads this month. Recommendation: Increase Ads budget for "Car Accident" keywords.</p>
        </div>
      </div>
    </div>
  );
};
