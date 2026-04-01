import React, { useState, useMemo } from 'react';
import { CaseFile, CaseTask, TaskType, TaskStatus } from '../types';
import { MemberPicker } from './MemberPicker';
import { useFirm } from '../contexts/FirmContext';

interface TasksViewProps {
  cases: CaseFile[];
  onSelectCase: (c: CaseFile) => void;
  onUpdateCase: (c: CaseFile) => void;
}

const TYPE_LABELS: Record<TaskType, string> = {
  coverage_followup: 'Coverage Follow-up',
  liability_followup: 'Liability Follow-up',
  policy_limits: 'Policy Limits',
  er_records: 'ER Records',
  er_bills: 'ER Bills',
  medical_records: 'Medical Records',
  demand_prep: 'Demand Prep',
  general: 'General',
  retainer: 'Retainer',
  lor_defendant: 'LOR - Defendant',
  lor_client_ins: 'LOR - Client Ins.',
  crash_report_request: 'Crash Report',
  crash_report_received: 'Crash Report',
  hipaa: 'HIPAA Auth',
  treatment_followup: 'Treatment Check',
  bill_request: 'Bill Request',
  records_request: 'Records Request',
  specials_compile: 'Specials',
  demand_review: 'Demand Review',
  contact_client: 'Client Contact',
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
  client_communication: 'Client Comms',
};

const TYPE_COLORS: Record<TaskType, string> = {
  coverage_followup: 'bg-rose-50 text-rose-700 border-rose-200',
  liability_followup: 'bg-amber-50 text-amber-700 border-amber-200',
  policy_limits: 'bg-blue-50 text-blue-700 border-blue-200',
  er_records: 'bg-red-50 text-red-700 border-red-200',
  er_bills: 'bg-orange-50 text-orange-700 border-orange-200',
  medical_records: 'bg-teal-50 text-teal-700 border-teal-200',
  demand_prep: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  general: 'bg-stone-50 text-stone-700 border-stone-200',
  retainer: 'bg-violet-50 text-violet-700 border-violet-200',
  lor_defendant: 'bg-sky-50 text-sky-700 border-sky-200',
  lor_client_ins: 'bg-sky-50 text-sky-700 border-sky-200',
  crash_report_request: 'bg-stone-50 text-stone-700 border-stone-200',
  crash_report_received: 'bg-stone-50 text-stone-700 border-stone-200',
  hipaa: 'bg-pink-50 text-pink-700 border-pink-200',
  treatment_followup: 'bg-green-50 text-green-700 border-green-200',
  bill_request: 'bg-orange-50 text-orange-700 border-orange-200',
  records_request: 'bg-teal-50 text-teal-700 border-teal-200',
  specials_compile: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  demand_review: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  contact_client: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  verify_insurance: 'bg-blue-50 text-blue-700 border-blue-200',
  complete_intake_form: 'bg-stone-50 text-stone-700 border-stone-200',
  create_cms_case: 'bg-stone-50 text-stone-700 border-stone-200',
  upload_case_files: 'bg-stone-50 text-stone-700 border-stone-200',
  upload_intake_form: 'bg-stone-50 text-stone-700 border-stone-200',
  send_hipaa_to_medical: 'bg-pink-50 text-pink-700 border-pink-200',
  send_demographics: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  check_er_ambulance: 'bg-red-50 text-red-700 border-red-200',
  mass_order_records: 'bg-teal-50 text-teal-700 border-teal-200',
  receive_records_bills: 'bg-teal-50 text-teal-700 border-teal-200',
  medical_summary: 'bg-green-50 text-green-700 border-green-200',
  client_communication: 'bg-cyan-50 text-cyan-700 border-cyan-200',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-rose-600',
  medium: 'text-amber-600',
  low: 'text-stone-400',
};

function getDaysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export const TasksView: React.FC<TasksViewProps> = ({ cases, onSelectCase, onUpdateCase }) => {
  const { firmMembers } = useFirm();
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [memberFilter, setMemberFilter] = useState<string>('ALL');

  const allTasks = useMemo(() => {
    const tasks: (CaseTask & { caseName: string; caseObj: CaseFile })[] = [];
    for (const c of cases) {
      for (const t of c.tasks || []) {
        tasks.push({ ...t, caseName: c.clientName, caseObj: c });
      }
    }
    return tasks;
  }, [cases]);

  const filteredTasks = useMemo(() => {
    let result = allTasks;
    if (filter === 'overdue') {
      result = result.filter(t => t.status === 'overdue' || (t.status === 'open' && getDaysUntil(t.dueDate) < 0));
    } else if (filter === 'today') {
      result = result.filter(t => t.status !== 'completed' && getDaysUntil(t.dueDate) === 0);
    } else if (filter === 'upcoming') {
      result = result.filter(t => t.status !== 'completed' && getDaysUntil(t.dueDate) >= 0);
    }
    if (typeFilter !== 'ALL') {
      result = result.filter(t => t.type === typeFilter);
    }
    if (memberFilter !== 'ALL') {
      if (memberFilter === 'Unassigned') {
        result = result.filter(t => !t.assignedTo);
      } else {
        result = result.filter(t => t.assignedTo?.id === memberFilter);
      }
    }
    return result.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [allTasks, filter, typeFilter, memberFilter]);

  const overdueCount = allTasks.filter(t => t.status !== 'completed' && getDaysUntil(t.dueDate) < 0).length;
  const openCount = allTasks.filter(t => t.status !== 'completed').length;
  const completedCount = allTasks.filter(t => t.status === 'completed').length;

  const handleComplete = (task: CaseTask & { caseObj: CaseFile }) => {
    const updated = {
      ...task.caseObj,
      tasks: (task.caseObj.tasks || []).map(t =>
        t.id === task.id ? { ...t, status: 'completed' as TaskStatus, completedDate: new Date().toISOString() } : t
      ),
    };
    onUpdateCase(updated);
  };

  const handleReopen = (task: CaseTask & { caseObj: CaseFile }) => {
    const updated = {
      ...task.caseObj,
      tasks: (task.caseObj.tasks || []).map(t =>
        t.id === task.id ? { ...t, status: 'open' as TaskStatus, completedDate: undefined } : t
      ),
    };
    onUpdateCase(updated);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div>
        <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Tasks & Reminders</h1>
        <p className="text-stone-500 mt-2 text-lg">Track follow-ups, deadlines, and case action items.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Open Tasks</div>
          <div className="text-3xl font-bold text-stone-900">{openCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-rose-200 p-5">
          <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Overdue</div>
          <div className="text-3xl font-bold text-rose-600">{overdueCount}</div>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">Completed</div>
          <div className="text-3xl font-bold text-emerald-600">{completedCount}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center bg-white p-2 rounded-xl border border-stone-200 w-fit">
        <div className="px-2">
          <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Filters:</span>
        </div>
        {(['all', 'overdue', 'today', 'upcoming'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              filter === f ? 'bg-black text-white' : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            {f === 'all' ? 'All' : f === 'overdue' ? `Overdue (${overdueCount})` : f === 'today' ? 'Due Today' : 'Upcoming'}
          </button>
        ))}
        <select
          className="bg-stone-50 border border-stone-200 text-stone-700 text-sm rounded-lg p-2 outline-none cursor-pointer"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="ALL">All Types</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <select
          className="bg-stone-50 border border-stone-200 text-stone-700 text-sm rounded-lg p-2 outline-none cursor-pointer"
          value={memberFilter}
          onChange={e => setMemberFilter(e.target.value)}
        >
          <option value="ALL">All Assignees</option>
          <option value="Unassigned">Unassigned</option>
          {firmMembers.map(m => (
            <option key={m.user_id} value={m.user_id}>
              {m.user_profiles?.full_name || m.user_profiles?.email || 'Unknown'}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        {filteredTasks.length === 0 ? (
          <div className="p-16 text-center text-stone-400">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-lg font-medium text-stone-600">No tasks match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredTasks.map(task => {
              const days = getDaysUntil(task.dueDate);
              const isOverdue = task.status !== 'completed' && days < 0;
              const isDueToday = days === 0;
              const isCompleted = task.status === 'completed';

              return (
                <div key={task.id} className={`px-6 py-4 flex items-center gap-4 hover:bg-stone-50 transition-colors ${isCompleted ? 'opacity-50' : ''}`}>
                  <button
                    onClick={() => isCompleted ? handleReopen(task) : handleComplete(task)}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-stone-300 hover:border-emerald-400'
                    }`}
                  >
                    {isCompleted && (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${isCompleted ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                        {task.title}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[task.type]}`}>
                        {TYPE_LABELS[task.type]}
                      </span>
                      {task.priority === 'high' && !isCompleted && (
                        <svg className={`w-4 h-4 ${PRIORITY_COLORS[task.priority]}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/></svg>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-stone-500 mt-0.5 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => onSelectCase(task.caseObj)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
                      >
                        {task.caseName}
                      </button>
                      <MemberPicker
                        compact
                        value={task.assignedTo || null}
                        onChange={(member) => {
                          const updated = {
                            ...task.caseObj,
                            tasks: (task.caseObj.tasks || []).map(t =>
                              t.id === task.id ? { ...t, assignedTo: member || undefined } : t
                            ),
                          };
                          onUpdateCase(updated);
                        }}
                      />
                      {task.recurrence && task.recurrence !== 'one-time' && (
                        <span className="text-[10px] text-stone-400 font-medium flex items-center gap-0.5">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          {task.recurrence}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-bold ${
                      isCompleted ? 'text-emerald-500' :
                      isOverdue ? 'text-rose-600' :
                      isDueToday ? 'text-amber-600' :
                      'text-stone-500'
                    }`}>
                      {isCompleted
                        ? 'Done'
                        : isOverdue
                        ? `${Math.abs(days)}d overdue`
                        : isDueToday
                        ? 'Due today'
                        : `${days}d left`}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
