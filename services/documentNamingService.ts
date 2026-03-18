import { DocumentType, DOCUMENT_NAMING_RULES } from '../types';

function sanitizePart(str: string): string {
  return str.replace(/[^a-zA-Z0-9]/g, '').trim();
}

function parseClientName(fullName: string): { last: string; first: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { last: 'Unknown', first: 'Unknown' };
  if (parts.length === 1) return { last: sanitizePart(parts[0]), first: 'Unknown' };
  const last = sanitizePart(parts[parts.length - 1]);
  const first = sanitizePart(parts[0]);
  return { last: last || 'Unknown', first: first || 'Unknown' };
}

function formatDol(dateStr: string): string {
  if (!dateStr) return '00000000';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '00000000';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function getDocTypeLabel(docType: DocumentType | string): string {
  const mapping: Record<string, string> = {
    retainer: 'Retainer',
    crash_report: 'CrashReport',
    medical_record: 'MedicalRecord',
    authorization: 'HIPAAAuth',
    insurance_card: 'InsuranceCard',
    photo: 'Photo',
    email: 'Email',
    other: 'Document',
    er_facility_bill: 'ERFacilityBill',
    er_physician_bill: 'ERPhysicianBill',
    er_radiology_bill: 'ERRadiologyBill',
    er_facility_record: 'ERFacilityRecord',
    hospital_facility_bill: 'HospitalFacilityBill',
    hospital_physician_bill: 'HospitalPhysicianBill',
    chiro_bill: 'ChiroBill',
    pt_bill: 'PTBill',
    ortho_bill: 'OrthoBill',
    neuro_bill: 'NeuroBill',
    pain_mgmt_bill: 'PainMgmtBill',
    pcp_bill: 'PCPBill',
    imaging_bill: 'ImagingBill',
    surgery_bill: 'SurgeryBill',
    lab_bill: 'LabBill',
    pharmacy_bill: 'PharmacyBill',
    ambulance_bill: 'AmbulanceBill',
    medical_bill: 'MedicalBill',
  };
  return mapping[docType] || sanitizePart(DOCUMENT_NAMING_RULES[docType] || docType) || 'Document';
}

export function generateDocumentName(params: {
  clientName: string;
  dol: string;
  docType: DocumentType | string;
  source?: string;
  version?: number;
}): string {
  const { last, first } = parseClientName(params.clientName);
  const dolFormatted = formatDol(params.dol);
  const docTypeLabel = getDocTypeLabel(params.docType);
  const source = params.source ? sanitizePart(params.source) : '';
  const version = params.version || 1;

  const parts = [last, first, dolFormatted, docTypeLabel];
  if (source) parts.push(source);
  parts.push(`v${version}`);

  return parts.join('_');
}

export function generateDocumentNameWithExt(params: {
  clientName: string;
  dol: string;
  docType: DocumentType | string;
  source?: string;
  version?: number;
  originalFileName: string;
}): string {
  const baseName = generateDocumentName(params);
  const ext = params.originalFileName.includes('.')
    ? params.originalFileName.substring(params.originalFileName.lastIndexOf('.'))
    : '';
  return baseName + ext;
}
