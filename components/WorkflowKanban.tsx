import React, { useState } from 'react';
import { CaseFile, CaseTask, TaskType, ActivityLog, MedicalProvider, ERVisit, TeamNote, ChatMessage } from '../types';
import {
  getWorkflowProgress,
  WorkflowStageProgress,
  WorkflowCheckItem,
  WorkflowItemAction,
} from '../services/workflowEngine';
import { WorkflowActionModal, WorkflowActionType } from './WorkflowActionModal';
import { PreservationOfEvidencePanel } from './PreservationOfEvidencePanel';

interface WorkflowKanbanProps {
  caseData: CaseFile;
  onUpdateCase: (c: CaseFile) => void;
}

interface ActiveAction {
  type: WorkflowActionType;
  provider?: MedicalProvider;
  erVisit?: ERVisit;
}

const STAGE_COLORS: Record<WorkflowStageProgress['status'], { header: string; dot: string; border: string }> = {
  complete: { header: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  active: { header: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500', border: 'border-blue-200' },
  pending: { header: 'bg-slate-50 border-slate-200', dot: 'bg-slate-300', border: 'border-slate-200' },
  blocked: { header: 'bg-slate-50 border-slate-100', dot: 'bg-slate-200', border: 'border-slate-100' },
};

const ACTION_LABELS: Record<WorkflowItemAction, string> = {
  lor_defendant: 'Generate',
  lor_client_ins: 'Generate',
  crash_report: 'FOIA',
  hipaa: 'Form',
  bill_request: 'Request',
  records_request: 'Request',
  er_bill_request: 'Request',
  er_records_request: 'Request',
};

const STAGE_TASK_TYPES: Record<string, TaskType[]> = {
  intake: ['retainer', 'lor_defendant', 'lor_client_ins', 'hipaa'],
  client_contact: ['contact_client', 'verify_insurance'],
  intake_processing: ['complete_intake_form', 'create_cms_case', 'upload_case_files', 'upload_intake_form'],
  investigation: ['crash_report_request', 'crash_report_received'],
  insurance: ['coverage_followup', 'liability_followup', 'policy_limits'],
  medical_setup: ['send_hipaa_to_medical', 'send_demographics', 'check_er_ambulance'],
  treatment: ['treatment_followup', 'client_communication'],
  records_requests: ['mass_order_records', 'bill_request', 'records_request'],
  records_collection: ['receive_records_bills'],
  pre_demand: ['specials_compile', 'medical_summary', 'demand_review'],
  demand: ['demand_prep'],
};

function getStageKeywords(stageId: string): string[] {
  const map: Record<string, string[]> = {
    intake: ['retainer', 'lor', 'letter of representation', 'hipaa', 'intake', 'signed'],
    client_contact: ['client', 'contact', 'call', 'phone', 'insurance', 'verify'],
    intake_processing: ['intake form', 'cms', 'upload', 'case file'],
    investigation: ['crash', 'police', 'report', 'foia', 'evidence', 'investigation'],
    insurance: ['coverage', 'liability', 'policy', 'adjuster', 'claim', 'insurance'],
    medical_setup: ['hipaa', 'demographics', 'er ', 'ambulance', 'medical setup'],
    treatment: ['treatment', 'therapy', 'doctor', 'appointment', 'medical'],
    records_requests: ['records', 'bills', 'request', 'order'],
    records_collection: ['received', 'records', 'bills', 'collection'],
    pre_demand: ['specials', 'summary', 'demand', 'review'],
    demand: ['demand', 'letter', 'settlement', 'offer'],
  };
  return map[stageId] || [];
}

function getRelevantTasks(caseData: CaseFile, stageId: string): CaseTask[] {
  const taskTypes = STAGE_TASK_TYPES[stageId] || [];
  const keywords = getStageKeywords(stageId);
  return (caseData.tasks || [])
    .filter(t => {
      if (taskTypes.includes(t.type)) return true;
      const titleLower = (t.title || '').toLowerCase();
      return keywords.some(kw => titleLower.includes(kw));
    })
    .sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);
}

function getRelevantActivity(caseData: CaseFile, stageId: string): ActivityLog[] {
  const keywords = getStageKeywords(stageId);
  return (caseData.activityLog || [])
    .filter(a => {
      const msgLower = a.message.toLowerCase();
      return keywords.some(kw => msgLower.includes(kw));
    })
    .slice(0, 5);
}

function getRelevantNotes(caseData: CaseFile, stageId: string): TeamNote[] {
  const keywords = getStageKeywords(stageId);
  return (caseData.teamNotes || [])
    .filter(n => {
      const contentLower = n.content.toLowerCase();
      return keywords.some(kw => contentLower.includes(kw));
    })
    .slice(0, 5);
}

function getRelevantChats(caseData: CaseFile, stageId: string): ChatMessage[] {
  const keywords = getStageKeywords(stageId);
  return (caseData.chatHistory || [])
    .filter(c => {
      const msgLower = c.message.toLowerCase();
      return keywords.some(kw => msgLower.includes(kw));
    })
    .slice(0, 5);
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const WorkflowKanban: React.FC<WorkflowKanbanProps> = ({ caseData, onUpdateCase }) => {
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [showPreservation, setShowPreservation] = useState(false);

  const stages = getWorkflowProgress(caseData);

  const handleComplete = (item: WorkflowCheckItem) => {
    if (item.done || !item.taskType) return;
    setCompletingId(item.id);
    setTimeout(() => {
      const existing = (caseData.tasks || []).find(t => t.type === item.taskType && t.status !== 'completed');
      let updated: CaseFile;
      if (existing) {
        updated = {
          ...caseData,
          tasks: (caseData.tasks || []).map(t =>
            t.id === existing.id
              ? { ...t, status: 'completed' as const, completedDate: new Date().toISOString() }
              : t
          ),
        };
      } else {
        const newTask: CaseTask = {
          id: `wf-done-${item.taskType}-${Date.now()}`,
          caseId: caseData.id,
          title: `${(item.taskType as string).replace(/_/g, ' ')} completed`,
          type: item.taskType,
          status: 'completed',
          dueDate: new Date().toISOString().split('T')[0],
          completedDate: new Date().toISOString(),
          priority: 'medium',
          recurrence: 'one-time',
          createdAt: new Date().toISOString(),
          autoGenerated: true,
        };
        updated = { ...caseData, tasks: [...(caseData.tasks || []), newTask] };
      }
      onUpdateCase(updated);
      setCompletingId(null);
    }, 250);
  };

  const openAction = (action: WorkflowItemAction, providerId?: string, erVisitId?: string) => {
    if (action === 'preservation_of_evidence') {
      setShowPreservation(true);
      return;
    }
    const provider = providerId ? (caseData.medicalProviders || []).find(p => p.id === providerId) : undefined;
    const erVisit = erVisitId ? (caseData.erVisits || []).find(v => v.id === erVisitId) : undefined;
    setActiveAction({ type: action as WorkflowActionType, provider, erVisit });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto pb-4 -mx-2 px-2">
        <div className="flex gap-4" style={{ minWidth: stages.length * 260 }}>
          {stages.map(stage => {
            const colors = STAGE_COLORS[stage.status];
            const doneCount = stage.items.filter(i => i.done).length;
            const todoItems = stage.items.filter(i => !i.done);
            const doneItems = stage.items.filter(i => i.done);
            const isExpanded = expandedStage === stage.stage;

            const relevantTasks = isExpanded ? getRelevantTasks(caseData, stage.stage) : [];
            const relevantActivity = isExpanded ? getRelevantActivity(caseData, stage.stage) : [];
            const relevantNotes = isExpanded ? getRelevantNotes(caseData, stage.stage) : [];
            const relevantChats = isExpanded ? getRelevantChats(caseData, stage.stage) : [];
            const hasDetails = relevantTasks.length > 0 || relevantActivity.length > 0 || relevantNotes.length > 0 || relevantChats.length > 0;

            return (
              <div
                key={stage.stage}
                className={`flex-shrink-0 bg-white rounded-xl border ${colors.border} flex flex-col max-h-[70vh] transition-all duration-200 ${
                  isExpanded ? 'w-[380px]' : 'w-[260px]'
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-t-xl border-b ${colors.header} cursor-pointer`}
                  onClick={() => setExpandedStage(isExpanded ? null : stage.stage)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <h4 className="font-bold text-sm text-slate-800 truncate flex-1">{stage.label}</h4>
                    {(() => {
                      const missing = stage.infoFields?.filter(f => f.status === 'missing') || [];
                      return missing.length > 0 && stage.status !== 'complete' ? (
                        <span className="text-[9px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {missing.length} missing
                        </span>
                      ) : null;
                    })()}
                    <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-500 leading-tight truncate flex-1 mr-2">{stage.description}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      stage.status === 'complete'
                        ? 'bg-emerald-100 text-emerald-700'
                        : stage.status === 'active'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {doneCount}/{stage.items.length}
                    </span>
                  </div>
                  {stage.contacts && stage.contacts.length > 0 && stage.status !== 'complete' && (
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/50">
                      <div className="flex -space-x-1">
                        {stage.contacts.slice(0, 3).map((ct, i) => (
                          <div key={i} className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center" title={ct.name}>
                            <span className="text-[7px] font-bold text-slate-600">
                              {ct.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-500 truncate">
                        {stage.contacts.map(ct => ct.name.split(' ')[0]).join(', ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {todoItems.map(item => (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      completing={completingId === item.id}
                      onComplete={() => handleComplete(item)}
                      onAction={item.action ? () => openAction(item.action!, item.providerId, item.erVisitId) : undefined}
                      actionLabel={item.action ? ACTION_LABELS[item.action] : undefined}
                    />
                  ))}

                  {doneItems.length > 0 && todoItems.length > 0 && (
                    <div className="flex items-center gap-2 py-1.5 px-1">
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Completed</span>
                      <div className="flex-1 h-px bg-slate-100" />
                    </div>
                  )}

                  {doneItems.map(item => (
                    <KanbanCard
                      key={item.id}
                      item={item}
                      completing={false}
                      onComplete={() => {}}
                    />
                  ))}

                  {stage.items.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400">No items</div>
                  )}

                  {isExpanded && (
                    <StageDetailPanel
                      tasks={relevantTasks}
                      activity={relevantActivity}
                      notes={relevantNotes}
                      chats={relevantChats}
                      hasDetails={hasDetails}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activeAction && (
        <WorkflowActionModal
          isOpen={true}
          onClose={() => setActiveAction(null)}
          caseData={caseData}
          actionType={activeAction.type}
          provider={activeAction.provider}
          erVisit={activeAction.erVisit}
          onUpdateCase={(updated) => {
            onUpdateCase(updated);
            setActiveAction(null);
          }}
        />
      )}

      {showPreservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="font-bold text-lg text-slate-800">Preservation of Evidence</h3>
              <button onClick={() => setShowPreservation(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <PreservationOfEvidencePanel caseData={caseData} onUpdateCase={onUpdateCase} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface StageDetailPanelProps {
  tasks: CaseTask[];
  activity: ActivityLog[];
  notes: TeamNote[];
  chats: ChatMessage[];
  hasDetails: boolean;
}

const StageDetailPanel: React.FC<StageDetailPanelProps> = ({ tasks, activity, notes, chats, hasDetails }) => {
  const defaultTab = tasks.length > 0 ? 'tasks' : activity.length > 0 ? 'activity' : notes.length > 0 ? 'notes' : 'chats';
  const [activeTab, setActiveTab] = useState<'tasks' | 'activity' | 'notes' | 'chats'>(defaultTab);

  if (!hasDetails) {
    return (
      <div className="mt-2 pt-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center py-3 italic">No recent activity for this stage</p>
      </div>
    );
  }

  const tabs = [
    { id: 'tasks' as const, label: 'Tasks', count: tasks.length },
    { id: 'activity' as const, label: 'Activity', count: activity.length },
    { id: 'notes' as const, label: 'Notes', count: notes.length },
    { id: 'chats' as const, label: 'Chats', count: chats.length },
  ].filter(t => t.count > 0);

  const resolvedTab = tabs.find(t => t.id === activeTab) ? activeTab : (tabs[0]?.id || 'tasks');

  return (
    <div className="mt-2 pt-2 border-t border-dashed border-slate-200 animate-in fade-in duration-200">
      <div className="flex gap-0.5 mb-2 bg-slate-50 rounded-lg p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-[10px] font-semibold py-1.5 px-1 rounded-md transition-all ${
              resolvedTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-0.5 text-[8px] ${resolvedTab === tab.id ? 'text-blue-600' : 'text-slate-300'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {resolvedTab === 'tasks' && tasks.map(task => (
          <div key={task.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              task.status === 'completed' ? 'bg-emerald-500' : task.status === 'overdue' ? 'bg-rose-500' : 'border-2 border-slate-300'
            }`}>
              {task.status === 'completed' && (
                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {task.status === 'overdue' && (
                <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-medium leading-tight ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {task.priority === 'high' && (
                  <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">HIGH</span>
                )}
                <span className="text-[9px] text-slate-400">
                  {task.status === 'completed' && task.completedDate
                    ? `Done ${formatTimeAgo(task.completedDate)}`
                    : `Due ${task.dueDate}`
                  }
                </span>
              </div>
            </div>
          </div>
        ))}

        {resolvedTab === 'activity' && activity.map(a => (
          <div key={a.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              a.type === 'system' ? 'bg-blue-100' : a.type === 'note' ? 'bg-amber-100' : 'bg-slate-100'
            }`}>
              {a.type === 'system' ? (
                <svg className="w-2 h-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ) : (
                <svg className="w-2 h-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-600 leading-tight">{a.message}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {a.author && <span className="text-[9px] font-medium text-slate-500">{a.author}</span>}
                <span className="text-[9px] text-slate-400">{formatTimeAgo(a.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}

        {resolvedTab === 'notes' && notes.map(note => (
          <div key={note.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-[7px] font-bold text-amber-800">{note.authorInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-700 leading-tight">{note.content}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-medium text-amber-700">{note.authorName}</span>
                <span className="text-[9px] text-slate-400">{formatTimeAgo(note.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}

        {resolvedTab === 'chats' && chats.map(chat => (
          <div key={chat.id} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg border ${
            chat.isCurrentUser ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50/70 border-slate-100'
          }`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              chat.isCurrentUser ? 'bg-blue-200' : 'bg-slate-200'
            }`}>
              <span className={`text-[7px] font-bold ${chat.isCurrentUser ? 'text-blue-800' : 'text-slate-600'}`}>
                {chat.senderInitials}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-700 leading-tight">{chat.message}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[9px] font-medium text-slate-500">{chat.sender}</span>
                <span className="text-[9px] text-slate-400">{formatTimeAgo(chat.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

interface KanbanCardProps {
  item: WorkflowCheckItem;
  completing: boolean;
  onComplete: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ item, completing, onComplete, onAction, actionLabel }) => {
  if (item.done) {
    return (
      <div className="bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 opacity-60">
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="text-xs text-slate-400 line-through leading-tight">{item.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg px-3 py-2.5 border transition-all ${
      item.urgent
        ? 'bg-amber-50 border-amber-200 shadow-sm shadow-amber-100'
        : 'bg-white border-slate-150 hover:border-blue-200 hover:shadow-sm'
    }`}>
      <div className="flex items-start gap-2">
        <button
          onClick={onComplete}
          disabled={!item.taskType}
          className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all ${
            completing
              ? 'border-emerald-400 bg-emerald-100'
              : item.urgent
              ? 'border-amber-400 hover:bg-amber-100'
              : item.taskType
              ? 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
              : 'border-slate-200'
          }`}
        />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-800 leading-tight">{item.label}</p>
          {item.detail && (
            <p className={`text-[10px] mt-0.5 ${item.urgent ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>
              {item.detail}
            </p>
          )}
          {item.contact && (
            <p className="text-[9px] text-slate-400 mt-0.5 truncate">
              {item.contact.name}{item.contact.phone ? ` - ${item.contact.phone}` : ''}
            </p>
          )}
        </div>
      </div>

      {item.infoNeeded && item.infoNeeded.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 ml-6">
          {item.infoNeeded.slice(0, 3).map((info, i) => (
            <span key={i} className="text-[8px] bg-rose-50 text-rose-500 border border-rose-100 px-1 py-0.5 rounded font-medium">
              {info}
            </span>
          ))}
          {item.infoNeeded.length > 3 && (
            <span className="text-[8px] text-slate-400">+{item.infoNeeded.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 mt-2">
        {item.urgent && (
          <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">
            Follow Up
          </span>
        )}
        {onAction && actionLabel && (
          <button
            onClick={e => { e.stopPropagation(); onAction(); }}
            className="ml-auto text-[10px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
          >
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
