import React from 'react';
import { DocumentFormType } from './DocumentGenerator';

export interface DocumentFields {
  clientName: string;
  clientDob: string;
  clientPhone: string;
  clientEmail: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  clientSsn: string;
  accidentDate: string;
  accidentLocation: string;
  accidentTime: string;
  crashReportNo: string;
  defName: string;
  defInsurer: string;
  defInsAddress: string;
  defClaimsEmail: string;
  defClaimsFax: string;
  defClaimsPhone: string;
  claimNo: string;
  clientInsurer: string;
  clientInsAddress: string;
  clientClaimsEmail: string;
  clientClaimsFax: string;
  clientClaimsPhone: string;
  clientClaimNo: string;
  clientPolicyNo: string;
  providerName: string;
  providerAddress: string;
  providerFax: string;
  recipientName: string;
  recipientContact: string;
  recipientAddress: string;
  recipientCityStateZip: string;
}

interface FieldDef {
  key: keyof DocumentFields;
  label: string;
  placeholder?: string;
}

interface FieldGroup {
  title: string;
  fields: FieldDef[];
}

const FIELD_GROUPS: Record<string, FieldGroup[]> = {
  rep_lien_3p: [
    {
      title: 'Client',
      fields: [
        { key: 'clientName', label: 'Client Name' },
      ],
    },
    {
      title: 'Defendant',
      fields: [
        { key: 'defName', label: 'Defendant Name' },
      ],
    },
    {
      title: 'Defendant Insurance',
      fields: [
        { key: 'defInsurer', label: 'Insurance Company' },
        { key: 'defInsAddress', label: 'Address' },
        { key: 'defClaimsEmail', label: 'Claims Email' },
        { key: 'defClaimsFax', label: 'Claims Fax' },
        { key: 'claimNo', label: 'Claim #' },
      ],
    },
    {
      title: 'Case',
      fields: [
        { key: 'accidentDate', label: 'Date of Loss' },
      ],
    },
  ],
  rep_lien_1p: [
    {
      title: 'Client',
      fields: [
        { key: 'clientName', label: 'Client Name' },
      ],
    },
    {
      title: 'Client Insurance',
      fields: [
        { key: 'clientInsurer', label: 'Insurance Company' },
        { key: 'clientInsAddress', label: 'Address' },
        { key: 'clientClaimsEmail', label: 'Claims Email' },
        { key: 'clientClaimsFax', label: 'Claims Fax' },
        { key: 'clientClaimNo', label: 'Claim #' },
        { key: 'clientPolicyNo', label: 'Policy #' },
      ],
    },
    {
      title: 'Case',
      fields: [
        { key: 'accidentDate', label: 'Date of Loss' },
      ],
    },
  ],
  foia: [
    {
      title: 'Client',
      fields: [
        { key: 'clientName', label: 'Client Name' },
      ],
    },
    {
      title: 'Case',
      fields: [
        { key: 'accidentDate', label: 'Date of Loss' },
        { key: 'accidentLocation', label: 'Accident Location' },
        { key: 'crashReportNo', label: 'Crash Report #' },
      ],
    },
  ],
  bill_request: [
    {
      title: 'Client',
      fields: [
        { key: 'clientName', label: 'Client Name' },
        { key: 'clientDob', label: 'Date of Birth' },
        { key: 'clientPhone', label: 'Phone' },
        { key: 'clientAddress', label: 'Address' },
        { key: 'clientCity', label: 'City' },
        { key: 'clientState', label: 'State' },
        { key: 'clientZip', label: 'Zip' },
        { key: 'clientSsn', label: 'SSN' },
      ],
    },
    {
      title: 'Provider',
      fields: [
        { key: 'providerName', label: 'Provider Name' },
        { key: 'providerAddress', label: 'Provider Address' },
        { key: 'providerFax', label: 'Provider Fax' },
      ],
    },
    {
      title: 'Case',
      fields: [
        { key: 'accidentDate', label: 'Date of Loss' },
      ],
    },
  ],
  records_request: [
    {
      title: 'Client',
      fields: [
        { key: 'clientName', label: 'Client Name' },
        { key: 'clientDob', label: 'Date of Birth' },
      ],
    },
    {
      title: 'Provider',
      fields: [
        { key: 'providerName', label: 'Provider Name' },
        { key: 'providerAddress', label: 'Provider Address' },
        { key: 'providerFax', label: 'Provider Fax' },
      ],
    },
    {
      title: 'Case',
      fields: [
        { key: 'accidentDate', label: 'Date of Loss' },
      ],
    },
  ],
  hipaa_auth: [
    {
      title: 'Client',
      fields: [
        { key: 'clientName', label: 'Client Name' },
        { key: 'clientDob', label: 'Date of Birth' },
        { key: 'clientPhone', label: 'Phone' },
        { key: 'clientAddress', label: 'Address' },
      ],
    },
    {
      title: 'Provider',
      fields: [
        { key: 'providerName', label: 'Provider Name' },
        { key: 'providerAddress', label: 'Provider Address' },
      ],
    },
    {
      title: 'Case',
      fields: [
        { key: 'accidentDate', label: 'Date of Loss' },
      ],
    },
  ],
  preservation_of_evidence: [
    {
      title: 'Client',
      fields: [
        { key: 'clientName', label: 'Client Name' },
      ],
    },
    {
      title: 'Recipient',
      fields: [
        { key: 'recipientName', label: 'Business Name' },
        { key: 'recipientContact', label: 'Contact Name' },
        { key: 'recipientAddress', label: 'Address' },
        { key: 'recipientCityStateZip', label: 'City, State Zip' },
      ],
    },
    {
      title: 'Case',
      fields: [
        { key: 'accidentDate', label: 'Date of Loss' },
        { key: 'accidentLocation', label: 'Accident Location' },
        { key: 'accidentTime', label: 'Time of Accident' },
        { key: 'crashReportNo', label: 'Crash Report #' },
      ],
    },
  ],
};

FIELD_GROUPS['rep_lien'] = FIELD_GROUPS['rep_lien_3p'];
FIELD_GROUPS['er_bill_request'] = FIELD_GROUPS['bill_request'];
FIELD_GROUPS['er_records_request'] = FIELD_GROUPS['records_request'];
FIELD_GROUPS['medical_bill_request'] = FIELD_GROUPS['bill_request'];

interface DocumentFieldsPanelProps {
  formType: DocumentFormType;
  fields: DocumentFields;
  onChange: (key: keyof DocumentFields, value: string) => void;
}

const inputClass = "w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-stone-800";

export const DocumentFieldsPanel: React.FC<DocumentFieldsPanelProps> = ({ formType, fields, onChange }) => {
  const groups = FIELD_GROUPS[formType];

  if (!groups) return null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-stone-200 bg-stone-50">
        <h3 className="text-sm font-bold text-stone-800">Form Fields</h3>
        <p className="text-xs text-stone-500 mt-0.5">Edit values before generating</p>
      </div>
      <div className="p-4 space-y-5">
        {groups.map((group, gi) => (
          <div key={gi}>
            <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">{group.title}</h4>
            <div className="space-y-2.5">
              {group.fields.map(field => {
                const value = fields[field.key];
                const isEmpty = !value || value.startsWith('[');
                return (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-stone-600 mb-0.5">{field.label}</label>
                    <input
                      className={`${inputClass} ${isEmpty ? 'border-amber-300 bg-amber-50/50' : ''}`}
                      value={value}
                      onChange={e => onChange(field.key, e.target.value)}
                      placeholder={field.placeholder || field.label}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
