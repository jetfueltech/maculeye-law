import React, { useState, useRef } from 'react';
import { MedicalProviderType, DOCUMENT_NAMING_RULES } from '../types';

export interface ExtractedBillData {
  providerName?: string;
  providerAddress?: string;
  providerCity?: string;
  providerState?: string;
  providerZip?: string;
  providerPhone?: string;
  providerFax?: string;
  providerType?: MedicalProviderType;
  patientName?: string;
  patientDob?: string;
  patientAccountNumber?: string;
  dateOfService?: string;
  dateOfServiceEnd?: string;
  totalCharges?: number;
  amountPaid?: number;
  amountDue?: number;
  insurancePayments?: number;
  adjustments?: number;
  lineItems?: Array<{
    description?: string;
    cptCode?: string;
    date?: string;
    amount?: number;
  }>;
  diagnosisCodes?: string[];
  billType?: string;
  documentTypeKey?: string;
  pageSpan?: string;
  notes?: string;
}

export type DocumentStructure = 'single_bill' | 'single_bill_multipage' | 'bill_packet';

export interface ExtractedBillEntry {
  bill: ExtractedBillData;
  fileData: string;
  fileName: string;
  mimeType: string;
  selected: boolean;
  documentStructure: DocumentStructure;
}

interface MedicalBillUploadProps {
  onBillsExtracted: (entries: ExtractedBillEntry[]) => void;
  onClose: () => void;
}

interface FileProcessState {
  name: string;
  status: 'pending' | 'reading' | 'extracting' | 'done' | 'error';
  billCount?: number;
  documentStructure?: DocumentStructure;
  error?: string;
}

const PROVIDER_TYPE_LABELS: Record<string, string> = {
  hospital: 'Hospital',
  er: 'Emergency Room',
  urgent_care: 'Urgent Care',
  chiropractor: 'Chiropractor',
  physical_therapy: 'Physical Therapy',
  orthopedic: 'Orthopedic',
  neurologist: 'Neurologist',
  pain_management: 'Pain Management',
  primary_care: 'Primary Care',
  imaging: 'Imaging Center',
  surgery_center: 'Surgery Center',
  other: 'Other',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  er_facility_bill: 'ER Facility Bill',
  er_physician_bill: 'ER Physician Bill',
  er_radiology_bill: 'ER Radiology Bill',
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
  ...DOCUMENT_NAMING_RULES,
};

const STRUCTURE_LABELS: Record<DocumentStructure, string> = {
  single_bill: 'Single Bill',
  single_bill_multipage: 'Multi-Page Bill',
  bill_packet: 'Bill Packet',
};

const STRUCTURE_COLORS: Record<DocumentStructure, string> = {
  single_bill: 'bg-slate-100 text-slate-600 border-slate-200',
  single_bill_multipage: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  bill_packet: 'bg-amber-50 text-amber-700 border-amber-200',
};

function formatCurrency(val: number | undefined | null): string {
  if (val === undefined || val === null) return '--';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
const MAX_SIZE = 20 * 1024 * 1024;

interface ExtractionResult {
  bills: ExtractedBillData[];
  documentStructure: DocumentStructure;
}

export const MedicalBillUpload: React.FC<MedicalBillUploadProps> = ({ onBillsExtracted, onClose }) => {
  const [phase, setPhase] = useState<'upload' | 'processing' | 'review'>('upload');
  const [fileStates, setFileStates] = useState<FileProcessState[]>([]);
  const [extractedBills, setExtractedBills] = useState<ExtractedBillEntry[]>([]);
  const [expandedBill, setExpandedBill] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const extractBillsFromFile = async (
    fileData: string,
    mimeType: string,
    fileName: string
  ): Promise<ExtractionResult> => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-medical-bill`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileData, mimeType, fileName }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    if (result.error) throw new Error(result.error);

    const bills = Array.isArray(result.bills) ? result.bills : [];
    const documentStructure: DocumentStructure = result.documentStructure || (bills.length > 1 ? 'bill_packet' : 'single_bill');

    return { bills, documentStructure };
  };

  const processFiles = async (files: File[]) => {
    const validFiles = files.filter(f => {
      if (f.size > MAX_SIZE) return false;
      if (!ALLOWED_TYPES.includes(f.type)) return false;
      return true;
    });

    if (validFiles.length === 0) return;

    const initialStates: FileProcessState[] = validFiles.map(f => ({
      name: f.name,
      status: 'pending',
    }));
    setFileStates(initialStates);
    setPhase('processing');
    setExtractedBills([]);

    const allBills: ExtractedBillEntry[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];

      setFileStates(prev => prev.map((s, idx) =>
        idx === i ? { ...s, status: 'reading' } : s
      ));

      try {
        const fileData = await readFileAsDataURL(file);

        setFileStates(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'extracting' } : s
        ));

        const { bills, documentStructure } = await extractBillsFromFile(fileData, file.type, file.name);

        const entries: ExtractedBillEntry[] = bills.map(bill => ({
          bill,
          fileData,
          fileName: file.name,
          mimeType: file.type,
          selected: true,
          documentStructure,
        }));

        allBills.push(...entries);

        setFileStates(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'done', billCount: bills.length, documentStructure } : s
        ));
      } catch (err) {
        setFileStates(prev => prev.map((s, idx) =>
          idx === i ? { ...s, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' } : s
        ));
      }
    }

    setExtractedBills(allBills);
    if (allBills.length > 0) {
      setPhase('review');
      setExpandedBill(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) processFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) processFiles(files);
  };

  const toggleBillSelection = (idx: number) => {
    setExtractedBills(prev => prev.map((entry, i) =>
      i === idx ? { ...entry, selected: !entry.selected } : entry
    ));
  };

  const toggleAll = () => {
    const allSelected = extractedBills.every(e => e.selected);
    setExtractedBills(prev => prev.map(e => ({ ...e, selected: !allSelected })));
  };

  const handleApplySelected = () => {
    const selected = extractedBills.filter(e => e.selected);
    if (selected.length > 0) onBillsExtracted(selected);
  };

  const handleAddMore = () => {
    setPhase('upload');
    setFileStates([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const selectedCount = extractedBills.filter(e => e.selected).length;
  const totalChargesSelected = extractedBills
    .filter(e => e.selected)
    .reduce((sum, e) => sum + (e.bill.totalCharges || 0), 0);

  const getDocTypeLabel = (key?: string) => {
    if (!key) return null;
    return DOC_TYPE_LABELS[key] || key;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Upload Medical Bills</h3>
            <p className="text-xs text-slate-500">
              {phase === 'upload' && 'Upload one or more bill files -- AI will find all bills in each document'}
              {phase === 'processing' && 'Analyzing documents...'}
              {phase === 'review' && `${extractedBills.length} bill${extractedBills.length !== 1 ? 's' : ''} found across ${new Set(extractedBills.map(e => e.fileName)).size} file${new Set(extractedBills.map(e => e.fileName)).size !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-6">
        {phase === 'upload' && (
          <div
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              dragOver
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">
              Drop medical bills here or click to browse
            </p>
            <p className="text-xs text-slate-400">
              PDF, PNG, JPG up to 20MB each -- select multiple files at once
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Multi-page bills and bill packets with multiple bills are both supported
            </p>
          </div>
        )}

        {phase === 'processing' && (
          <div className="space-y-4">
            {fileStates.map((fs, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex-shrink-0">
                  {fs.status === 'done' && (
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {fs.status === 'error' && (
                    <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  {(fs.status === 'pending' || fs.status === 'reading' || fs.status === 'extracting') && (
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center relative">
                      {fs.status === 'pending' ? (
                        <div className="w-2 h-2 bg-slate-300 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{fs.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500">
                      {fs.status === 'pending' && 'Waiting...'}
                      {fs.status === 'reading' && 'Reading file...'}
                      {fs.status === 'extracting' && 'AI analyzing for bills...'}
                      {fs.status === 'done' && `${fs.billCount} bill${fs.billCount !== 1 ? 's' : ''} found`}
                      {fs.status === 'error' && <span className="text-red-500">{fs.error}</span>}
                    </p>
                    {fs.status === 'done' && fs.documentStructure && (
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${STRUCTURE_COLORS[fs.documentStructure]}`}>
                        {STRUCTURE_LABELS[fs.documentStructure]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {fileStates.every(f => f.status === 'done' || f.status === 'error') && extractedBills.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 mb-3">No bills could be extracted from the uploaded files.</p>
                <button
                  onClick={handleAddMore}
                  className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {phase === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    extractedBills.every(e => e.selected)
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300'
                  }`}>
                    {extractedBills.every(e => e.selected) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  {extractedBills.every(e => e.selected) ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs text-slate-400">
                  {selectedCount} of {extractedBills.length} selected
                </span>
              </div>
              <button
                onClick={handleAddMore}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add More Files
              </button>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {extractedBills.map((entry, idx) => {
                const { bill } = entry;
                const isExpanded = expandedBill === idx;
                const docTypeLabel = getDocTypeLabel(bill.documentTypeKey);
                return (
                  <div
                    key={idx}
                    className={`rounded-xl border transition-all ${
                      entry.selected
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div className="px-4 py-3 flex items-center gap-3">
                      <button
                        onClick={() => toggleBillSelection(idx)}
                        className="flex-shrink-0"
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          entry.selected
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}>
                          {entry.selected && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </button>

                      <button
                        className="flex-1 min-w-0 flex items-center justify-between text-left"
                        onClick={() => setExpandedBill(isExpanded ? null : idx)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-900 truncate">
                              {bill.providerName || 'Unknown Provider'}
                            </span>
                            {docTypeLabel && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                {docTypeLabel}
                              </span>
                            )}
                            {entry.documentStructure === 'bill_packet' && (
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${STRUCTURE_COLORS.bill_packet}`}>
                                Packet
                              </span>
                            )}
                            {entry.documentStructure === 'single_bill_multipage' && (
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${STRUCTURE_COLORS.single_bill_multipage}`}>
                                Multi-Page
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                            {bill.dateOfService && <span>DOS: {bill.dateOfService}</span>}
                            {bill.pageSpan && (
                              <>
                                <span className="text-slate-300">|</span>
                                <span>Pages {bill.pageSpan}</span>
                              </>
                            )}
                            <span className="text-slate-300">|</span>
                            <span className="truncate">{entry.fileName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className="text-sm font-bold text-slate-900">
                            {formatCurrency(bill.totalCharges)}
                          </span>
                          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-3 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Provider</h5>
                            {bill.providerName && <p className="text-sm font-medium text-slate-900">{bill.providerName}</p>}
                            {bill.providerType && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                                {PROVIDER_TYPE_LABELS[bill.providerType] || bill.providerType}
                              </span>
                            )}
                            {(bill.providerAddress || bill.providerCity) && (
                              <p className="text-xs text-slate-500 mt-1">
                                {[bill.providerAddress, bill.providerCity, bill.providerState, bill.providerZip].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {bill.providerPhone && <p className="text-xs text-slate-500">Phone: {bill.providerPhone}</p>}
                            {bill.providerFax && <p className="text-xs text-slate-500">Fax: {bill.providerFax}</p>}
                          </div>

                          <div className="bg-white rounded-lg p-3 border border-slate-100">
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Financial Summary</h5>
                            <div className="space-y-1.5">
                              <div className="flex justify-between">
                                <span className="text-xs text-slate-500">Total Charges</span>
                                <span className="text-xs font-bold text-slate-900">{formatCurrency(bill.totalCharges)}</span>
                              </div>
                              {bill.insurancePayments != null && (
                                <div className="flex justify-between">
                                  <span className="text-xs text-slate-500">Insurance Paid</span>
                                  <span className="text-xs font-medium text-emerald-600">-{formatCurrency(bill.insurancePayments)}</span>
                                </div>
                              )}
                              {bill.adjustments != null && (
                                <div className="flex justify-between">
                                  <span className="text-xs text-slate-500">Adjustments</span>
                                  <span className="text-xs font-medium text-slate-500">-{formatCurrency(bill.adjustments)}</span>
                                </div>
                              )}
                              {bill.amountPaid != null && (
                                <div className="flex justify-between">
                                  <span className="text-xs text-slate-500">Amount Paid</span>
                                  <span className="text-xs font-medium text-slate-600">{formatCurrency(bill.amountPaid)}</span>
                                </div>
                              )}
                              {bill.amountDue != null && (
                                <div className="flex justify-between pt-1.5 border-t border-slate-100">
                                  <span className="text-xs font-bold text-slate-700">Balance Due</span>
                                  <span className="text-xs font-bold text-red-600">{formatCurrency(bill.amountDue)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {bill.patientName && (
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Patient: <strong className="text-slate-700">{bill.patientName}</strong></span>
                            {bill.patientDob && <span>DOB: {bill.patientDob}</span>}
                            {bill.patientAccountNumber && <span>Acct: {bill.patientAccountNumber}</span>}
                          </div>
                        )}

                        {bill.lineItems && bill.lineItems.length > 0 && (
                          <div>
                            <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                              Itemized Charges ({bill.lineItems.length})
                            </h5>
                            <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-slate-200 bg-slate-50">
                                    <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Service</th>
                                    <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">CPT</th>
                                    <th className="text-left px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Date</th>
                                    <th className="text-right px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bill.lineItems.map((item, li) => (
                                    <tr key={li} className="border-b border-slate-50 last:border-0">
                                      <td className="px-3 py-1.5 text-slate-700">{item.description || '--'}</td>
                                      <td className="px-3 py-1.5 text-slate-500 font-mono">{item.cptCode || '--'}</td>
                                      <td className="px-3 py-1.5 text-slate-500">{item.date || '--'}</td>
                                      <td className="px-3 py-1.5 text-right font-medium text-slate-900">{formatCurrency(item.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-slate-200 bg-slate-50">
                                    <td colSpan={3} className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase text-right">Total</td>
                                    <td className="px-3 py-1.5 text-right text-xs font-bold text-slate-900">{formatCurrency(bill.totalCharges)}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}

                        {bill.diagnosisCodes && bill.diagnosisCodes.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Dx:</span>
                            {bill.diagnosisCodes.map((code, ci) => (
                              <span key={ci} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[11px] font-mono font-medium rounded border border-amber-200">
                                {code}
                              </span>
                            ))}
                          </div>
                        )}

                        {bill.notes && (
                          <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                            <span className="font-bold">AI Notes:</span> {bill.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="text-sm text-slate-600">
                <span className="font-bold">{selectedCount}</span> bill{selectedCount !== 1 ? 's' : ''} selected
                {selectedCount > 0 && (
                  <span className="ml-2 text-slate-400">
                    -- Total: <span className="font-bold text-slate-700">{formatCurrency(totalChargesSelected)}</span>
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplySelected}
                  disabled={selectedCount === 0}
                  className="px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Apply {selectedCount} Bill{selectedCount !== 1 ? 's' : ''} to Case
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
