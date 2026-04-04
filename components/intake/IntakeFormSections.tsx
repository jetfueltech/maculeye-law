import React from 'react';
import { ExtractedIntakeData } from '../../services/documentExtractionService';

interface SectionProps {
  data: ExtractedIntakeData;
  getFieldValue: (key: string) => string;
  getFieldStyle: (key: string) => string;
  isAnimating: (key: string) => boolean;
  updateField: (field: keyof ExtractedIntakeData, value: string | boolean) => void;
  getBoolValue: (key: string) => boolean;
}

const inputClass = "w-full bg-white border border-stone-200 rounded-lg px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-stone-400 transition-all shadow-sm";
const labelClass = "text-xs font-bold text-stone-500 uppercase mb-1.5 block tracking-wide";
const checkboxRowClass = "flex items-center space-x-2";

const Field: React.FC<{
  label: string;
  field: keyof ExtractedIntakeData;
  placeholder?: string;
  type?: string;
  colSpan?: number;
  props: SectionProps;
}> = ({ label, field, placeholder, type = 'text', colSpan, props }) => (
  <div className={colSpan ? `col-span-${colSpan}` : ''} style={colSpan ? { gridColumn: `span ${colSpan}` } : undefined}>
    <label className={labelClass}>{label}</label>
    {type === 'textarea' ? (
      <textarea
        className={`${inputClass} h-28 resize-none ${props.getFieldStyle(field)}`}
        value={props.getFieldValue(field)}
        onChange={e => props.updateField(field, e.target.value)}
        placeholder={placeholder}
        readOnly={props.isAnimating(field)}
      />
    ) : type === 'date' ? (
      <input
        type={props.isAnimating(field) ? 'text' : 'date'}
        className={`${inputClass} ${props.getFieldStyle(field)}`}
        value={props.getFieldValue(field)}
        onChange={e => props.updateField(field, e.target.value)}
        readOnly={props.isAnimating(field)}
      />
    ) : type === 'time' ? (
      <input
        type={props.isAnimating(field) ? 'text' : 'time'}
        className={`${inputClass} ${props.getFieldStyle(field)}`}
        value={props.getFieldValue(field)}
        onChange={e => props.updateField(field, e.target.value)}
        readOnly={props.isAnimating(field)}
      />
    ) : (
      <input
        type={type}
        className={`${inputClass} ${props.getFieldStyle(field)}`}
        value={props.getFieldValue(field)}
        onChange={e => props.updateField(field, e.target.value)}
        placeholder={placeholder}
        readOnly={props.isAnimating(field)}
      />
    )}
  </div>
);

const Checkbox: React.FC<{
  label: string;
  field: keyof ExtractedIntakeData;
  props: SectionProps;
}> = ({ label, field, props }) => (
  <div className={`${checkboxRowClass} ${props.getFieldStyle(field)} rounded-lg px-2 py-1`}>
    <input
      type="checkbox"
      className="w-4 h-4 text-blue-600 rounded"
      checked={props.getBoolValue(field)}
      onChange={e => props.updateField(field, e.target.checked)}
      disabled={props.isAnimating(field)}
    />
    <span className="text-sm font-medium text-stone-700">{label}</span>
  </div>
);

const Select: React.FC<{
  label: string;
  field: keyof ExtractedIntakeData;
  options: string[];
  props: SectionProps;
}> = ({ label, field, options, props }) => (
  <div>
    <label className={labelClass}>{label}</label>
    <select
      className={`${inputClass} ${props.getFieldStyle(field)}`}
      value={props.getFieldValue(field)}
      onChange={e => props.updateField(field, e.target.value)}
      disabled={props.isAnimating(field)}
    >
      <option value="">Select...</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

export const ClientSection: React.FC<SectionProps> = (props) => (
  <div className="space-y-5 animate-fade-in">
    <div className="grid grid-cols-2 gap-4">
      <Field label="Full Name" field="clientName" placeholder="e.g. John Doe" props={props} colSpan={2} />
      <Field label="Date of Birth" field="clientDob" type="date" props={props} />
      <Field label="SSN" field="clientSsn" placeholder="XXX-XX-XXXX" props={props} />
      <Field label="Cell Phone" field="clientPhone" placeholder="(555) 555-5555" type="tel" props={props} />
      <Field label="Home Phone" field="clientHomePhone" placeholder="(555) 555-5555" type="tel" props={props} />
      <Field label="Email" field="clientEmail" placeholder="client@example.com" type="email" props={props} colSpan={2} />
      <Select label="Marital Status" field="clientMaritalStatus" options={['Single', 'Married', 'Divorced', 'Widowed']} props={props} />
      <Select label="Primary Language" field="primaryLanguage" options={['English', 'Spanish', 'Polish', 'Other']} props={props} />
    </div>

    <div className="border-t border-stone-100 pt-4">
      <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Address</h5>
      <div className="grid grid-cols-6 gap-3">
        <div style={{ gridColumn: 'span 6' }}>
          <Field label="Street" field="clientAddress" placeholder="Street address" props={props} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="City" field="clientCity" placeholder="City" props={props} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <Field label="State" field="clientState" placeholder="ST" props={props} />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <Field label="Zip" field="clientZip" placeholder="Zip" props={props} />
        </div>
      </div>
    </div>

    <div className="border-t border-stone-100 pt-4">
      <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Driver's License</h5>
      <div className="grid grid-cols-2 gap-4">
        <Field label="DL Number" field="clientDriversLicenseNumber" placeholder="License number" props={props} />
        <Field label="State Issued" field="clientDriversLicenseState" placeholder="ST" props={props} />
      </div>
    </div>

    <div className="border-t border-stone-100 pt-4">
      <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Emergency Contact</h5>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Contact Name" field="emergencyContactName" placeholder="Name" props={props} />
        <Field label="Contact Phone" field="emergencyContactPhone" placeholder="Phone" type="tel" props={props} />
      </div>
    </div>
  </div>
);

export const AccidentSection: React.FC<SectionProps> = (props) => (
  <div className="space-y-5 animate-fade-in">
    <div className="grid grid-cols-2 gap-4">
      <Field label="Date of Accident" field="accidentDate" type="date" props={props} />
      <Field label="Time of Accident" field="accidentTime" type="time" props={props} />
      <Field label="Crash Report #" field="policeReportNumber" placeholder="Report number" props={props} />
      <Field label="Police Agency" field="policeAgency" placeholder="Agency name" props={props} />
      <Field label="Street / Intersection" field="accidentLocation" placeholder="e.g. Main St & 5th Ave" props={props} colSpan={2} />
    </div>
    <div className="grid grid-cols-6 gap-3">
      <div style={{ gridColumn: 'span 3' }}>
        <Field label="City" field="accidentCity" placeholder="City" props={props} />
      </div>
      <div style={{ gridColumn: 'span 1' }}>
        <Field label="County" field="accidentCounty" placeholder="County" props={props} />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <Field label="Main Intersections" field="mainIntersections" placeholder="Nearby intersections" props={props} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Select label="Plaintiff Role" field="plaintiffRole" options={['Driver', 'Passenger', 'Pedestrian']} props={props} />
      <Select label="Weather" field="weatherConditions" options={['Clear', 'Rain', 'Snow', 'Ice', 'Fog']} props={props} />
      <Field label="Speed Limit" field="speedLimit" placeholder="MPH" props={props} />
      <div />
      <Field label="Plaintiff Direction" field="plaintiffDirection" placeholder="e.g. Northbound" props={props} />
      <Field label="Defendant Direction" field="defendantDirection" placeholder="e.g. Westbound" props={props} />
      <Field label="Accident Narrative" field="accidentDescription" type="textarea" placeholder="Describe how the accident occurred..." props={props} colSpan={2} />
    </div>
  </div>
);

export const DefendantSection: React.FC<SectionProps> = (props) => (
  <div className="space-y-5 animate-fade-in">
    <div className="grid grid-cols-2 gap-4">
      <Field label="Defendant Name" field="defendantName" placeholder="Defendant name" props={props} />
      <Field label="Phone" field="defendantPhone" placeholder="Phone" type="tel" props={props} />
      <Field label="Driver's License" field="defendantDriversLicense" placeholder="DL number" props={props} />
      <Field label="License Plate" field="defendantLicensePlate" placeholder="Plate number" props={props} />
    </div>

    <div className="border-t border-stone-100 pt-4">
      <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Address</h5>
      <div className="grid grid-cols-6 gap-3">
        <div style={{ gridColumn: 'span 6' }}>
          <Field label="Street" field="defendantAddressStreet" placeholder="Street" props={props} />
        </div>
        <div style={{ gridColumn: 'span 3' }}>
          <Field label="City" field="defendantAddressCity" placeholder="City" props={props} />
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <Field label="State" field="defendantAddressState" placeholder="ST" props={props} />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <Field label="Zip" field="defendantAddressZip" placeholder="Zip" props={props} />
        </div>
      </div>
    </div>

    <div className="border-t border-stone-100 pt-4">
      <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Defendant Vehicle</h5>
      <div className="grid grid-cols-4 gap-3">
        <Field label="Year" field="defendantVehicleYear" placeholder="Year" props={props} />
        <Field label="Make" field="defendantVehicleMake" placeholder="Make" props={props} />
        <Field label="Model" field="defendantVehicleModel" placeholder="Model" props={props} />
        <Field label="Color" field="defendantVehicleColor" placeholder="Color" props={props} />
      </div>
    </div>

    <div className="border-t border-stone-100 pt-4">
      <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Defendant Insurance</h5>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Insurance Company" field="defendantInsurance" placeholder="Company" props={props} />
        <Select label="Type" field="defendantInsuranceType" options={['Personal', 'Commercial']} props={props} />
        <Field label="Policy #" field="defendantPolicyNumber" placeholder="Policy number" props={props} />
        <Field label="Claim #" field="defendantClaimNumber" placeholder="Claim number" props={props} />
        <Field label="Coverage Limits" field="defendantCoverageLimits" placeholder="e.g. 100/300/100" props={props} />
        <div />
        <Field label="Adjuster Name" field="defendantAdjusterName" placeholder="Adjuster name" props={props} />
        <Field label="Adjuster Phone" field="defendantAdjusterPhone" placeholder="Adjuster phone" type="tel" props={props} />
      </div>
    </div>
  </div>
);

export const InsuranceSection: React.FC<SectionProps> = (props) => (
  <div className="space-y-5 animate-fade-in">
    <div>
      <h5 className="text-sm font-bold text-stone-700 mb-3 flex items-center">
        First Party Auto Insurance
        <span className="ml-2 bg-stone-100 text-stone-500 text-[10px] px-2 py-0.5 rounded-full uppercase">Client</span>
      </h5>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Insurance Company" field="clientInsurance" placeholder="Company" props={props} />
        <Field label="Policy #" field="clientPolicyNumber" placeholder="Policy number" props={props} />
        <Field label="Claim #" field="clientClaimNumber" placeholder="Claim number" props={props} />
        <Field label="Coverage Limits" field="clientInsuranceCoverageLimits" placeholder="e.g. 50/100/50" props={props} />
      </div>
    </div>

    <div className="border-t border-stone-100 pt-4">
      <h5 className="text-sm font-bold text-stone-700 mb-3 flex items-center">
        Health Insurance
        <span className="ml-2 bg-stone-100 text-stone-500 text-[10px] px-2 py-0.5 rounded-full uppercase">Medical</span>
      </h5>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Company" field="healthInsuranceCompany" placeholder="e.g. Blue Cross" props={props} />
        <Field label="Member ID" field="healthInsuranceMemberNumber" placeholder="Member number" props={props} />
        <Field label="Group #" field="healthInsuranceGroupNumber" placeholder="Group number" props={props} />
      </div>
    </div>
  </div>
);

export const VehicleSection: React.FC<SectionProps> = (props) => (
  <div className="space-y-5 animate-fade-in">
    <div className="grid grid-cols-4 gap-4">
      <Field label="Year" field="vehicleYear" placeholder="20XX" props={props} />
      <Field label="Make" field="vehicleMake" placeholder="Toyota" props={props} />
      <Field label="Model" field="vehicleModel" placeholder="Camry" props={props} />
      <Field label="Color" field="vehicleColor" placeholder="Color" props={props} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Field label="License Plate" field="vehicleLicensePlate" placeholder="Plate #" props={props} />
      <Field label="Damage Estimate ($)" field="propertyDamageEstimate" placeholder="Amount" props={props} />
    </div>
    <div className="flex gap-6 py-2">
      <Checkbox label="Vehicle Drivable" field="vehicleDrivable" props={props} />
      <Checkbox label="Airbags Deployed" field="airbags" props={props} />
      <Checkbox label="Seatbelt Worn" field="seatbeltWorn" props={props} />
    </div>
    <Field label="Damage Description" field="vehicleDamage" type="textarea" placeholder="Describe vehicle damage..." props={props} colSpan={2} />

    <div className="border-t border-stone-100 pt-4">
      <h5 className="text-xs font-bold text-stone-600 uppercase tracking-wider mb-3">Body Shop</h5>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Shop Name" field="bodyShopName" placeholder="Shop name" props={props} colSpan={2} />
        <Field label="Phone" field="bodyShopPhone" placeholder="Phone" type="tel" props={props} />
        <Field label="Address" field="bodyShopAddress" placeholder="Address" props={props} />
      </div>
    </div>
  </div>
);

export const MedicalSection: React.FC<SectionProps> = (props) => (
  <div className="space-y-5 animate-fade-in">
    <Field label="Injuries Detail" field="injuries" type="textarea" placeholder="Describe injuries sustained..." props={props} colSpan={2} />
    <div className="flex gap-6 py-2">
      <Checkbox label="Ambulance Taken" field="ambulance" props={props} />
      <Checkbox label="X-Rays Taken" field="xraysTaken" props={props} />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Field label="Hospital Name" field="hospitalName" placeholder="Hospital" props={props} colSpan={2} />
      <Field label="Hospital Address" field="hospitalAddress" placeholder="Address" props={props} />
      <Field label="Hospital Phone" field="hospitalPhone" placeholder="Phone" type="tel" props={props} />
    </div>
    <Field label="Pre-existing Conditions" field="preExistingConditions" type="textarea" placeholder="Any pre-existing conditions..." props={props} colSpan={2} />
    <Field label="Treatment Providers" field="treatmentProviders" type="textarea" placeholder="List doctors, clinics, therapists..." props={props} colSpan={2} />
    <Field label="Doctor Referred To" field="doctorReferredTo" placeholder="Referring doctor" props={props} />
  </div>
);

export const EmploymentSection: React.FC<SectionProps> = (props) => (
  <div className="space-y-5 animate-fade-in">
    <Checkbox label="Time Lost From Work" field="timeLostFromWork" props={props} />
    <div className="grid grid-cols-2 gap-4">
      <Field label="Time Lost Amount" field="timeLostAmount" placeholder="e.g. 2 weeks" props={props} />
      <Field label="Position / Title" field="employmentPosition" placeholder="Job title" props={props} />
      <Field label="Employer Name" field="employerName" placeholder="Company name" props={props} colSpan={2} />
      <Field label="Employer Phone" field="employerPhone" placeholder="Phone" type="tel" props={props} />
      <Field label="Employer Address" field="employerAddress" placeholder="Address" props={props} />
      <Field label="Wages Amount" field="wagesAmount" placeholder="Amount" props={props} />
      <Select label="Per" field="wagesPer" options={['Hour', 'Week', 'Year']} props={props} />
    </div>
  </div>
);
