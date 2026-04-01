import React, { useState, useMemo } from 'react';
import { CaseFile, CaseTask, CaseStatus, TaskType, TaskStatus, WORKFLOW_STAGES } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface WorkspaceProps {
  cases: CaseFile[];
  onSelectCase: (c: CaseFile) => void;
  onUpdateCase: (c: CaseFile) => void;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  NEW: { label: 'New', bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  ANALYZING: { label: 'Analyzing', bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  REVIEW_NEEDED: { label: 'Review Needed', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  ACCEPTED: { label: 'Accepted', bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  REJECTED: { label: 'Rejected', bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  INTAKE_PROCESSING: { label: 'Processing', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  INTAKE_PAUSED: { label: 'Paused', bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' },
  INTAKE_COMPLETE: { label: 'Complete', bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
  LOST_CONTACT: { label: 'Lost Contact', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
};

const TASK_TYPE_LABELS: Partial<Record<TaskType, string>> = {
  coverage_followup: 'Coverage Follow-up',
  liability_followup: 'Liability Follow-up',
  contact_client: 'Client Contact',
  er_records: 'ER Records',
  er_bills: 'ER Bills',
  medical_records: 'Medical Records',
  demand_prep: 'Demand Prep',
  treatment_followup: 'Treatment Check',
  records_request: 'Records Request',
  hipaa: 'HIPAA Auth',
  retainer: 'Retainer',
  crash_report_request: 'Crash Report',
  general: 'General',
  lor_defendant: 'LOR - Defendant',
  lor_client_ins: 'LOR - Client Ins.',
  policy_limits: 'Policy Limits',
  specials_compile: 'Specials',
  demand_review: 'Demand Review',
  verify_insurance: 'Verify Insurance',
  complete_intake_form: 'Intake Form',
  create_cms_case: 'CMS Case',
  upload_case_files: 'Upload Files',
  upload_intake_form: 'Upload Intake',
  send_hipaa_to_medical: 'HIPAA to Medical',
  send_demographics: 'Demographics',
  check_er_ambulance: 'ER/Ambulance',
  mass_order_records: 'Mass Order Records',
  receive_records_bills: 'Receive Records',
  medical_summary: 'Medical Summary',
  bill_request: 'Bill Request',
  client_communication: 'Client Comms',
  crash_report_received: 'Crash Report Rcvd',
};

function getDaysUntilSOL(solDate?: string): number | null {
  if (!solDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sol = new Date(solDate);
  return Math.round((sol.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getTaskDueStatus(task: CaseTask): 'overdue' | 'due_today' | 'upcoming' | null {
  if (!task.dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'due_today';
  return 'upcoming';
}

const WorkspaceCaseCard: React.FC<{
  caseFile: CaseFile;
  onSelectCase: (c: CaseFile) => void;
  onCompleteTask: (caseFile: CaseFile, taskId: string) => void;
}> = ({ caseFile, onSelectCase, onCompleteTask }) => {
  const [expanded, setExpanded] = useState(false);
  const openTasks = (caseFile.tasks || []).filter(t => t.status !== 'completed');
  const overdueTasks = openTasks.filter(t => getTaskDueStatus(t) === 'overdue');
  const solDays = getDaysUntilSOL(caseFile.statuteOfLimitationsDate);
  const statusCfg = STATUS_CONFIG[caseFile.status] || STATUS_CONFIG.NEW;

  const currentStage = WORKFLOW_STAGES.find(s =>
    caseFile.extendedIntake?.workflowStage === s.id
  );

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div
        className="p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                {statusCfg.label}
              </span>
              {overdueTasks.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {overdueTasks.length} overdue
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-stone-900 truncate">{caseFile.clientName}</h3>
            <p className="text-xs text-stone-500 mt-0.5 truncate">DOL: {caseFile.accidentDate ? new Date(caseFile.accidentDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            {solDays !== null && (
              <div className={`text-center px-3 py-1.5 rounded-xl ${
                solDays <= 30 ? 'bg-red-50 border border-red-200' :
                solDays <= 90 ? 'bg-amber-50 border border-amber-200' :
                'bg-stone-50 border border-stone-200'
              }`}>
                <p className={`text-xs font-bold ${solDays <= 30 ? 'text-red-700' : solDays <= 90 ? 'text-amber-700' : 'text-stone-600'}`}>
                  {solDays > 0 ? `${solDays}d` : 'EXPIRED'}
                </p>
                <p className={`text-[10px] ${solDays <= 30 ? 'text-red-500' : solDays <= 90 ? 'text-amber-500' : 'text-stone-400'}`}>SOL</p>
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onSelectCase(caseFile); }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Open Case
            </button>
          </div>
        </div>

        {currentStage && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${((WORKFLOW_STAGES.findIndex(s => s.id === currentStage.id) + 1) / WORKFLOW_STAGES.length) * 100}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500 font-medium whitespace-nowrap">{currentStage.label}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {openTasks.length} task{openTasks.length !== 1 ? 's' : ''}
            </span>
            {caseFile.insurance && caseFile.insurance.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {caseFile.insurance[0].company}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-stone-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {expanded && openTasks.length > 0 && (
        <div className="border-t border-stone-100 bg-stone-50 px-5 py-3 space-y-2">
          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Open Tasks</p>
          {openTasks.slice(0, 6).map(task => {
            const dueStatus = getTaskDueStatus(task);
            return (
              <div key={task.id} className="flex items-center gap-2.5 group">
                <button
                  onClick={(e) => { e.stopPropagation(); onCompleteTask(caseFile, task.id); }}
                  className="w-4 h-4 rounded border-2 border-stone-300 hover:border-blue-500 hover:bg-blue-50 transition-colors flex-shrink-0"
                  title="Mark complete"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-stone-700 truncate">{task.title}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.type && TASK_TYPE_LABELS[task.type] && (
                    <span className="text-[10px] font-medium text-stone-500 bg-white border border-stone-200 px-1.5 py-0.5 rounded">
                      {TASK_TYPE_LABELS[task.type]}
                    </span>
                  )}
                  {dueStatus === 'overdue' && (
                    <span className="text-[10px] font-bold text-red-600">Overdue</span>
                  )}
                  {dueStatus === 'due_today' && (
                    <span className="text-[10px] font-bold text-amber-600">Today</span>
                  )}
                  {task.priority === 'high' && dueStatus !== 'overdue' && (
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
          {openTasks.length > 6 && (
            <p className="text-[11px] text-stone-400 text-center pt-1">+{openTasks.length - 6} more tasks</p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onSelectCase(caseFile); }}
            className="w-full mt-1 text-xs font-semibold text-blue-600 hover:text-blue-800 text-center py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            View full case
          </button>
        </div>
      )}

      {expanded && openTasks.length === 0 && (
        <div className="border-t border-stone-100 bg-stone-50 px-5 py-4 text-center">
          <p className="text-xs text-stone-400">No open tasks</p>
          <button
            onClick={(e) => { e.stopPropagation(); onSelectCase(caseFile); }}
            className="mt-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            View case
          </button>
        </div>
      )}
    </div>
  );
};

type FilterType = 'all' | 'overdue' | 'due_today' | 'active';
type NewCasesRange = 1 | 7 | 30;

function getNewCasesInRange(cases: CaseFile[], days: NewCasesRange): CaseFile[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return cases.filter(c => {
    if (!c.createdAt) return false;
    return new Date(c.createdAt) >= cutoff;
  }).sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
}

const NewCaseRow: React.FC<{ caseFile: CaseFile; onSelectCase: (c: CaseFile) => void }> = ({ caseFile, onSelectCase }) => {
  const statusCfg = STATUS_CONFIG[caseFile.status] || STATUS_CONFIG.NEW;
  const createdAt = caseFile.createdAt ? new Date(caseFile.createdAt) : null;
  const now = new Date();
  const diffMs = createdAt ? now.getTime() - createdAt.getTime() : 0;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const timeAgo = diffDays > 0 ? `${diffDays}d ago` : diffHours > 0 ? `${diffHours}h ago` : 'Just now';

  return (
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-stone-50 rounded-xl transition-colors group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-stone-900 truncate">{caseFile.clientName}</p>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {statusCfg.label}
          </span>
        </div>
        <p className="text-xs text-stone-400 truncate">{caseFile.impact || caseFile.description?.slice(0, 60) || '—'}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-xs text-stone-400">{timeAgo}</span>
        <button
          onClick={() => onSelectCase(caseFile)}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Open
        </button>
      </div>
    </div>
  );
};

export const Workspace: React.FC<WorkspaceProps> = ({ cases, onSelectCase, onUpdateCase }) => {
  const { profile } = useAuth();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [newCasesRange, setNewCasesRange] = useState<NewCasesRange>(7);

  const allOpenTasks = useMemo(() => {
    return cases.flatMap(c => (c.tasks || []).filter(t => t.status !== 'completed').map(t => ({ task: t, caseFile: c })));
  }, [cases]);

  const overdueCount = useMemo(() =>
    allOpenTasks.filter(({ task }) => getTaskDueStatus(task) === 'overdue').length,
    [allOpenTasks]
  );

  const dueTodayCount = useMemo(() =>
    allOpenTasks.filter(({ task }) => getTaskDueStatus(task) === 'due_today').length,
    [allOpenTasks]
  );

  const activeCases = cases.filter(c =>
    c.status !== CaseStatus.REJECTED && c.status !== CaseStatus.LOST_CONTACT
  );

  const filteredCases = useMemo(() => {
    let result = activeCases;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.clientName.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.clientEmail?.toLowerCase().includes(q)
      );
    }

    if (filter === 'overdue') {
      result = result.filter(c =>
        (c.tasks || []).some(t => t.status !== 'completed' && getTaskDueStatus(t) === 'overdue')
      );
    } else if (filter === 'due_today') {
      result = result.filter(c =>
        (c.tasks || []).some(t => t.status !== 'completed' && getTaskDueStatus(t) === 'due_today')
      );
    } else if (filter === 'active') {
      result = result.filter(c =>
        [CaseStatus.INTAKE_PROCESSING, CaseStatus.ACCEPTED].includes(c.status as CaseStatus)
      );
    }

    return result.sort((a, b) => {
      const aOverdue = (a.tasks || []).filter(t => t.status !== 'completed' && getTaskDueStatus(t) === 'overdue').length;
      const bOverdue = (b.tasks || []).filter(t => t.status !== 'completed' && getTaskDueStatus(t) === 'overdue').length;
      if (bOverdue !== aOverdue) return bOverdue - aOverdue;
      const aSol = getDaysUntilSOL(a.statuteOfLimitationsDate) ?? 9999;
      const bSol = getDaysUntilSOL(b.statuteOfLimitationsDate) ?? 9999;
      return aSol - bSol;
    });
  }, [activeCases, filter, search]);

  const handleCompleteTask = (caseFile: CaseFile, taskId: string) => {
    const updated: CaseFile = {
      ...caseFile,
      tasks: (caseFile.tasks || []).map(t =>
        t.id === taskId ? { ...t, status: 'completed' as TaskStatus } : t
      ),
    };
    onUpdateCase(updated);
  };

  const newCases = useMemo(() => getNewCasesInRange(cases, newCasesRange), [cases, newCasesRange]);

  const firstName = profile?.full_name?.split(' ')[0] || profile?.username || 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const FILTERS: { id: FilterType; label: string; count?: number }[] = [
    { id: 'all', label: 'All Cases', count: activeCases.length },
    { id: 'overdue', label: 'Overdue Tasks', count: overdueCount },
    { id: 'due_today', label: 'Due Today', count: dueTodayCount },
    { id: 'active', label: 'In Progress' },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-5xl mx-auto px-6 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-stone-900">{greeting}, {firstName}</h1>
          <p className="text-stone-500 mt-1">Here's your case workload for today.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1">Active Cases</p>
            <p className="text-3xl font-bold text-stone-900">{activeCases.length}</p>
          </div>
          <div className={`rounded-2xl border p-5 ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${overdueCount > 0 ? 'text-red-500' : 'text-stone-500'}`}>Overdue Tasks</p>
            <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-700' : 'text-stone-900'}`}>{overdueCount}</p>
          </div>
          <div className={`rounded-2xl border p-5 ${dueTodayCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-stone-200'}`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${dueTodayCount > 0 ? 'text-amber-600' : 'text-stone-500'}`}>Due Today</p>
            <p className={`text-3xl font-bold ${dueTodayCount > 0 ? 'text-amber-700' : 'text-stone-900'}`}>{dueTodayCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 mb-8">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <div>
              <h2 className="text-sm font-bold text-stone-900">New Cases</h2>
              <p className="text-xs text-stone-400 mt-0.5">{newCases.length} case{newCases.length !== 1 ? 's' : ''} added</p>
            </div>
            <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
              {([1, 7, 30] as NewCasesRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setNewCasesRange(r)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    newCasesRange === r
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {r === 1 ? 'Today' : `${r}d`}
                </button>
              ))}
            </div>
          </div>
          <div className="px-1 py-2">
            {newCases.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-stone-400">No new cases in this period</p>
              </div>
            ) : (
              <div className="divide-y divide-stone-50">
                {newCases.slice(0, 8).map(c => (
                  <NewCaseRow key={c.id} caseFile={c} onSelectCase={onSelectCase} />
                ))}
                {newCases.length > 8 && (
                  <p className="text-xs text-stone-400 text-center py-3">+{newCases.length - 8} more</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -transtone-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cases..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl p-1">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === f.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    filter === f.id ? 'bg-blue-500 text-white' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {f.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {filteredCases.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-stone-600 font-semibold">No cases found</p>
            <p className="text-stone-400 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCases.map(c => (
              <WorkspaceCaseCard
                key={c.id}
                caseFile={c}
                onSelectCase={onSelectCase}
                onCompleteTask={handleCompleteTask}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
