
export enum CaseStatus {
  NEW = 'NEW',
  ANALYZING = 'ANALYZING',
  REVIEW_NEEDED = 'REVIEW_NEEDED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  LOST_CONTACT = 'LOST_CONTACT',
  // Post-Acceptance Workflow
  INTAKE_PROCESSING = 'INTAKE_PROCESSING',
  INTAKE_PAUSED = 'INTAKE_PAUSED',
  INTAKE_COMPLETE = 'INTAKE_COMPLETE'
}

export type DocumentType = 'retainer' | 'crash_report' | 'medical_record' | 'authorization' | 'insurance_card' | 'correspondence' | 'photo' | 'email' | 'other';

export type PhotoCategory = 'drivers_license' | 'insurance_card' | 'client_pd' | 'defendant_pd' | 'injury_photo' | 'scene_photo' | 'other';

export type EmailCategory = 'offer' | 'counteroffer' | 'coverage_response' | 'liability_decision' | 'medical_records' | 'medical_bills' | 'policy_limits_response' | 'client_communication' | 'attorney_correspondence' | 'general';

export type TaskType =
  | 'coverage_followup'
  | 'liability_followup'
  | 'policy_limits'
  | 'er_records'
  | 'er_bills'
  | 'medical_records'
  | 'demand_prep'
  | 'general'
  | 'retainer'
  | 'lor_defendant'
  | 'lor_client_ins'
  | 'crash_report_request'
  | 'crash_report_received'
  | 'hipaa'
  | 'treatment_followup'
  | 'bill_request'
  | 'records_request'
  | 'specials_compile'
  | 'demand_review'
  | 'contact_client'
  | 'verify_insurance'
  | 'complete_intake_form'
  | 'create_cms_case'
  | 'upload_case_files'
  | 'upload_intake_form'
  | 'send_hipaa_to_medical'
  | 'send_demographics'
  | 'check_er_ambulance'
  | 'mass_order_records'
  | 'receive_records_bills'
  | 'medical_summary'
  | 'client_communication';

export type WorkflowStage =
  | 'intake'
  | 'client_contact'
  | 'intake_processing'
  | 'investigation'
  | 'insurance'
  | 'medical_setup'
  | 'treatment'
  | 'records_requests'
  | 'records_collection'
  | 'pre_demand'
  | 'demand';

export interface WorkflowStageInfo {
  id: WorkflowStage;
  label: string;
  description: string;
  icon: string;
}

export const WORKFLOW_STAGES: WorkflowStageInfo[] = [
  { id: 'intake', label: 'Intake', description: 'Retainer, LOR, HIPAA authorizations', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z' },
  { id: 'client_contact', label: 'Client Contact', description: 'Contact client for crash, injury, insurance, and photo info', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { id: 'intake_processing', label: 'Intake Processing', description: 'Complete intake form, create case in CMS, upload files', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  { id: 'investigation', label: 'Investigation', description: 'Crash report, evidence collection', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  { id: 'insurance', label: 'Insurance', description: 'Coverage, liability, policy limits verification', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { id: 'medical_setup', label: 'Medical Setup', description: 'HIPAA to medical team, demographics, check ER/ambulance', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'treatment', label: 'Treatment', description: 'Medical treatment monitoring', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { id: 'records_requests', label: 'Records Requests', description: 'Mass order bills and records from all providers', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
  { id: 'records_collection', label: 'Records Collection', description: 'Receive all bills and records', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'pre_demand', label: 'Pre-Demand', description: 'Specials, medical summary, attorney review', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
  { id: 'demand', label: 'Demand Letter', description: 'Draft and send demand letter', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
];

export type TaskStatus = 'open' | 'completed' | 'overdue';

export type CoverageStatusType = 'pending' | 'accepted' | 'denied' | 'under_investigation';
export type LiabilityStatusType = 'pending' | 'accepted' | 'denied' | 'disputed';
export type PolicyLimitsStatusType = 'not_requested' | 'requested' | 'received' | 'na';
export type ERBillStatus = 'not_requested' | 'requested' | 'received' | 'na';
export type PreferredContactMethod = 'email' | 'fax' | 'mail' | 'phone';
export type SpecialsStatus = 'in_progress' | 'complete' | 'sent_to_attorney';

export const DOCUMENT_NAMING_RULES: Record<string, string> = {
  retainer: 'Retainer',
  crash_report: 'Crash Report',
  medical_record: 'Medical Record',
  authorization: 'Authorization for Release',
  insurance_card: 'Insurance Card',
  correspondence: 'Correspondence',
  photo: 'Photo',
  email: 'Email',
  foia_request: 'FOIA Request',
  letter_of_representation: 'Letter of Representation',
  attorney_lien: 'Attorney Lien',
  bill_request: 'Bill Request',
  demand_letter: 'Demand Letter',
  distribution_sheet: 'Distribution Sheet',
  drivers_license: "Driver's License",
  client_pd_photo: 'Client PD Photo',
  defendant_pd_photo: 'Defendant PD Photo',
  mri_record: 'MRI Record',
  mri_bill: 'MRI Bill',
  er_facility_bill: 'ER Facility Bill',
  er_physician_bill: 'ER Physician Bill',
  er_radiology_bill: 'ER Radiology Bill',
  er_facility_record: 'ER Facility Record',
  hospital_facility_bill: 'Hospital Facility Bill',
  hospital_physician_bill: 'Hospital Physician Bill',
  chiro_bill: 'Chiropractic Bill',
  pt_bill: 'Physical Therapy Bill',
  ortho_bill: 'Orthopedic Bill',
  neuro_bill: 'Neurology Bill',
  pain_mgmt_bill: 'Pain Management Bill',
  pcp_bill: 'Primary Care Bill',
  imaging_bill: 'Imaging Bill',
  surgery_bill: 'Surgery Bill',
  lab_bill: 'Lab Bill',
  pharmacy_bill: 'Pharmacy Bill',
  ambulance_bill: 'Ambulance Bill',
  medical_bill: 'Medical Bill',
  specials_package: 'Specials Package',
  intake_form: 'Intake Form',
  preservation_of_evidence: 'Preservation of Evidence Request',
};

export const PHOTO_CATEGORY_LABELS: Record<PhotoCategory, string> = {
  drivers_license: "Driver's License",
  insurance_card: 'Insurance Card',
  client_pd: 'Client Property Damage',
  defendant_pd: 'Defendant Property Damage',
  injury_photo: 'Injury Photo',
  scene_photo: 'Scene Photo',
  other: 'Other',
};

export const EMAIL_CATEGORY_LABELS: Record<EmailCategory, string> = {
  offer: 'Offer',
  counteroffer: 'Counteroffer',
  coverage_response: 'Coverage Response',
  liability_decision: 'Liability Decision',
  medical_records: 'Medical Records',
  medical_bills: 'Medical Bills',
  policy_limits_response: 'Policy Limits',
  client_communication: 'Client',
  attorney_correspondence: 'Attorney',
  general: 'General',
};

export type DocumentCategory =
  | 'client_property_damage'
  | 'defendant_property_damage'
  | 'injury_photos'
  | 'scene_photos'
  | 'drivers_license'
  | 'insurance_card'
  | 'lor_acknowledgment'
  | 'coverage_determination'
  | 'liability_determination'
  | 'policy_limits'
  | 'settlement'
  | 'demand'
  | 'correspondence'
  | 'billing'
  | 'intake'
  | 'investigation'
  | 'treatment'
  | 'workflow_generated'
  | 'other';

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  client_property_damage: 'Client Property Damage',
  defendant_property_damage: 'Defendant Property Damage',
  injury_photos: 'Injury Photos',
  scene_photos: 'Scene Photos',
  drivers_license: "Driver's License",
  insurance_card: 'Insurance Card',
  lor_acknowledgment: 'LOR Acknowledgment',
  coverage_determination: 'Coverage Determination',
  liability_determination: 'Liability Determination',
  policy_limits: 'Policy Limits',
  settlement: 'Settlement',
  demand: 'Demand',
  correspondence: 'Correspondence',
  billing: 'Billing',
  intake: 'Intake',
  investigation: 'Investigation',
  treatment: 'Treatment',
  workflow_generated: 'Workflow Generated',
  other: 'Other',
};

export interface DocumentAIAction {
  actionType: string;
  title: string;
  description: string;
  priority: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  taskType?: string;
  applied?: boolean;
}

export interface DocumentAIAnalysis {
  summary: string;
  suggestedCategory?: string;
  actions: DocumentAIAction[];
  extractedData: Record<string, string>;
  analyzedAt: string;
}

export interface DocumentAttachment {
  type: DocumentType;
  fileData: string | null;
  fileName: string;
  mimeType?: string;
  source?: string;
  tags?: string[];
  category?: DocumentCategory;
  linkedFacilityId?: string;
  photoCategory?: PhotoCategory;
  description?: string;
  storagePath?: string;
  storageUrl?: string;
  billAmount?: number;
  documentTypeKey?: string;
  generatedFormType?: string;
  uploadedAt?: string;
  aiAnalysis?: DocumentAIAnalysis;
}

export type MedicalProviderType = 'hospital' | 'er' | 'urgent_care' | 'chiropractor' | 'physical_therapy' | 'orthopedic' | 'neurologist' | 'pain_management' | 'primary_care' | 'imaging' | 'surgery_center' | 'other';

export interface MedicalProvider {
  id: string;
  name: string;
  type: MedicalProviderType;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  fax?: string;
  email?: string;
  contactPerson?: string;
  totalCost?: number;
  notes?: string;
  dateOfFirstVisit?: string;
  dateOfLastVisit?: string;
  isCurrentlyTreating?: boolean;
  preferredContactMethod?: PreferredContactMethod;
  billRequestDate?: string;
  billRequestStatus?: 'not_requested' | 'requested' | 'received' | 'na';
  recordsRequestDate?: string;
  recordsRequestStatus?: 'not_requested' | 'requested' | 'received' | 'na';
  treatmentComplete?: boolean;
}

export interface EmailAttachment {
  name: string;
  type: 'pdf' | 'image' | 'doc';
  size: string;
}

export interface EmailMatchAnalysis {
  suggestedCaseId: string | null;
  confidenceScore: number;
  reasoning: string;
}

export interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  direction: 'inbound' | 'outbound';
  threadId?: string;
  attachments: EmailAttachment[];
  linkedCaseId?: string;
  aiMatch?: EmailMatchAnalysis;
  category?: EmailCategory;
}

export interface CommunicationLog {
  id: string;
  type: 'call' | 'sms';
  direction: 'inbound' | 'outbound';
  contactName: string;
  contactPhone: string;
  timestamp: string;
  duration?: string;
  status?: 'completed' | 'missed' | 'voicemail' | 'sent' | 'received';
  content: string;
  transcript?: string;
  aiSummary?: string;
}

export interface ChatAttachment {
  name: string;
  type: 'image' | 'file';
  url?: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderInitials: string;
  isCurrentUser: boolean;
  message: string;
  timestamp: string;
  attachments?: ChatAttachment[];
  channel?: 'intake' | 'medical';
  edited?: boolean;
}

export interface AIAnalysis {
  caseScore: number;
  liabilityAssessment: string;
  retainerValid: boolean;
  retainerNotes: string;
  summary: string;
  recommendedAction: 'ACCEPT' | 'REJECT' | 'INVESTIGATE';
  keyRiskFactors: string[];
}

export interface ActivityLog {
  id: string;
  type: 'system' | 'user' | 'note';
  message: string;
  timestamp: string;
  author?: string;
}

export interface Party {
  name: string;
  role: 'Defendant' | 'Witness' | 'Passenger' | 'Plaintiff';
  contact?: string;
}

export interface Adjuster {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  insuranceType?: 'Client' | 'Defendant' | 'Other';
  insuranceProvider?: string;
  addedDate: string;
  _fromIntake?: boolean;
}

export interface DirectoryContactEntry {
  id: string;
  label: string;
  value: string;
}

export interface DirectoryAddressEntry {
  id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export type InsuredStatus = 'insured' | 'uninsured';
export type CoverageType = 'liability' | 'full_coverage';

export interface InsuranceAdjuster {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
  addedDate: string;
}

export interface Insurance {
  type: 'Client' | 'Defendant' | 'Other';
  provider: string;
  policyNumber?: string;
  claimNumber?: string;
  adjuster?: string;
  adjusters?: InsuranceAdjuster[];
  coverageLimits?: string;
  insuredStatus?: InsuredStatus;
  coverageType?: CoverageType;
  isUninsured?: boolean;
  coverageStatus?: CoverageStatusType;
  liabilityStatus?: LiabilityStatusType;
  coverageFollowUpDate?: string;
  liabilityFollowUpDate?: string;
  coverageStatusDate?: string;
  liabilityStatusDate?: string;
  policyLimitsStatus?: PolicyLimitsStatusType;
  policyLimitsAmount?: string;
  policyLimitsRequestDate?: string;
  policyLimitsReceivedDate?: string;
}

export interface VehicleInfo {
  year: string;
  make: string;
  model: string;
  damage?: string;
}

export interface ClientDetails {
    full_name?: string;
    date_of_birth?: string;
    ssn?: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
    drivers_license?: { number?: string; state_issued?: string };
    phones?: { home?: string; cell?: string };
    email?: string;
    marital_status?: 'Married' | 'Single';
    primary_language?: string;
    emergency_contact?: { name?: string; phone?: string };
}

export interface ExtendedIntakeData {
  intake_admin?: {
    total_clients?: number;
    primary_language?: string;
    primary_language_other?: string;
    referral_source?: string;
    referral_source_other?: string;
    interview?: {
      date?: string;
      location?: 'Office' | 'Field';
      time?: string;
    };
  };
  accident?: {
    crash_report_number?: string;
    agency?: string;
    city?: string;
    county?: string;
    accident_location?: string;
    plaintiff_role?: string;
    date_of_loss?: string;
    day_of_week?: string;
    time_of_accident?: string;
    weather_conditions?: string;
    weather_conditions_other?: string;
    traffic_controls?: string[];
    traffic_controls_other?: string;
    main_intersections?: string;
    intersection_city?: string;
    plaintiff_direction?: string;
    defendant_direction?: string;
    nature_of_trip?: string;
    speed_limit?: number;
    accident_facts?: string;
  };
  client?: ClientDetails;
  additional_clients?: ClientDetails[];
  employment?: {
    time_lost_from_work?: boolean;
    how_much_time_lost?: string;
    position?: string;
    employer?: {
        name?: string;
        phone?: string;
        address?: { street?: string; city?: string; state?: string; zip?: string }
    };
    wages?: { amount?: number; per?: 'Hour' | 'Week' | 'Year' };
    hours_per_week?: number;
  };
  vehicle_property_damage?: {
    license_plate?: string;
    damaged_vehicle?: { year?: number; make?: string; model?: string; color?: string };
    vehicle_location_or_body_shop?: string;
    body_shop?: { name?: string; address?: string; phone?: string };
    vehicle_drivable?: boolean;
    pictures_taken?: boolean;
    pictures_taken_by_whom?: string;
    airbags_deployed?: boolean;
    seatbelt_worn?: boolean;
    property_damage_amount_or_estimate?: number;
    total_loss?: boolean;
    prior_accidents_within_last_10_years?: boolean;
    prior_accident_dates?: string[];
    injuries_summary?: string;
    at_fault?: boolean;
    claim_made?: boolean;
  };
  medical?: {
    injuries_detail?: string;
    ambulance?: boolean;
    xrays_taken?: boolean;
    hospital?: { name?: string; address?: string; phone?: string };
    pre_existing_conditions?: string;
    conditions_detail?: string;
    doctor_referred_to?: { name?: string; address?: string; phone?: string };
    providers?: Array<{ name: string; address?: string; phone?: string }>;
    um_uim_claim?: string;
  };
  auto_insurance?: {
    driver_or_passenger_insurance_company?: string;
    vehicle_owner_insurance_company?: string;
    claims_adjuster?: { name?: string; phone?: string; ext?: string; email?: string };
    insured_name?: string;
    auto_insurance_type?: 'Personal' | 'Commercial';
    claim_number?: string;
    policy_number?: string;
    insured_policy_info?: string;
  };
  health_insurance?: {
    has_insurance?: boolean;
    company?: string;
    insured_name?: string;
    ssn?: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
    phone?: string;
    email?: string;
    fax?: string;
    group_number?: string;
    id_number?: string;
    member_number?: string;
  };
  first_party_insurance?: {
    company?: string;
    claim_number?: string;
    insured_name?: string;
    policy_number?: string;
    notes?: string;
    insured_status?: InsuredStatus;
    coverage_type?: CoverageType;
    coverage_limits?: string;
  };
  defendant?: {
    name?: string;
    phone?: string;
    address?: { street?: string; city?: string; state?: string; zip?: string };
    drivers_license_number?: string;
    license_plate?: string;
    vehicle?: { year?: number; make?: string; model?: string; color?: string };
    insurance?: {
      company?: string;
      type?: 'Personal' | 'Commercial';
      claim_number?: string;
      policy_number?: string;
      claims_adjuster?: { name?: string; phone?: string; ext?: string; email?: string };
      insured_status?: InsuredStatus;
      coverage_type?: CoverageType;
      coverage_limits?: string;
    };
  };
  passengers_involved?: Array<{ name: string; phone?: string; notes?: string }>;
  notes?: string;
}

export interface TeamNote {
  id: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  content: string;
  createdAt: string;
}

export interface Assignee {
  id: string;
  name: string;
  initials: string;
}

export type CaseTeamRole = 'primary_attorney' | 'paralegal' | 'legal_assistant' | 'staff';

export const CASE_TEAM_ROLE_LABELS: Record<CaseTeamRole, string> = {
  primary_attorney: 'Primary Attorney',
  paralegal: 'Paralegal',
  legal_assistant: 'Legal Assistant',
  staff: 'Staff',
};

export interface CaseTeamMember {
  id: string;
  userId: string;
  name: string;
  initials: string;
  role: CaseTeamRole;
}

export interface CaseTask {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  dueDate: string;
  completedDate?: string;
  assignedTeam?: 'Team A' | 'Team B';
  assignedTo?: Assignee;
  recurrence?: 'one-time' | 'weekly' | 'monthly';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  autoGenerated?: boolean;
}

export interface ERBillLine {
  type: 'facility' | 'physician' | 'radiology';
  status: ERBillStatus;
  requestDate?: string;
  receivedDate?: string;
  followUpDate?: string;
  amount?: number;
  notes?: string;
}

export interface ERVisit {
  id: string;
  facilityName: string;
  facilityId?: string;
  visitDate: string;
  bills: ERBillLine[];
  recordStatus: ERBillStatus;
  recordRequestDate?: string;
  recordReceivedDate?: string;
  recordFollowUpDate?: string;
}

export interface SpecialsPackage {
  id: string;
  status: SpecialsStatus;
  items: SpecialsItem[];
  totalAmount: number;
  compiledDocumentIndex?: number;
  notes?: string;
  lastUpdated: string;
}

export interface SpecialsItem {
  providerName: string;
  providerId?: string;
  documentType: string;
  amount: number;
  included: boolean;
  documentIndex?: number;
}

export interface PreservationRecipient {
  id: string;
  recipientName: string;
  contactName?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  sentDate: string;
  sentBy: string;
  notes?: string;
}

export interface CaseFile {
  id: string;
  firm_id?: string;
  caseNumber?: string;

  clientName: string;
  clientDob?: string;
  clientAddress?: string;
  clientEmail: string;
  clientPhone: string;
  contactPhones?: { value: string; type: string }[];
  contactEmails?: { value: string; type: string }[];

  accidentDate: string;
  location?: string;
  description: string;
  impact?: string;
  statuteOfLimitationsDate?: string;

  vehicleInfo?: VehicleInfo;

  parties?: Party[];
  insurance?: Insurance[];
  adjusters?: Adjuster[];

  treatmentStatus?: string;
  treatmentProviders?: string;
  medicalProviders?: MedicalProvider[];

  status: CaseStatus;
  documents: DocumentAttachment[];
  aiAnalysis?: AIAnalysis;
  createdAt: string;
  referralSource: string;
  activityLog: ActivityLog[];

  actionDate?: string;
  assignedDate?: string;

  assignedTeam?: 'Team A' | 'Team B';
  assignedTo?: Assignee;
  caseTeam?: CaseTeamMember[];
  cmsSyncStatus?: 'PENDING' | 'SYNCED' | 'FAILED';

  extendedIntake?: ExtendedIntakeData;

  linkedEmails?: Email[];
  communications?: CommunicationLog[];

  chatHistory?: ChatMessage[];

  notes?: string;
  teamNotes?: TeamNote[];

  tasks?: CaseTask[];
  erVisits?: ERVisit[];
  mriCompleted?: boolean;
  mriCompletedDate?: string;
  treatmentEndDate?: string;
  specials?: SpecialsPackage;
  workflowInitialized?: boolean;
  lorDefendantSentDate?: string;
  lorClientInsSentDate?: string;
  crashReportRequestedDate?: string;

  preservationRecipients?: PreservationRecipient[];

  financials?: CaseFinancials;
}

export interface CaseFinancials {
  demandAmount?: number;
  demandNotes?: string;

  thirdPartySettlement?: number;
  umUimSettlement?: number;
  medicalPayments?: number;

  feePercentage?: number;

  adminCosts?: number;
  litigationCosts?: number;
  otherCosts?: number;
  otherCostsDescription?: string;

  financialLiens?: FinancialLien[];
  thirdPartyLoans?: ThirdPartyLoan[];
  medicalExpenses?: MedicalExpense[];
  healthInsuranceSubs?: HealthInsuranceSub[];
}

export interface FinancialLien {
  id: string;
  description?: string;
  amount: number;
  date?: string;
  reducedAmount: number;
  checkNumber?: string;
}

export interface ThirdPartyLoan {
  id: string;
  description?: string;
  loanAmount: number;
  loanDate?: string;
  finalAmount: number;
  dateDue?: string;
}

export interface MedicalExpense {
  id: string;
  facility: string;
  totalCharges: number;
  amountDue: number;
  reductionAmount: number;
  clientResponsible: number;
  notes?: string;
  linkedProviderId?: string;
}

export interface HealthInsuranceSub {
  id: string;
  carrier: string;
  originalBill: number;
  compromisedBill: number;
  reductionAmount: number;
  notes?: string;
}
