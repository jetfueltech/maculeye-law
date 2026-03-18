import { CaseFile, CaseTask, CaseStatus, TaskType, WorkflowStage, WORKFLOW_STAGES, ActivityLog } from '../types';

export interface ContactInfo {
  name: string;
  phone?: string;
  email?: string;
  fax?: string;
  role?: string;
}

export interface InfoField {
  label: string;
  value: string | undefined;
  status: 'gathered' | 'missing' | 'partial';
}

export interface WorkflowStageProgress {
  stage: WorkflowStage;
  label: string;
  description: string;
  icon: string;
  status: 'complete' | 'active' | 'pending' | 'blocked';
  completedItems: number;
  totalItems: number;
  items: WorkflowCheckItem[];
  contacts?: ContactInfo[];
  infoFields?: InfoField[];
  stageNotes?: string;
}

export type WorkflowItemAction =
  | 'lor_defendant'
  | 'lor_client_ins'
  | 'crash_report'
  | 'hipaa'
  | 'bill_request'
  | 'records_request'
  | 'er_bill_request'
  | 'er_records_request';

export interface WorkflowCheckItem {
  id: string;
  label: string;
  done: boolean;
  taskType?: TaskType;
  urgent?: boolean;
  detail?: string;
  action?: WorkflowItemAction;
  providerId?: string;
  erVisitId?: string;
  contact?: ContactInfo;
  infoNeeded?: string[];
}

export interface ReminderAlert {
  caseId: string;
  caseName: string;
  type: 'bill_request' | 'records_request' | 'er_bill' | 'er_records' | 'coverage' | 'liability' | 'overdue_task' | 'no_workflow';
  message: string;
  daysPending: number;
  priority: 'critical' | 'high' | 'medium';
  stage: WorkflowStage;
}

const DAYS = (n: number) => n * 24 * 60 * 60 * 1000;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / DAYS(1));
}

function daysUntil(dateStr: string): number {
  return Math.floor((new Date(dateStr).getTime() - Date.now()) / DAYS(1));
}

function addDays(days: number): string {
  return new Date(Date.now() + DAYS(days)).toISOString().split('T')[0];
}

function isActive(c: CaseFile): boolean {
  return [
    CaseStatus.ACCEPTED,
    CaseStatus.INTAKE_PROCESSING,
    CaseStatus.INTAKE_PAUSED,
    CaseStatus.INTAKE_COMPLETE,
  ].includes(c.status);
}

function hasTaskType(c: CaseFile, type: TaskType, completed = false): boolean {
  return (c.tasks || []).some(t => t.type === type && (completed ? t.status === 'completed' : true));
}

function isTaskCompleted(c: CaseFile, type: TaskType): boolean {
  return (c.tasks || []).some(t => t.type === type && t.status === 'completed');
}

function hasRetainerDoc(c: CaseFile): boolean {
  return c.documents.some(d => d.type === 'retainer');
}

function hasHIPAADoc(c: CaseFile): boolean {
  return c.documents.some(d => d.type === 'authorization');
}

function hasCrashReportDoc(c: CaseFile): boolean {
  return c.documents.some(d => d.type === 'crash_report');
}

function getDefendantInsurance(c: CaseFile) {
  return (c.insurance || []).find(i => i.type === 'Defendant');
}

function getClientInsurance(c: CaseFile) {
  return (c.insurance || []).find(i => i.type === 'Client');
}

function allERBillsReceived(c: CaseFile): boolean {
  if (!c.erVisits || c.erVisits.length === 0) return true;
  return c.erVisits.every(v =>
    v.bills.every(b => b.status === 'received' || b.status === 'na')
  );
}

function allERRecordsReceived(c: CaseFile): boolean {
  if (!c.erVisits || c.erVisits.length === 0) return true;
  return c.erVisits.every(v => v.recordStatus === 'received' || v.recordStatus === 'na');
}

function allProviderBillsReceived(c: CaseFile): boolean {
  if (!c.medicalProviders || c.medicalProviders.length === 0) return true;
  return c.medicalProviders.every(p =>
    p.billRequestStatus === 'received' || p.billRequestStatus === 'na' || p.totalCost !== undefined
  );
}

function allProviderRecordsReceived(c: CaseFile): boolean {
  if (!c.medicalProviders || c.medicalProviders.length === 0) return true;
  return c.medicalProviders.every(p =>
    p.recordsRequestStatus === 'received' || p.recordsRequestStatus === 'na'
  );
}

export function getWorkflowProgress(c: CaseFile): WorkflowStageProgress[] {
  const defIns = getDefendantInsurance(c);
  const clientIns = getClientInsurance(c);

  const intakeItems: WorkflowCheckItem[] = [
    { id: 'retainer', label: 'Retainer agreement signed', done: isTaskCompleted(c, 'retainer') || hasRetainerDoc(c), taskType: 'retainer' },
    { id: 'hipaa', label: 'HIPAA authorizations signed', done: isTaskCompleted(c, 'hipaa') || hasHIPAADoc(c), taskType: 'hipaa', action: 'hipaa' },
    { id: 'lor_defendant', label: `LOR sent to defendant's insurance${defIns ? ` (${defIns.provider})` : ''}`, done: isTaskCompleted(c, 'lor_defendant') || !!c.lorDefendantSentDate, taskType: 'lor_defendant', action: 'lor_defendant' },
    ...(clientIns ? [{ id: 'lor_client', label: `LOR sent to client's insurance (${clientIns.provider})`, done: isTaskCompleted(c, 'lor_client_ins') || !!c.lorClientInsSentDate, taskType: 'lor_client_ins' as TaskType, action: 'lor_client_ins' as WorkflowItemAction }] : []),
  ];

  const clientContact: ContactInfo = {
    name: c.clientName || 'Client',
    phone: c.clientPhone,
    email: c.clientEmail,
    role: 'Client',
  };

  const clientMissingInfo: string[] = [];
  if (!c.description) clientMissingInfo.push('Accident description');
  if (!c.accidentDate) clientMissingInfo.push('Date of loss');
  if (!c.location) clientMissingInfo.push('Accident location');
  if (!defIns?.provider) clientMissingInfo.push('Defendant insurance');
  if (!c.clientPhone) clientMissingInfo.push('Phone number');
  if (!c.extendedIntake?.medical?.injuries?.length) clientMissingInfo.push('Injury details');

  const insuranceMissingInfo: string[] = [];
  if (!defIns?.claimNumber) insuranceMissingInfo.push('Claim number');
  if (!defIns?.coverageStatus || defIns.coverageStatus === 'pending') insuranceMissingInfo.push('Coverage status');
  if (!defIns?.coverageLimits) insuranceMissingInfo.push('Coverage limits');
  if (!defIns?.adjuster) insuranceMissingInfo.push('Adjuster name');

  const defInsContact: ContactInfo | undefined = defIns ? {
    name: defIns.adjuster || defIns.provider || 'Defendant Insurer',
    phone: undefined,
    email: undefined,
    role: 'Defendant Insurance',
  } : undefined;

  const clientContactItems: WorkflowCheckItem[] = [
    { id: 'contact_client', label: 'Contact client for crash, injury & insurance info', done: isTaskCompleted(c, 'contact_client'), taskType: 'contact_client', contact: clientContact, infoNeeded: clientMissingInfo.length > 0 ? clientMissingInfo : undefined },
    { id: 'verify_insurance', label: 'Contact insurance companies to verify information', done: isTaskCompleted(c, 'verify_insurance'), taskType: 'verify_insurance', contact: defInsContact, infoNeeded: insuranceMissingInfo.length > 0 ? insuranceMissingInfo : undefined },
    { id: 'client_comms', label: 'Client communication (email/phone) documented', done: isTaskCompleted(c, 'client_communication'), taskType: 'client_communication', contact: clientContact },
  ];

  const intakeProcessingItems: WorkflowCheckItem[] = [
    { id: 'complete_intake_form', label: 'Intake form completed (Exhibit B)', done: isTaskCompleted(c, 'complete_intake_form') || !!c.extendedIntake?.client?.full_name, taskType: 'complete_intake_form' },
    { id: 'create_cms_case', label: 'Case created in Smart Advocate', done: isTaskCompleted(c, 'create_cms_case') || c.cmsSyncStatus === 'SYNCED', taskType: 'create_cms_case' },
    { id: 'upload_case_files', label: 'Upload case files & forms to Smart Advocate', done: isTaskCompleted(c, 'upload_case_files'), taskType: 'upload_case_files' },
    { id: 'upload_intake_form', label: 'Upload completed intake form to Smart Advocate', done: isTaskCompleted(c, 'upload_intake_form'), taskType: 'upload_intake_form' },
  ];

  const investigationItems: WorkflowCheckItem[] = [
    { id: 'crash_request', label: 'Crash/police report requested', done: isTaskCompleted(c, 'crash_report_request') || !!c.crashReportRequestedDate, taskType: 'crash_report_request', action: 'crash_report' },
    { id: 'crash_received', label: 'Crash/police report received', done: isTaskCompleted(c, 'crash_report_received') || hasCrashReportDoc(c), taskType: 'crash_report_received' },
  ];

  const insuranceItems: WorkflowCheckItem[] = [
    { id: 'coverage', label: 'Coverage confirmed', done: defIns?.coverageStatus === 'accepted', urgent: defIns?.coverageStatus === 'pending', contact: defInsContact, detail: defIns?.coverageStatus ? `Status: ${defIns.coverageStatus}` : undefined },
    { id: 'liability', label: 'Liability accepted', done: defIns?.liabilityStatus === 'accepted', urgent: defIns?.liabilityStatus === 'pending', contact: defInsContact, detail: defIns?.liabilityStatus ? `Status: ${defIns.liabilityStatus}` : undefined },
    { id: 'policy_limits', label: 'Policy limits obtained', done: defIns?.policyLimitsStatus === 'received', urgent: defIns?.policyLimitsStatus === 'requested', contact: defInsContact, detail: defIns?.coverageLimits ? `Limits: ${defIns.coverageLimits}` : undefined },
  ];

  const hasER = (c.erVisits || []).length > 0;
  const hasAmbulance = c.extendedIntake?.medical?.ambulance === true;

  const medicalSetupItems: WorkflowCheckItem[] = [
    { id: 'send_hipaa_medical', label: 'Send signed HIPAA forms & demographics to medical team', done: isTaskCompleted(c, 'send_hipaa_to_medical'), taskType: 'send_hipaa_to_medical' },
    { id: 'send_demographics', label: 'Wait on intake to send demographics', done: isTaskCompleted(c, 'send_demographics'), taskType: 'send_demographics' },
    { id: 'check_er_ambulance', label: `Check for ambulance/ER charges${hasER ? ' (ER visits found)' : hasAmbulance ? ' (ambulance used)' : ''}`, done: isTaskCompleted(c, 'check_er_ambulance') || hasER, taskType: 'check_er_ambulance' },
  ];

  const treatmentItems: WorkflowCheckItem[] = [
    { id: 'treatment_active', label: 'Client in active treatment', done: !!(c.medicalProviders && c.medicalProviders.length > 0) },
    { id: 'treatment_complete', label: 'Treatment completed / end date set', done: !!c.treatmentEndDate },
  ];

  const providers = c.medicalProviders || [];
  const erVisits = c.erVisits || [];

  const recordsRequestItems: WorkflowCheckItem[] = [
    ...providers.map(p => ({
      id: `bill_req_${p.id}`,
      label: `Bill request sent - ${p.name}`,
      done: p.billRequestStatus === 'requested' || p.billRequestStatus === 'received' || !!p.billRequestDate,
      taskType: 'bill_request' as TaskType,
      detail: p.billRequestDate ? `Sent ${daysSince(p.billRequestDate)}d ago` : undefined,
      action: 'bill_request' as WorkflowItemAction,
      providerId: p.id,
      contact: { name: p.name, phone: p.phone, fax: p.fax, role: 'Medical Provider' } as ContactInfo,
    })),
    ...providers.map(p => ({
      id: `rec_req_${p.id}`,
      label: `Records request sent - ${p.name}`,
      done: p.recordsRequestStatus === 'requested' || p.recordsRequestStatus === 'received' || !!p.recordsRequestDate,
      taskType: 'records_request' as TaskType,
      action: 'records_request' as WorkflowItemAction,
      providerId: p.id,
      contact: { name: p.name, phone: p.phone, fax: p.fax, role: 'Medical Provider' } as ContactInfo,
    })),
    ...erVisits.map(v => ({
      id: `er_bill_req_${v.id}`,
      label: `ER bill request sent - ${v.facilityName}`,
      done: v.bills.some(b => b.status === 'requested' || b.status === 'received'),
      taskType: 'er_bills' as TaskType,
      action: 'er_bill_request' as WorkflowItemAction,
      erVisitId: v.id,
      contact: { name: v.facilityName, role: 'ER Facility' } as ContactInfo,
    })),
    ...erVisits.map(v => ({
      id: `er_rec_req_${v.id}`,
      label: `ER records request sent - ${v.facilityName}`,
      done: v.recordStatus === 'requested' || v.recordStatus === 'received',
      taskType: 'er_records' as TaskType,
      action: 'er_records_request' as WorkflowItemAction,
      erVisitId: v.id,
      contact: { name: v.facilityName, role: 'ER Facility' } as ContactInfo,
    })),
  ];

  const recordsCollectionItems: WorkflowCheckItem[] = [
    ...providers.map(p => ({
      id: `bill_recv_${p.id}`,
      label: `Bill received - ${p.name}`,
      done: p.billRequestStatus === 'received' || (p.totalCost !== undefined && p.totalCost > 0),
      urgent: p.billRequestDate ? daysSince(p.billRequestDate) > 30 && p.billRequestStatus !== 'received' : false,
      detail: p.billRequestDate && p.billRequestStatus !== 'received'
        ? `Requested ${daysSince(p.billRequestDate)}d ago`
        : undefined,
    })),
    ...providers.map(p => ({
      id: `rec_recv_${p.id}`,
      label: `Records received - ${p.name}`,
      done: p.recordsRequestStatus === 'received',
      urgent: p.recordsRequestDate ? daysSince(p.recordsRequestDate) > 30 && p.recordsRequestStatus !== 'received' : false,
    })),
    { id: 'er_bills_recv', label: 'All ER bills received', done: allERBillsReceived(c), urgent: !allERBillsReceived(c) && erVisits.length > 0 },
    { id: 'er_records_recv', label: 'All ER records received', done: allERRecordsReceived(c), urgent: !allERRecordsReceived(c) && erVisits.length > 0 },
  ].filter(item => item.id !== 'er_bills_recv' && item.id !== 'er_records_recv' ? true : erVisits.length > 0);

  const preDemandItems: WorkflowCheckItem[] = [
    { id: 'specials', label: 'Specials package compiled', done: c.specials?.status === 'complete' || c.specials?.status === 'sent_to_attorney', taskType: 'specials_compile' },
    { id: 'medical_summary', label: 'Medical summary prepared', done: isTaskCompleted(c, 'medical_summary'), taskType: 'medical_summary' },
    { id: 'demand_review', label: 'Pre-demand attorney review', done: isTaskCompleted(c, 'demand_review'), taskType: 'demand_review' },
  ];

  const demandItems: WorkflowCheckItem[] = [
    { id: 'demand_prep', label: 'Demand letter drafted', done: isTaskCompleted(c, 'demand_prep'), taskType: 'demand_prep' },
  ];

  const clientContactInfoFields: InfoField[] = [
    { label: 'Client Name', value: c.clientName, status: c.clientName ? 'gathered' : 'missing' },
    { label: 'Phone', value: c.clientPhone, status: c.clientPhone ? 'gathered' : 'missing' },
    { label: 'Email', value: c.clientEmail, status: c.clientEmail ? 'gathered' : 'missing' },
    { label: 'DOB', value: c.clientDob, status: c.clientDob ? 'gathered' : 'missing' },
    { label: 'Address', value: c.clientAddress, status: c.clientAddress ? 'gathered' : 'missing' },
    { label: 'Accident Date', value: c.accidentDate, status: c.accidentDate ? 'gathered' : 'missing' },
    { label: 'Location', value: c.location, status: c.location ? 'gathered' : 'missing' },
    { label: 'Description', value: c.description?.substring(0, 60), status: c.description ? 'gathered' : 'missing' },
  ];

  const insuranceInfoFields: InfoField[] = [
    { label: 'Defendant Carrier', value: defIns?.provider, status: defIns?.provider ? 'gathered' : 'missing' },
    { label: 'Claim Number', value: defIns?.claimNumber, status: defIns?.claimNumber ? 'gathered' : 'missing' },
    { label: 'Coverage Status', value: defIns?.coverageStatus, status: defIns?.coverageStatus === 'accepted' ? 'gathered' : defIns?.coverageStatus === 'pending' ? 'partial' : 'missing' },
    { label: 'Liability Status', value: defIns?.liabilityStatus, status: defIns?.liabilityStatus === 'accepted' ? 'gathered' : defIns?.liabilityStatus === 'pending' ? 'partial' : 'missing' },
    { label: 'Policy Limits', value: defIns?.coverageLimits, status: defIns?.coverageLimits ? 'gathered' : 'missing' },
    { label: 'Adjuster', value: defIns?.adjuster, status: defIns?.adjuster ? 'gathered' : 'missing' },
  ];

  const clientContactContacts: ContactInfo[] = [clientContact];
  if (defInsContact) clientContactContacts.push(defInsContact);

  const insuranceContacts: ContactInfo[] = [];
  if (defInsContact) insuranceContacts.push(defInsContact);
  if (clientIns) {
    insuranceContacts.push({
      name: clientIns.adjuster || clientIns.provider || 'Client Insurer',
      phone: undefined,
      email: undefined,
      role: 'Client Insurance',
    });
  }

  const providerContacts: ContactInfo[] = providers.map(p => ({
    name: p.name,
    phone: p.phone,
    fax: p.fax,
    role: 'Medical Provider',
  }));

  const stages: { stage: WorkflowStage; items: WorkflowCheckItem[]; contacts?: ContactInfo[]; infoFields?: InfoField[]; stageNotes?: string }[] = [
    { stage: 'intake', items: intakeItems, contacts: [clientContact] },
    { stage: 'client_contact', items: clientContactItems, contacts: clientContactContacts, infoFields: clientContactInfoFields },
    { stage: 'intake_processing', items: intakeProcessingItems },
    { stage: 'investigation', items: investigationItems },
    { stage: 'insurance', items: insuranceItems, contacts: insuranceContacts, infoFields: insuranceInfoFields },
    { stage: 'medical_setup', items: medicalSetupItems, contacts: [clientContact] },
    { stage: 'treatment', items: treatmentItems, contacts: providerContacts },
    { stage: 'records_requests', items: recordsRequestItems.length > 0 ? recordsRequestItems : [{ id: 'no_providers', label: 'No providers added yet', done: false }], contacts: providerContacts },
    { stage: 'records_collection', items: recordsCollectionItems.length > 0 ? recordsCollectionItems : [{ id: 'no_providers_coll', label: 'No providers to collect from', done: true }], contacts: providerContacts },
    { stage: 'pre_demand', items: preDemandItems },
    { stage: 'demand', items: demandItems },
  ];

  const results: WorkflowStageProgress[] = [];
  let previousComplete = true;

  for (const { stage, items, contacts, infoFields, stageNotes } of stages) {
    const info = WORKFLOW_STAGES.find(s => s.id === stage)!;
    const completedItems = items.filter(i => i.done).length;
    const allDone = completedItems === items.length;

    let status: WorkflowStageProgress['status'];
    if (allDone) {
      status = 'complete';
    } else if (!previousComplete) {
      status = 'blocked';
    } else {
      status = 'active';
    }

    results.push({
      stage,
      label: info.label,
      description: info.description,
      icon: info.icon,
      status,
      completedItems,
      totalItems: items.length,
      items,
      contacts,
      infoFields,
      stageNotes,
    });

    if (!allDone) previousComplete = false;
  }

  return results;
}

export function generateInitialWorkflowTasks(c: CaseFile): CaseTask[] {
  if (!isActive(c)) return [];
  const existing = c.tasks || [];
  const now = new Date().toISOString();
  const tasks: CaseTask[] = [];

  function addIfMissing(type: TaskType, title: string, description: string, dueDays: number, priority: 'high' | 'medium' | 'low' = 'high') {
    if (!existing.some(t => t.type === type)) {
      tasks.push({
        id: `wf-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        caseId: c.id,
        title,
        description,
        type,
        status: 'open',
        dueDate: addDays(dueDays),
        priority,
        recurrence: 'one-time',
        createdAt: now,
        autoGenerated: true,
      });
    }
  }

  const defIns = getDefendantInsurance(c);
  const clientIns = getClientInsurance(c);

  if (!hasRetainerDoc(c)) {
    addIfMissing('retainer', 'Obtain signed retainer agreement', 'Have client review and sign the retainer agreement', 3);
  }
  addIfMissing('hipaa', 'Obtain signed HIPAA authorizations', 'Have client sign HIPAA/medical authorizations for all treating providers', 3);
  addIfMissing('lor_defendant', `Send LOR to ${defIns?.provider || "defendant's insurance"}`, "Send Letter of Representation to defendant's insurance company", 5);
  if (clientIns) {
    addIfMissing('lor_client_ins', `Send LOR to ${clientIns.provider} (client's insurance)`, "Send Letter of Representation to client's own insurance", 5);
  }
  addIfMissing('crash_report_request', 'Request crash/police report', 'Request official crash report from law enforcement agency', 3, 'medium');

  if (defIns && (!defIns.coverageStatus || defIns.coverageStatus === 'pending')) {
    if (!existing.some(t => t.type === 'coverage_followup' && t.status !== 'completed')) {
      tasks.push({
        id: `wf-cov-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        caseId: c.id,
        title: `Confirm coverage with ${defIns.provider || "defendant's insurance"}`,
        description: 'Follow up with insurance to confirm coverage is in effect',
        type: 'coverage_followup',
        status: 'open',
        dueDate: addDays(7),
        priority: 'high',
        recurrence: 'weekly',
        createdAt: now,
        autoGenerated: true,
      });
    }
  }

  if (defIns && (!defIns.liabilityStatus || defIns.liabilityStatus === 'pending')) {
    if (!existing.some(t => t.type === 'liability_followup' && t.status !== 'completed')) {
      tasks.push({
        id: `wf-liab-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        caseId: c.id,
        title: `Follow up on liability with ${defIns.provider || "defendant's insurance"}`,
        description: 'Pursue liability acceptance/denial decision',
        type: 'liability_followup',
        status: 'open',
        dueDate: addDays(7),
        priority: 'high',
        recurrence: 'weekly',
        createdAt: now,
        autoGenerated: true,
      });
    }
  }

  return tasks;
}

export function generateReminderTasks(c: CaseFile): CaseTask[] {
  if (!isActive(c)) return [];
  const existing = c.tasks || [];
  const now = new Date().toISOString();
  const tasks: CaseTask[] = [];

  function reminderKey(base: string, daysBucket: number) {
    return `reminder-${base}-${daysBucket}`;
  }

  function alreadyHasReminder(key: string): boolean {
    return existing.some(t => t.id.startsWith(key) && t.status !== 'completed');
  }

  const defIns = getDefendantInsurance(c);

  if (defIns?.coverageStatus === 'pending' && defIns.coverageFollowUpDate) {
    const days = daysSince(defIns.coverageFollowUpDate);
    if (days > 14 && !existing.some(t => t.type === 'coverage_followup' && t.status !== 'completed')) {
      tasks.push({
        id: `reminder-cov-${Date.now()}`,
        caseId: c.id,
        title: `OVERDUE: Coverage follow-up with ${defIns.provider || 'insurer'} (${days}d pending)`,
        description: 'Coverage has been pending for over 2 weeks - escalate follow-up',
        type: 'coverage_followup',
        status: 'open',
        dueDate: addDays(1),
        priority: 'high',
        recurrence: 'weekly',
        createdAt: now,
        autoGenerated: true,
      });
    }
  }

  if (defIns?.liabilityStatus === 'pending' && defIns.liabilityFollowUpDate) {
    const days = daysSince(defIns.liabilityFollowUpDate);
    if (days > 14 && !existing.some(t => t.type === 'liability_followup' && t.status !== 'completed')) {
      tasks.push({
        id: `reminder-liab-${Date.now()}`,
        caseId: c.id,
        title: `OVERDUE: Liability follow-up with ${defIns.provider || 'insurer'} (${days}d pending)`,
        description: 'Liability decision has been pending for over 2 weeks - escalate',
        type: 'liability_followup',
        status: 'open',
        dueDate: addDays(1),
        priority: 'high',
        recurrence: 'weekly',
        createdAt: now,
        autoGenerated: true,
      });
    }
  }

  for (const provider of c.medicalProviders || []) {
    if (provider.billRequestDate && provider.billRequestStatus === 'requested') {
      const days = daysSince(provider.billRequestDate);
      const bucket = days >= 90 ? 90 : days >= 60 ? 60 : days >= 30 ? 30 : 0;
      if (bucket > 0) {
        const key = reminderKey(`bill-${provider.id}`, bucket);
        if (!alreadyHasReminder(key)) {
          tasks.push({
            id: `${key}-${Date.now()}`,
            caseId: c.id,
            title: `Follow up: ${provider.name} bill request (${days}d overdue)`,
            description: bucket >= 90
              ? `CRITICAL: Bill from ${provider.name} has been requested for ${days} days. Consider subpoena.`
              : bucket >= 60
              ? `Urgent: Bill request to ${provider.name} has been pending ${days} days. Send demand letter to provider.`
              : `Bill request to ${provider.name} sent ${days} days ago - no response received.`,
            type: 'bill_request',
            status: 'open',
            dueDate: addDays(bucket >= 90 ? 1 : bucket >= 60 ? 2 : 5),
            priority: bucket >= 60 ? 'high' : 'medium',
            recurrence: 'weekly',
            createdAt: now,
            autoGenerated: true,
          });
        }
      }
    }

    if (provider.recordsRequestDate && provider.recordsRequestStatus === 'requested') {
      const days = daysSince(provider.recordsRequestDate);
      const bucket = days >= 90 ? 90 : days >= 60 ? 60 : days >= 30 ? 30 : 0;
      if (bucket > 0) {
        const key = reminderKey(`records-${provider.id}`, bucket);
        if (!alreadyHasReminder(key)) {
          tasks.push({
            id: `${key}-${Date.now()}`,
            caseId: c.id,
            title: `Follow up: ${provider.name} records request (${days}d overdue)`,
            description: bucket >= 60
              ? `Urgent: Records request to ${provider.name} pending ${days} days.`
              : `Records request to ${provider.name} sent ${days} days ago - no response received.`,
            type: 'records_request',
            status: 'open',
            dueDate: addDays(bucket >= 60 ? 2 : 5),
            priority: bucket >= 60 ? 'high' : 'medium',
            recurrence: 'weekly',
            createdAt: now,
            autoGenerated: true,
          });
        }
      }
    }
  }

  for (const visit of c.erVisits || []) {
    for (const bill of visit.bills) {
      if (bill.requestDate && bill.status === 'requested') {
        const days = daysSince(bill.requestDate);
        const bucket = days >= 90 ? 90 : days >= 60 ? 60 : days >= 30 ? 30 : 0;
        if (bucket > 0) {
          const key = reminderKey(`er-bill-${visit.id}-${bill.type}`, bucket);
          if (!alreadyHasReminder(key)) {
            tasks.push({
              id: `${key}-${Date.now()}`,
              caseId: c.id,
              title: `Follow up: ${visit.facilityName} ${bill.type} bill (${days}d pending)`,
              type: 'er_bills',
              status: 'open',
              dueDate: addDays(bucket >= 60 ? 2 : 5),
              priority: bucket >= 60 ? 'high' : 'medium',
              recurrence: 'weekly',
              createdAt: now,
              autoGenerated: true,
            });
          }
        }
      }
    }

    if (visit.recordRequestDate && visit.recordStatus === 'requested') {
      const days = daysSince(visit.recordRequestDate);
      const bucket = days >= 60 ? 60 : days >= 30 ? 30 : 0;
      if (bucket > 0) {
        const key = reminderKey(`er-rec-${visit.id}`, bucket);
        if (!alreadyHasReminder(key)) {
          tasks.push({
            id: `${key}-${Date.now()}`,
            caseId: c.id,
            title: `Follow up: ${visit.facilityName} ER records (${days}d pending)`,
            type: 'er_records',
            status: 'open',
            dueDate: addDays(bucket >= 60 ? 2 : 5),
            priority: bucket >= 60 ? 'high' : 'medium',
            recurrence: 'weekly',
            createdAt: now,
            autoGenerated: true,
          });
        }
      }
    }
  }

  return tasks;
}

export function getAllReminders(cases: CaseFile[]): ReminderAlert[] {
  const alerts: ReminderAlert[] = [];

  for (const c of cases) {
    if (!isActive(c)) continue;

    const tasks = c.tasks || [];
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'completed') return false;
      return daysUntil(t.dueDate) < 0;
    });

    if (overdueTasks.length > 0) {
      alerts.push({
        caseId: c.id,
        caseName: c.clientName,
        type: 'overdue_task',
        message: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
        daysPending: Math.abs(Math.min(...overdueTasks.map(t => daysUntil(t.dueDate)))),
        priority: overdueTasks.length >= 3 ? 'critical' : 'high',
        stage: 'intake',
      });
    }

    if (!c.workflowInitialized) {
      alerts.push({
        caseId: c.id,
        caseName: c.clientName,
        type: 'no_workflow',
        message: 'Workflow not initialized - no tasks generated',
        daysPending: Math.floor(daysSince(c.createdAt)),
        priority: 'medium',
        stage: 'intake',
      });
    }

    const defIns = getDefendantInsurance(c);
    if (defIns?.coverageStatus === 'pending') {
      const since = defIns.coverageFollowUpDate ? daysSince(defIns.coverageFollowUpDate) : daysSince(c.createdAt);
      if (since > 7) {
        alerts.push({
          caseId: c.id,
          caseName: c.clientName,
          type: 'coverage',
          message: `Coverage unconfirmed (${since}d pending)`,
          daysPending: since,
          priority: since > 21 ? 'critical' : 'high',
          stage: 'insurance',
        });
      }
    }

    if (defIns?.liabilityStatus === 'pending') {
      const since = defIns.liabilityFollowUpDate ? daysSince(defIns.liabilityFollowUpDate) : daysSince(c.createdAt);
      if (since > 14) {
        alerts.push({
          caseId: c.id,
          caseName: c.clientName,
          type: 'liability',
          message: `Liability unresolved (${since}d pending)`,
          daysPending: since,
          priority: since > 30 ? 'critical' : 'high',
          stage: 'insurance',
        });
      }
    }

    for (const p of c.medicalProviders || []) {
      if (p.billRequestDate && p.billRequestStatus === 'requested') {
        const days = daysSince(p.billRequestDate);
        if (days >= 30) {
          alerts.push({
            caseId: c.id,
            caseName: c.clientName,
            type: 'bill_request',
            message: `${p.name} bill request ${days}d pending`,
            daysPending: days,
            priority: days >= 90 ? 'critical' : days >= 60 ? 'high' : 'medium',
            stage: 'records_collection',
          });
        }
      }
      if (p.recordsRequestDate && p.recordsRequestStatus === 'requested') {
        const days = daysSince(p.recordsRequestDate);
        if (days >= 30) {
          alerts.push({
            caseId: c.id,
            caseName: c.clientName,
            type: 'records_request',
            message: `${p.name} records request ${days}d pending`,
            daysPending: days,
            priority: days >= 60 ? 'high' : 'medium',
            stage: 'records_collection',
          });
        }
      }
    }

    for (const v of c.erVisits || []) {
      for (const b of v.bills) {
        if (b.requestDate && b.status === 'requested') {
          const days = daysSince(b.requestDate);
          if (days >= 30) {
            alerts.push({
              caseId: c.id,
              caseName: c.clientName,
              type: 'er_bill',
              message: `${v.facilityName} ${b.type} bill ${days}d pending`,
              daysPending: days,
              priority: days >= 90 ? 'critical' : days >= 60 ? 'high' : 'medium',
              stage: 'records_collection',
            });
          }
        }
      }
    }
  }

  return alerts.sort((a, b) => {
    const p = { critical: 0, high: 1, medium: 2 };
    return p[a.priority] - p[b.priority] || b.daysPending - a.daysPending;
  });
}

export function applyWorkflowToCase(c: CaseFile): CaseFile {
  const newTasks = generateInitialWorkflowTasks(c);
  const reminderTasks = generateReminderTasks(c);
  const allNew = [...newTasks, ...reminderTasks];

  if (allNew.length === 0 && c.workflowInitialized) return c;

  const logs: ActivityLog[] = allNew.length > 0
    ? [{
        id: Math.random().toString(36).substr(2, 9),
        type: 'system',
        message: `${allNew.length} workflow task${allNew.length > 1 ? 's' : ''} generated`,
        timestamp: new Date().toISOString(),
      }]
    : [];

  return {
    ...c,
    workflowInitialized: true,
    tasks: [...(c.tasks || []), ...allNew],
    activityLog: [...logs, ...(c.activityLog || [])],
  };
}
