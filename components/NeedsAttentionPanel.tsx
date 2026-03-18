import React, { useState } from 'react';
import { CaseFile } from '../types';
import { getAllReminders, ReminderAlert } from '../services/workflowEngine';

interface NeedsAttentionPanelProps {
  cases: CaseFile[];
  onSelectCase: (caseId: string) => void;
}

const PRIORITY_CONFIG = {
  critical: { bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500', text: 'text-rose-700' },
  high: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', text: 'text-amber-700' },
  medium: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', text: 'text-slate-600' },
};

const TYPE_ICONS: Record<ReminderAlert['type'], string> = {
  bill_request: 'M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z',
  records_request: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z',
  er_bill: 'M19 14l-7 7m0 0l-7-7m7 7V3',
  er_records: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  coverage: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  liability: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  overdue_task: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  no_workflow: 'M13 10V3L4 14h7v7l9-11h-7z',
};

const TYPE_LABELS: Record<ReminderAlert['type'], string> = {
  bill_request: 'Bill Request',
  records_request: 'Records Request',
  er_bill: 'ER Bill',
  er_records: 'ER Records',
  coverage: 'Coverage',
  liability: 'Liability',
  overdue_task: 'Overdue Tasks',
  no_workflow: 'Setup Needed',
};

export const NeedsAttentionPanel: React.FC<NeedsAttentionPanelProps> = ({ cases, onSelectCase }) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');
  const [collapsed, setCollapsed] = useState(false);

  const alerts = getAllReminders(cases);
  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.priority === filter);

  const criticalCount = alerts.filter(a => a.priority === 'critical').length;
  const highCount = alerts.filter(a => a.priority === 'high').length;

  const groupedByCaseId = filtered.reduce((acc, alert) => {
    if (!acc[alert.caseId]) acc[alert.caseId] = [];
    acc[alert.caseId].push(alert);
    return acc;
  }, {} as Record<string, ReminderAlert[]>);

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">All cases on track</p>
            <p className="text-xs text-slate-500">No action items requiring attention</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-6">
      <div
        className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center ${criticalCount > 0 ? 'bg-rose-100' : 'bg-amber-100'}`}>
            <svg className={`w-5 h-5 ${criticalCount > 0 ? 'text-rose-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-bold text-slate-900">Needs Attention</p>
              {criticalCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{criticalCount} critical</span>
              )}
              {highCount > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{highCount} high</span>
              )}
            </div>
            <p className="text-xs text-slate-500">{alerts.length} item{alerts.length !== 1 ? 's' : ''} across {Object.keys(groupedByCaseId).length} case{Object.keys(groupedByCaseId).length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5">
            {(['all', 'critical', 'high'] as const).map(f => (
              <button
                key={f}
                onClick={e => { e.stopPropagation(); setFilter(f); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors capitalize ${filter === f ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      {!collapsed && (
        <div className="divide-y divide-slate-100">
          {Object.entries(groupedByCaseId).map(([caseId, caseAlerts]) => {
            const topAlert = caseAlerts[0];
            const cfg = PRIORITY_CONFIG[topAlert.priority];
            return (
              <div
                key={caseId}
                className={`px-6 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${cfg.bg}`}
                onClick={() => onSelectCase(caseId)}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="font-semibold text-slate-900 text-sm">{topAlert.caseName}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${cfg.badge}`}>{topAlert.priority}</span>
                    </div>
                    <div className="space-y-1">
                      {caseAlerts.slice(0, 3).map((alert, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2">
                          <svg className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICONS[alert.type]} />
                          </svg>
                          <span className="text-xs text-slate-600">{alert.message}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.badge} flex-shrink-0`}>{TYPE_LABELS[alert.type]}</span>
                        </div>
                      ))}
                      {caseAlerts.length > 3 && (
                        <p className="text-xs text-slate-400 pl-5">+{caseAlerts.length - 3} more item{caseAlerts.length - 3 > 1 ? 's' : ''}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
