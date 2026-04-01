import React, { useState, useEffect } from 'react';
import { CaseFile, CaseTask, TaskType, ActivityLog, MedicalProvider, ERVisit, CommunicationLog } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  getWorkflowProgress,
  generateInitialWorkflowTasks,
  generateReminderTasks,
  WorkflowStageProgress,
  WorkflowItemAction,
  ContactInfo,
} from '../services/workflowEngine';
import { WorkflowActionModal, WorkflowActionType } from './WorkflowActionModal';
import { WorkflowKanban } from './WorkflowKanban';
import { WorkflowStageCard } from './WorkflowStageCard';
import { ContactActionModal } from './ContactActionModal';
import { PreservationOfEvidencePanel } from './PreservationOfEvidencePanel';

interface CaseWorkflowProps {
  caseData: CaseFile;
  onUpdateCase: (c: CaseFile) => void;
}

interface ActiveAction {
  type: WorkflowActionType;
  provider?: MedicalProvider;
  erVisit?: ERVisit;
}

interface ContactModalState {
  contact: ContactInfo;
  mode: 'call' | 'sms' | 'email';
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

const STATUS_COLORS: Record<WorkflowStageProgress['status'], string> = {
  complete: 'bg-emerald-500 text-white border-emerald-500',
  active: 'bg-blue-600 text-white border-blue-600',
  pending: 'bg-white text-stone-400 border-stone-200',
  blocked: 'bg-white text-stone-300 border-stone-100',
};

const STATUS_CONNECTOR: Record<WorkflowStageProgress['status'], string> = {
  complete: 'bg-emerald-400',
  active: 'bg-gradient-to-r from-emerald-400 to-blue-300',
  pending: 'bg-stone-100',
  blocked: 'bg-stone-100',
};

const ACTION_LABELS: Record<WorkflowItemAction, string> = {
  lor_defendant: 'Generate & Send',
  lor_client_ins: 'Generate & Send',
  crash_report: 'Generate FOIA',
  hipaa: 'Generate Form',
  bill_request: 'Request Bill',
  records_request: 'Request Records',
  er_bill_request: 'Request ER Bill',
  er_records_request: 'Request Records',
  medical_bill_request: 'Request Records & Bills',
  preservation_of_evidence: 'Send POE Letter',
};

type ViewMode = 'checklist' | 'kanban';

export const CaseWorkflow: React.FC<CaseWorkflowProps> = ({ caseData, onUpdateCase }) => {
  const { profile } = useAuth();
  const authorName = profile?.full_name || profile?.email || 'Unknown User';
  const [viewMode, setViewMode] = useState<ViewMode>('checklist');
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [completingItem, setCompletingItem] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveAction | null>(null);
  const [showPreservation, setShowPreservation] = useState(false);
  const [contactModal, setContactModal] = useState<ContactModalState | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callNote, setCallNote] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  useEffect(() => {
    let interval: any;
    if (isCallActive) {
      interval = setInterval(() => setCallTimer(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const stages = getWorkflowProgress(caseData);
  const totalItems = stages.reduce((s, st) => s + st.totalItems, 0);
  const completedItems = stages.reduce((s, st) => s + st.completedItems, 0);
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const handleGenerateTasks = () => {
    const newTasks = generateInitialWorkflowTasks(caseData);
    const reminders = generateReminderTasks(caseData);
    const all = [...newTasks, ...reminders];
    if (all.length === 0) return;
    let updated = {
      ...caseData,
      workflowInitialized: true,
      tasks: [...(caseData.tasks || []), ...all],
    };
    updated = addActivity(updated, `${all.length} workflow task(s) generated`);
    onUpdateCase(updated);
  };

  const handleCheckReminders = () => {
    const reminders = generateReminderTasks(caseData);
    if (reminders.length === 0) {
      alert('No new reminders needed at this time.');
      return;
    }
    let updated = {
      ...caseData,
      tasks: [...(caseData.tasks || []), ...reminders],
    };
    updated = addActivity(updated, `${reminders.length} reminder task(s) generated`);
    onUpdateCase(updated);
  };

  const handleMarkItemDone = (itemId: string, taskType?: TaskType) => {
    setCompletingItem(itemId);
    setTimeout(() => {
      if (taskType) {
        const existing = (caseData.tasks || []).find(t => t.type === taskType && t.status !== 'completed');
        if (existing) {
          const updated = {
            ...caseData,
            tasks: (caseData.tasks || []).map(t =>
              t.id === existing.id
                ? { ...t, status: 'completed' as const, completedDate: new Date().toISOString() }
                : t
            ),
          };
          onUpdateCase(updated);
        } else {
          const newTask: CaseTask = {
            id: `wf-done-${taskType}-${Date.now()}`,
            caseId: caseData.id,
            title: `${taskType.replace(/_/g, ' ')} completed`,
            type: taskType,
            status: 'completed',
            dueDate: new Date().toISOString().split('T')[0],
            completedDate: new Date().toISOString(),
            priority: 'medium',
            recurrence: 'one-time',
            createdAt: new Date().toISOString(),
            autoGenerated: true,
          };
          const updated = {
            ...caseData,
            tasks: [...(caseData.tasks || []), newTask],
          };
          onUpdateCase(updated);
        }
      }
      setCompletingItem(null);
    }, 300);
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

  const handleCall = (contact: ContactInfo) => {
    setContactModal({ contact, mode: 'call' });
    setCallTimer(0);
    setIsCallActive(false);
    setCallNote('');
  };

  const handleEmail = (contact: ContactInfo) => {
    setContactModal({ contact, mode: 'email' });
    setEmailSubject('');
    setEmailBody('');
  };

  const handleText = (contact: ContactInfo) => {
    setContactModal({ contact, mode: 'sms' });
    setSmsMessage('');
  };

  const handleSaveCall = () => {
    if (!contactModal) return;
    const newLog: CommunicationLog = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'call',
      direction: 'outbound',
      contactName: contactModal.contact.name,
      contactPhone: contactModal.contact.phone || '',
      timestamp: new Date().toISOString(),
      duration: formatTime(callTimer),
      status: 'completed',
      content: callNote || 'No notes provided.',
    };
    let updated = {
      ...caseData,
      communications: [newLog, ...(caseData.communications || [])],
    };
    updated = addActivity(updated, `Outbound call to ${contactModal.contact.name}`, authorName);
    onUpdateCase(updated);
    setContactModal(null);
  };

  const handleSendSMS = () => {
    if (!contactModal || !smsMessage.trim()) return;
    const newLog: CommunicationLog = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'sms',
      direction: 'outbound',
      contactName: contactModal.contact.name,
      contactPhone: contactModal.contact.phone || '',
      timestamp: new Date().toISOString(),
      status: 'sent',
      content: smsMessage,
    };
    let updated = {
      ...caseData,
      communications: [newLog, ...(caseData.communications || [])],
    };
    updated = addActivity(updated, `SMS sent to ${contactModal.contact.name}`, authorName);
    onUpdateCase(updated);
    setContactModal(null);
  };

  const handleSendEmail = () => {
    if (!contactModal || !emailBody.trim()) return;
    let updated = addActivity(caseData, `Email sent to ${contactModal.contact.name} (${contactModal.contact.email})`, authorName);
    onUpdateCase(updated);
    setContactModal(null);
  };

  const overdueCount = (caseData.tasks || []).filter(t => {
    if (t.status === 'completed') return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">Case Workflow</h3>
            <p className="text-sm text-stone-500 mt-0.5">
              {completedItems} of {totalItems} steps completed
              {overdueCount > 0 && (
                <span className="ml-2 text-rose-600 font-medium">· {overdueCount} overdue</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-stone-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('checklist')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'checklist'
                    ? 'bg-white text-stone-800 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                Checklist
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'kanban'
                    ? 'bg-white text-stone-800 shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                Kanban
              </button>
            </div>
            <button
              onClick={handleCheckReminders}
              className="px-3.5 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Check Reminders
            </button>
            {!caseData.workflowInitialized && (
              <button
                onClick={handleGenerateTasks}
                className="px-3.5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Initialize Workflow
              </button>
            )}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-stone-500">Overall Progress</span>
          <span className="text-xs font-bold text-stone-700">{overallPct}%</span>
        </div>
        <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${overallPct}%` }}
          />
        </div>

        {viewMode === 'checklist' && (
          <div className="flex items-start gap-0 overflow-x-auto pb-2">
            {stages.map((stage, idx) => (
              <React.Fragment key={stage.stage}>
                <button
                  onClick={() => setExpandedStage(expandedStage === stage.stage ? null : stage.stage)}
                  className="flex flex-col items-center flex-shrink-0 group"
                  style={{ minWidth: 80 }}
                >
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${STATUS_COLORS[stage.status]}`}>
                    {stage.status === 'complete' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    ) : stage.status === 'active' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stage.icon} /></svg>
                    ) : (
                      <span className="text-xs font-bold">{idx + 1}</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-semibold mt-1.5 text-center leading-tight transition-colors ${stage.status === 'complete' ? 'text-emerald-600' : stage.status === 'active' ? 'text-blue-700' : 'text-stone-400'}`}>
                    {stage.label}
                  </span>
                  {stage.status !== 'complete' && stage.status !== 'blocked' && (
                    <span className="text-[10px] text-stone-400">{stage.completedItems}/{stage.totalItems}</span>
                  )}
                </button>
                {idx < stages.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-5 mx-1 min-w-3 rounded-full ${STATUS_CONNECTOR[stages[idx + 1].status]}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'kanban' && (
        <WorkflowKanban caseData={caseData} onUpdateCase={onUpdateCase} />
      )}

      {viewMode === 'checklist' && stages.map(stage => (
        expandedStage === stage.stage || stage.status === 'active' ? (
          <WorkflowStageCard
            key={stage.stage}
            stage={stage}
            caseData={caseData}
            isExpanded={expandedStage === stage.stage}
            onToggle={() => setExpandedStage(expandedStage === stage.stage ? null : stage.stage)}
            onMarkDone={handleMarkItemDone}
            completingItem={completingItem}
            onAction={openAction}
            onCall={handleCall}
            onEmail={handleEmail}
            onText={handleText}
            actionLabels={ACTION_LABELS}
          />
        ) : null
      ))}

      {viewMode === 'checklist' && <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-stone-50 transition-colors"
          onClick={() => setExpandedStage(expandedStage === '__all__' ? null : '__all__')}
        >
          <span className="font-semibold text-stone-700 text-sm">All Stages</span>
          <svg className={`w-4 h-4 text-stone-400 transition-transform ${expandedStage === '__all__' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {expandedStage === '__all__' && (
          <div className="divide-y divide-stone-100">
            {stages.map(stage => (
              <div key={stage.stage} className="px-6 py-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${STATUS_COLORS[stage.status]}`}>
                    {stage.status === 'complete' ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stage.icon} /></svg>
                    )}
                  </div>
                  <span className="font-semibold text-stone-800 text-sm">{stage.label}</span>
                  <span className="text-xs text-stone-400">{stage.completedItems}/{stage.totalItems}</span>
                </div>
                <div className="space-y-2 pl-9">
                  {stage.items.map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-emerald-500' : item.urgent ? 'bg-amber-200 border border-amber-400' : 'border border-stone-200'}`}>
                        {item.done && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-xs flex-1 ${item.done ? 'text-stone-400 line-through' : item.urgent ? 'text-amber-700 font-medium' : 'text-stone-600'}`}>{item.label}</span>
                      {item.action && !item.done && (
                        <button
                          onClick={() => openAction(item.action!, item.providerId, item.erVisitId)}
                          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                        >
                          {ACTION_LABELS[item.action]}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
              <h3 className="font-bold text-lg text-stone-800">Preservation of Evidence</h3>
              <button onClick={() => setShowPreservation(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <PreservationOfEvidencePanel caseData={caseData} onUpdateCase={onUpdateCase} />
            </div>
          </div>
        </div>
      )}

      {contactModal && (
        <ContactActionModal
          contact={contactModal.contact}
          mode={contactModal.mode}
          onClose={() => { setContactModal(null); setIsCallActive(false); }}
          callTimer={callTimer}
          isCallActive={isCallActive}
          callNote={callNote}
          smsMessage={smsMessage}
          emailSubject={emailSubject}
          emailBody={emailBody}
          formatTime={formatTime}
          onStartCall={() => setIsCallActive(true)}
          onEndCall={() => setIsCallActive(false)}
          onSaveCall={handleSaveCall}
          onCallNoteChange={setCallNote}
          onSmsChange={setSmsMessage}
          onSendSMS={handleSendSMS}
          onEmailSubjectChange={setEmailSubject}
          onEmailBodyChange={setEmailBody}
          onSendEmail={handleSendEmail}
          onSwitchMode={(mode) => setContactModal({ ...contactModal, mode })}
        />
      )}
    </div>
  );
};
