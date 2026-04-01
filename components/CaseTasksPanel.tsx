import React, { useState } from 'react';
import { CaseFile, CaseTask, TaskType, TaskStatus, ActivityLog, Assignee } from '../types';
import { MemberPicker } from './MemberPicker';
import { useAuth } from '../contexts/AuthContext';

interface CaseTasksPanelProps {
  caseData: CaseFile;
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

function getDaysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
}

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

export const CaseTasksPanel: React.FC<CaseTasksPanelProps> = ({ caseData, onUpdateCase }) => {
  const { profile } = useAuth();
  const authorName = profile?.full_name || profile?.email || 'Unknown User';
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'general' as TaskType,
    dueDate: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    recurrence: 'one-time' as 'one-time' | 'weekly' | 'monthly',
    assignedTo: null as Assignee | null,
  });

  const tasks = caseData.tasks || [];
  const openTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const inputClass = "w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  const handleAdd = () => {
    if (!form.title.trim() || !form.dueDate) return;
    const task: CaseTask = {
      id: `task-${Date.now()}`,
      caseId: caseData.id,
      title: form.title,
      description: form.description,
      type: form.type,
      status: 'open',
      dueDate: form.dueDate,
      assignedTeam: caseData.assignedTeam,
      assignedTo: form.assignedTo || caseData.assignedTo,
      recurrence: form.recurrence,
      priority: form.priority,
      createdAt: new Date().toISOString(),
    };
    let updated = { ...caseData, tasks: [...tasks, task] };
    updated = addActivity(updated, `Task created: "${form.title}"`, authorName);
    onUpdateCase(updated);
    setForm({ title: '', description: '', type: 'general', dueDate: '', priority: 'medium', recurrence: 'one-time', assignedTo: null });
    setShowAdd(false);
  };

  const handleComplete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    let updated = {
      ...caseData,
      tasks: tasks.map(t => t.id === id ? { ...t, status: 'completed' as TaskStatus, completedDate: new Date().toISOString() } : t),
    };
    if (task) updated = addActivity(updated, `Task completed: "${task.title}"`, authorName);
    onUpdateCase(updated);
  };

  const handleReopen = (id: string) => {
    const updated = {
      ...caseData,
      tasks: tasks.map(t => t.id === id ? { ...t, status: 'open' as TaskStatus, completedDate: undefined } : t),
    };
    onUpdateCase(updated);
  };

  const handleDelete = (id: string) => {
    const updated = {
      ...caseData,
      tasks: tasks.filter(t => t.id !== id),
    };
    onUpdateCase(updated);
  };

  const generateAutoTasks = () => {
    const newTasks: CaseTask[] = [];
    const now = new Date().toISOString();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const defIns = (caseData.insurance || []).find(i => i.type === 'Defendant');
    if (defIns && (!defIns.coverageStatus || defIns.coverageStatus === 'pending')) {
      if (!tasks.some(t => t.type === 'coverage_followup' && t.status !== 'completed')) {
        newTasks.push({
          id: `task-auto-cov-${Date.now()}`,
          caseId: caseData.id,
          title: `Follow up on coverage with ${defIns.provider || 'insurer'}`,
          type: 'coverage_followup',
          status: 'open',
          dueDate: nextWeek,
          priority: 'high',
          recurrence: 'weekly',
          createdAt: now,
          autoGenerated: true,
        });
      }
    }

    if (defIns && (!defIns.liabilityStatus || defIns.liabilityStatus === 'pending')) {
      if (!tasks.some(t => t.type === 'liability_followup' && t.status !== 'completed')) {
        newTasks.push({
          id: `task-auto-liab-${Date.now() + 1}`,
          caseId: caseData.id,
          title: `Follow up on liability acceptance with ${defIns.provider || 'insurer'}`,
          type: 'liability_followup',
          status: 'open',
          dueDate: nextWeek,
          priority: 'high',
          recurrence: 'weekly',
          createdAt: now,
          autoGenerated: true,
        });
      }
    }

    if (caseData.mriCompleted && defIns && (!defIns.policyLimitsStatus || defIns.policyLimitsStatus === 'not_requested')) {
      if (!tasks.some(t => t.type === 'policy_limits' && t.status !== 'completed')) {
        newTasks.push({
          id: `task-auto-limits-${Date.now() + 2}`,
          caseId: caseData.id,
          title: 'Request policy limits (MRI completed)',
          description: 'Send MRI bill and record to insurer to request policy limits',
          type: 'policy_limits',
          status: 'open',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          priority: 'high',
          recurrence: 'one-time',
          createdAt: now,
          autoGenerated: true,
        });
      }
    }

    for (const visit of (caseData.erVisits || [])) {
      for (const bill of visit.bills) {
        if (bill.status === 'requested' && bill.requestDate) {
          const daysSince = Math.floor((Date.now() - new Date(bill.requestDate).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSince > 30 && !tasks.some(t => t.type === 'er_bills' && t.title.includes(visit.facilityName) && t.title.includes(bill.type) && t.status !== 'completed')) {
            newTasks.push({
              id: `task-auto-er-${Date.now() + Math.random()}`,
              caseId: caseData.id,
              title: `Follow up: ${visit.facilityName} ${bill.type} bill (${daysSince}d overdue)`,
              type: 'er_bills',
              status: 'open',
              dueDate: nextWeek,
              priority: 'high',
              recurrence: 'weekly',
              createdAt: now,
              autoGenerated: true,
            });
          }
        }
      }
    }

    if (newTasks.length > 0) {
      let updated = { ...caseData, tasks: [...tasks, ...newTasks] };
      updated = addActivity(updated, `${newTasks.length} auto-generated task(s) created`);
      onUpdateCase(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-stone-900 text-lg">Case Tasks</h3>
          <p className="text-xs text-stone-500">{openTasks.length} open, {completedTasks.length} completed</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generateAutoTasks} className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Auto-Generate
          </button>
          <button onClick={() => setShowAdd(true)} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Add Task</button>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-stone-800">New Task</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Title</label>
              <input className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Follow up on coverage..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Description</label>
              <textarea className={inputClass + ' h-16 resize-none'} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Type</label>
              <select className={inputClass} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as TaskType })}>
                {Object.entries(TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Due Date</label>
              <input type="date" className={inputClass} value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Priority</label>
              <select className={inputClass} value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as 'high' | 'medium' | 'low' })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Recurrence</label>
              <select className={inputClass} value={form.recurrence} onChange={e => setForm({ ...form, recurrence: e.target.value as 'one-time' | 'weekly' | 'monthly' })}>
                <option value="one-time">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Assign To</label>
              <MemberPicker
                value={form.assignedTo}
                onChange={(member) => setForm({ ...form, assignedTo: member })}
                placeholder="Assign member"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 rounded-lg">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title.trim() || !form.dueDate} className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40">Add Task</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {openTasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(task => {
          const days = getDaysUntil(task.dueDate);
          const isOverdue = days < 0;
          return (
            <div key={task.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${isOverdue ? 'border-rose-200' : 'border-stone-200'}`}>
              <button onClick={() => handleComplete(task.id)} className="w-5 h-5 rounded-full border-2 border-stone-300 hover:border-emerald-400 flex-shrink-0 transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-stone-900">{task.title}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[task.type]}`}>{TYPE_LABELS[task.type]}</span>
                  {task.priority === 'high' && <svg className="w-4 h-4 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/></svg>}
                  {task.autoGenerated && <span className="text-[10px] text-stone-400">auto</span>}
                </div>
                {task.description && <p className="text-xs text-stone-500 mt-0.5">{task.description}</p>}
              </div>
              <div className="flex-shrink-0">
                <MemberPicker
                  compact
                  value={task.assignedTo || null}
                  onChange={(member) => {
                    const updatedTasks = tasks.map(t => t.id === task.id ? { ...t, assignedTo: member || undefined } : t);
                    onUpdateCase({ ...caseData, tasks: updatedTasks });
                  }}
                />
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-xs font-bold ${isOverdue ? 'text-rose-600' : days === 0 ? 'text-amber-600' : 'text-stone-500'}`}>
                  {isOverdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Due today' : `${days}d`}
                </div>
              </div>
              <button onClick={() => handleDelete(task.id)} className="text-stone-300 hover:text-rose-500 transition-colors flex-shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          );
        })}
      </div>

      {completedTasks.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Completed ({completedTasks.length})</h4>
          <div className="space-y-2">
            {completedTasks.slice(0, 5).map(task => (
              <div key={task.id} className="bg-stone-50 rounded-xl border border-stone-100 p-4 flex items-center gap-4 opacity-60">
                <button onClick={() => handleReopen(task.id)} className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </button>
                <span className="text-sm font-medium text-stone-500 line-through flex-1">{task.title}</span>
                <span className="text-xs text-stone-400">{task.completedDate ? new Date(task.completedDate).toLocaleDateString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
