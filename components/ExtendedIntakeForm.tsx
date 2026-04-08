
import React, { useState, useEffect, useRef } from 'react';
import { CaseFile, ExtendedIntakeData, ClientDetails, Insurance, InsuranceAdjuster } from '../types';
import { DocumentGenerator, DocumentFormType } from './DocumentGenerator';
import { DocumentAttachment } from '../types';
import { CoverageFieldGroup } from './CoverageFieldGroup';
import { StateSelect } from './StateSelect';
import { searchInsuranceCompanies, DirectoryInsuranceCompany } from '../services/insuranceCompanyService';

interface InsuranceBlockProps {
  label: string;
  badge: string;
  badgeColor: 'stone' | 'emerald';
  ins: Insurance;
  onFieldChange: (fields: Partial<Insurance>) => void;
  inputClass: string;
  labelClass: string;
}

const InsuranceBlock: React.FC<InsuranceBlockProps> = ({ label, badge, badgeColor, ins, onFieldChange, inputClass, labelClass }) => {
  const [newAdj, setNewAdj] = useState({ name: '', phone: '', email: '' });
  const [carrierSearch, setCarrierSearch] = useState('');
  const [suggestions, setSuggestions] = useState<DirectoryInsuranceCompany[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const adjusters = ins.adjusters || [];
  const badgeStyles = badgeColor === 'emerald'
    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : 'bg-stone-100 text-stone-500 border-stone-200';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCarrierChange = (value: string) => {
    onFieldChange({ provider: value });
    setCarrierSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.length >= 2) {
      searchTimerRef.current = setTimeout(async () => {
        const results = await searchInsuranceCompanies(value);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }, 250);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectCompany = (company: DirectoryInsuranceCompany) => {
    onFieldChange({
      provider: company.name,
      claimsEmail: company.claims_email || undefined,
      claimsPhone: company.claims_phone || undefined,
      claimsFax: company.fax || undefined,
      address: company.mailing_address || company.address || undefined,
      city: company.mailing_city || company.city || undefined,
      state: company.mailing_state || company.state || undefined,
      zip: company.mailing_zip || company.zip || undefined,
    });
    setShowSuggestions(false);
    setCarrierSearch('');
  };

  const handleAddAdjuster = () => {
    if (!newAdj.name.trim()) return;
    const adj: InsuranceAdjuster = {
      id: Math.random().toString(36).substr(2, 9),
      name: newAdj.name.trim(),
      phone: newAdj.phone.trim() || undefined,
      email: newAdj.email.trim() || undefined,
      isPrimary: adjusters.length === 0,
      addedDate: new Date().toISOString(),
    };
    onFieldChange({ adjusters: [...adjusters, adj] });
    setNewAdj({ name: '', phone: '', email: '' });
  };

  const handleRemoveAdjuster = (id: string) => {
    const updated = adjusters.filter(a => a.id !== id);
    if (updated.length > 0 && !updated.some(a => a.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onFieldChange({ adjusters: updated });
  };

  const handleAdjusterFieldChange = (id: string, field: keyof InsuranceAdjuster, value: string) => {
    onFieldChange({
      adjusters: adjusters.map(a => a.id === id ? { ...a, [field]: value } : a),
    });
  };

  const handleSetPrimary = (id: string) => {
    onFieldChange({
      adjusters: adjusters.map(a => ({ ...a, isPrimary: a.id === id })),
    });
  };

  return (
    <div>
      {label && (
        <h4 className="font-bold text-stone-700 mb-3 text-sm flex items-center">
          {label}
          {badge && <span className={`ml-2 ${badgeStyles} text-[10px] px-2 py-0.5 rounded-full uppercase border`}>{badge}</span>}
        </h4>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative" ref={wrapperRef}>
          <label className={labelClass}>Carrier</label>
          <input
            className={inputClass}
            placeholder="e.g. State Farm"
            value={ins.provider || ''}
            onChange={e => handleCarrierChange(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          />
          {showSuggestions && (
            <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
              {suggestions.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCompany(c)}
                  className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-0"
                >
                  <span className="text-sm font-medium text-stone-800 block">{c.name}</span>
                  <span className="text-xs text-stone-400">
                    {[c.claims_phone, c.claims_email, c.city, c.state].filter(Boolean).join(' | ') || 'No details'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label className={labelClass}>Claim #</label>
          <input className={inputClass} placeholder="Claim #" value={ins.claimNumber || ''} onChange={e => onFieldChange({ claimNumber: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Policy #</label>
          <input className={inputClass} placeholder="Policy #" value={ins.policyNumber || ''} onChange={e => onFieldChange({ policyNumber: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Claims Email</label>
          <input className={inputClass} type="email" placeholder="claims@insurer.com" value={ins.claimsEmail || ''} onChange={e => onFieldChange({ claimsEmail: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Claims Phone</label>
          <input className={inputClass} placeholder="(800) 555-0001" value={ins.claimsPhone || ''} onChange={e => onFieldChange({ claimsPhone: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Fax</label>
          <input className={inputClass} placeholder="(800) 555-0002" value={ins.claimsFax || ''} onChange={e => onFieldChange({ claimsFax: e.target.value })} />
        </div>
        <div className="col-span-2">
          <label className={labelClass}>Address</label>
          <input className={inputClass} placeholder="Street address" value={ins.address || ''} onChange={e => onFieldChange({ address: e.target.value })} />
          <div className="grid grid-cols-6 gap-2 mt-2">
            <div className="col-span-3">
              <input className={inputClass} placeholder="City" value={ins.city || ''} onChange={e => onFieldChange({ city: e.target.value })} />
            </div>
            <div className="col-span-1">
              <input className={inputClass} placeholder="State" value={ins.state || ''} onChange={e => onFieldChange({ state: e.target.value })} />
            </div>
            <div className="col-span-2">
              <input className={inputClass} placeholder="Zip" value={ins.zip || ''} onChange={e => onFieldChange({ zip: e.target.value })} />
            </div>
          </div>
        </div>
        <div className="col-span-2">
          <CoverageFieldGroup
            insuredStatus={ins.insuredStatus}
            coverageType={ins.coverageType}
            coverageLimits={ins.coverageLimits || ''}
            onChange={(field, value) => onFieldChange({ [field]: value } as Partial<Insurance>)}
            onBatchChange={fields => onFieldChange(fields as Partial<Insurance>)}
            accentColor={badgeColor}
          />
        </div>
      </div>

      <div className="mt-4 border-t border-stone-100 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-xs font-bold text-stone-500 uppercase">Adjusters</h5>
          <span className="text-xs text-stone-400">{adjusters.length} {adjusters.length === 1 ? 'adjuster' : 'adjusters'}</span>
        </div>

        {adjusters.length > 0 && (
          <div className="space-y-2 mb-3">
            {adjusters.map(adj => (
              <div key={adj.id} className="bg-stone-50 rounded-lg border border-stone-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-stone-800">{adj.name}</span>
                    {adj.isPrimary && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase">Primary</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!adj.isPrimary && (
                      <button onClick={() => handleSetPrimary(adj.id)} className="text-[10px] text-blue-600 hover:text-blue-700 font-medium px-1.5 py-0.5 rounded hover:bg-blue-50">
                        Set Primary
                      </button>
                    )}
                    <button onClick={() => handleRemoveAdjuster(adj.id)} className="text-stone-400 hover:text-red-500 p-0.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-stone-400 uppercase font-bold mb-0.5">Phone</label>
                    <input className={inputClass + ' !py-1.5 !text-xs'} placeholder="Phone" value={adj.phone || ''} onChange={e => handleAdjusterFieldChange(adj.id, 'phone', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] text-stone-400 uppercase font-bold mb-0.5">Email</label>
                    <input className={inputClass + ' !py-1.5 !text-xs'} type="email" placeholder="Email" value={adj.email || ''} onChange={e => handleAdjusterFieldChange(adj.id, 'email', e.target.value)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-stone-50 rounded-lg border border-dashed border-stone-300 p-3">
          <div className="grid grid-cols-3 gap-2">
            <input className={inputClass + ' !py-1.5 !text-xs'} placeholder="Adjuster Name" value={newAdj.name} onChange={e => setNewAdj(p => ({ ...p, name: e.target.value }))} />
            <input className={inputClass + ' !py-1.5 !text-xs'} placeholder="Phone" value={newAdj.phone} onChange={e => setNewAdj(p => ({ ...p, phone: e.target.value }))} />
            <input className={inputClass + ' !py-1.5 !text-xs'} type="email" placeholder="Email" value={newAdj.email} onChange={e => setNewAdj(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="text-right mt-2">
            <button
              onClick={handleAddAdjuster}
              disabled={!newAdj.name.trim()}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              + Add Adjuster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ExtendedIntakeFormProps {
  caseData: CaseFile;
  onSave: (data: ExtendedIntakeData) => void;
  onUpdateCase?: (c: CaseFile) => void;
  initialSection?: string;
}

export const ExtendedIntakeForm: React.FC<ExtendedIntakeFormProps> = ({ caseData, onSave, onUpdateCase, initialSection }) => {
  const [formData, setFormData] = useState<ExtendedIntakeData>(() => {
    const existing = caseData.extendedIntake || {};
    return {
        ...existing,
        intake_admin: {
            total_clients: 1,
            primary_language: 'English',
            referral_source: 'Internet',
            ...existing.intake_admin
        },
        accident: {
            date_of_loss: caseData.accidentDate,
            accident_facts: caseData.description,
            ...existing.accident
        },
        client: {
            full_name: caseData.clientName,
            email: caseData.clientEmail,
            phones: { cell: caseData.clientPhone },
            date_of_birth: caseData.clientDob,
            address: { street: caseData.clientAddress || '' },
            ...existing.client
        },
        additional_clients: existing.additional_clients || [],
        employment: existing.employment || {},
        medical: {
            injuries_detail: '',
            providers: [],
            ...existing.medical
        },
        vehicle_property_damage: {
            damaged_vehicle: {
                year: parseInt(caseData.vehicleInfo?.year || '0') || undefined,
                make: caseData.vehicleInfo?.make,
                model: caseData.vehicleInfo?.model
            },
            ...existing.vehicle_property_damage
        },
        defendant: existing.defendant || {},
        health_insurance: existing.health_insurance || {},
        auto_insurance: existing.auto_insurance || {},
        passengers_involved: existing.passengers_involved || [],
    };
  });

  const mapInitialSection = (s?: string) => {
    if (!s) return 'admin';
    if (s === 'employment' || s === 'medical' || s === 'insurance' || s === 'vehicle') return 'client';
    return s;
  };

  const [activeSection, setActiveSection] = useState<string>(mapInitialSection(initialSection));
  const [clientSubSection, setClientSubSection] = useState<string>(() => {
    if (initialSection === 'employment' || initialSection === 'medical' || initialSection === 'insurance' || initialSection === 'vehicle') return initialSection;
    return 'demographics';
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newProvider, setNewProvider] = useState({ name: '', address: '', phone: '' });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<'rep_lien_1p' | 'rep_lien_3p' | 'foia' | 'intake_summary' | 'sap_intake_form' | null>(null);
  const [showDocPreview, setShowDocPreview] = useState(false);

  useEffect(() => {
    if (initialSection) {
      setActiveSection(mapInitialSection(initialSection));
      if (['employment', 'medical', 'insurance', 'vehicle'].includes(initialSection)) {
        setClientSubSection(initialSection);
      }
    }
  }, [initialSection]);

  useEffect(() => {
    if (saveStatus === 'saved') {
        const timer = setTimeout(() => setSaveStatus('idle'), 2000);
        return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const getIns = (type: 'Defendant' | 'Client') =>
    caseData.insurance?.find(i => i.type === type) || { provider: '', claimNumber: '', coverageLimits: '', insuredStatus: undefined, coverageType: undefined, policyNumber: '' } as Insurance;

  const handleInsuranceFieldChange = (type: 'Defendant' | 'Client', fields: Partial<Insurance>) => {
    if (!onUpdateCase) return;
    const currentIns = caseData.insurance || [];
    const index = currentIns.findIndex(i => i.type === type);
    let newIns = [...currentIns];
    if (index >= 0) {
      newIns[index] = { ...newIns[index], ...fields };
    } else {
      newIns.push({ type, provider: '', ...fields } as Insurance);
    }

    let updatedAdjusters = [...(caseData.adjusters || [])];
    if (fields.adjusters !== undefined) {
      const insObj = newIns.find(i => i.type === type);
      const provider = insObj?.provider || '';
      updatedAdjusters = updatedAdjusters.filter(a => a.insuranceType !== type || a._fromIntake !== true);
      const insAdjusters = (fields.adjusters || []).map(ia => ({
        id: ia.id,
        name: ia.name,
        email: ia.email,
        phone: ia.phone,
        isPrimary: ia.isPrimary || false,
        insuranceType: type as 'Client' | 'Defendant',
        insuranceProvider: provider,
        addedDate: ia.addedDate || new Date().toISOString(),
        _fromIntake: true as const,
      }));
      updatedAdjusters = [...updatedAdjusters, ...insAdjusters];
    }

    onUpdateCase({ ...caseData, insurance: newIns, adjusters: updatedAdjusters });
  };

  const handleChange = (section: keyof ExtendedIntakeData, field: string, value: any, subField?: string, subSubField?: string) => {
    setFormData(prev => {
      const sectionData = prev[section] || {};
      if (subField) {
          const currentFieldData = (sectionData as any)[field] || {};
          if (subSubField) {
               const currentSubFieldData = currentFieldData[subField] || {};
               return {
                  ...prev,
                  [section]: {
                      ...sectionData,
                      [field]: {
                          ...currentFieldData,
                          [subField]: {
                              ...currentSubFieldData,
                              [subSubField]: value
                          }
                      }
                  }
               };
          }
          return {
              ...prev,
              [section]: {
                  ...sectionData,
                  [field]: {
                      ...currentFieldData,
                      [subField]: value
                  }
              }
          };
      }
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: value
        }
      };
    });
  };

  const handleAdditionalClientChange = (index: number, field: string, value: any, subField?: string, subSubField?: string) => {
    setFormData(prev => {
        const clients = [...(prev.additional_clients || [])];
        let client = { ...clients[index] };
        if (subField) {
             const fieldData = (client as any)[field] || {};
             if (subSubField) {
                 const subFieldData = fieldData[subField] || {};
                 client = { ...client, [field]: { ...fieldData, [subField]: { ...subFieldData, [subSubField]: value } } };
             } else {
                 client = { ...client, [field]: { ...fieldData, [subField]: value } };
             }
        } else {
             (client as any)[field] = value;
        }
        clients[index] = client;
        return { ...prev, additional_clients: clients };
    });
  };

  const handleAddClient = () => {
      setFormData(prev => ({
          ...prev,
          additional_clients: [...(prev.additional_clients || []), { full_name: '', address: {} }],
          intake_admin: { ...prev.intake_admin, total_clients: (prev.intake_admin?.total_clients || 1) + 1 }
      }));
  };

  const handleRemoveClient = (index: number) => {
      if(!confirm('Remove this additional client?')) return;
      setFormData(prev => ({
          ...prev,
          additional_clients: (prev.additional_clients || []).filter((_, i) => i !== index),
          intake_admin: { ...prev.intake_admin, total_clients: Math.max(1, (prev.intake_admin?.total_clients || 1) - 1) }
      }));
  };

  const handleAddProvider = () => {
    if (!newProvider.name) return;
    setFormData(prev => ({
        ...prev,
        medical: { ...prev.medical, providers: [...(prev.medical?.providers || []), newProvider] }
    }));
    setNewProvider({ name: '', address: '', phone: '' });
  };

  const handleDeleteProvider = (index: number) => {
      setFormData(prev => ({
          ...prev,
          medical: { ...prev.medical, providers: (prev.medical?.providers || []).filter((_, i) => i !== index) }
      }));
  };

  const handleSave = () => {
      setSaveStatus('saving');
      setTimeout(() => { onSave(formData); setSaveStatus('saved'); }, 600);
  };

  const handleGenerateClick = () => {
      if (!selectedForm) return;
      setShowDocPreview(true);
      setIsFormModalOpen(false);
  };

  const sections = [
    { id: 'admin', label: 'Admin & Referral' },
    { id: 'accident', label: 'Accident' },
    { id: 'client', label: 'Client' },
    { id: 'defendant', label: 'Defendant' },
  ];

  const clientSubSections = [
    { id: 'demographics', label: 'Demographics' },
    { id: 'employment', label: 'Employment' },
    { id: 'medical', label: 'Medical' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'vehicle', label: 'Vehicle' },
  ];

  const inputClass = "w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const labelClass = "block text-xs font-bold text-stone-500 uppercase mb-1";
  const sectionClass = "bg-white rounded-lg border border-stone-200 p-6 animate-fade-in";

  const defIns = getIns('Defendant');
  const clientIns = getIns('Client');

  const renderClientFields = (client: ClientDetails, isPrimary: boolean, index?: number) => {
      const isAddl = !isPrimary && index !== undefined;
      const getValue = (field: keyof ClientDetails) => client[field] || '';
      const getAddr = (field: string) => client.address ? (client.address as any)[field] || '' : '';
      const onChange = (field: string, val: any, sub?: string) => {
          if (isAddl) { handleAdditionalClientChange(index, field, val, sub); }
          else { handleChange('client', field, val, sub); }
      };

      return (
          <div className={`grid grid-cols-2 gap-3 ${isAddl ? 'bg-stone-50 p-4 rounded-xl border border-stone-200 mt-6 relative' : ''}`}>
               {isAddl && (
                   <button
                        onClick={() => handleRemoveClient(index)}
                        className="absolute top-3 right-3 text-red-500 hover:text-red-700 font-bold text-xs flex items-center bg-white px-2 py-1 rounded border border-red-100 shadow-sm"
                   >
                       <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       Remove
                   </button>
               )}
               {isAddl && <h4 className="col-span-2 font-bold text-stone-700 border-b pb-2 mb-1">Additional Client #{index + 1}</h4>}
               <div>
                   <label className={labelClass}>Full Name</label>
                   <input type="text" className={inputClass} value={getValue('full_name')} onChange={e => onChange('full_name', e.target.value)} />
               </div>
               <div>
                   <label className={labelClass}>Date of Birth</label>
                   <input type="date" className={inputClass} value={getValue('date_of_birth')} onChange={e => onChange('date_of_birth', e.target.value)} />
               </div>
               <div>
                   <label className={labelClass}>SSN</label>
                   <input type="text" className={inputClass} placeholder="XXX-XX-XXXX" value={getValue('ssn')} onChange={e => onChange('ssn', e.target.value)} />
               </div>
               <div>
                   <label className={labelClass}>Marital Status</label>
                   <select className={inputClass} value={getValue('marital_status')} onChange={e => onChange('marital_status', e.target.value)}>
                       <option value="">Select...</option>
                       <option value="Single">Single</option>
                       <option value="Married">Married</option>
                   </select>
               </div>
               <div>
                   <label className={labelClass}>Primary Language</label>
                   <select className={inputClass} value={getValue('primary_language')} onChange={e => onChange('primary_language', e.target.value)}>
                       <option value="">Select...</option>
                       <option value="English">English</option>
                       <option value="Spanish">Spanish</option>
                   </select>
               </div>
               <div className="col-span-2 border-t pt-2 mt-1">
                   <label className={labelClass}>Address</label>
                   <div className="grid grid-cols-6 gap-2">
                       <div className="col-span-6"><input placeholder="Street Address" className={inputClass} value={getAddr('street')} onChange={e => onChange('address', e.target.value, 'street')} /></div>
                       <div className="col-span-3"><input placeholder="City" className={inputClass} value={getAddr('city')} onChange={e => onChange('address', e.target.value, 'city')} /></div>
                       <div className="col-span-1">
                         <StateSelect value={getAddr('state')} onChange={v => onChange('address', v, 'state')} className={inputClass} />
                       </div>
                       <div className="col-span-2"><input placeholder="Zip" className={inputClass} value={getAddr('zip')} onChange={e => onChange('address', e.target.value, 'zip')} /></div>
                   </div>
               </div>
               <div className="col-span-2 border-t pt-2 mt-1">
                   <label className={labelClass}>Driver's License</label>
                   <div className="grid grid-cols-2 gap-2">
                       <input placeholder="DL Number" className={inputClass} value={client.drivers_license?.number || ''} onChange={e => isAddl ? handleAdditionalClientChange(index, 'drivers_license', e.target.value, 'number') : handleChange('client', 'drivers_license', e.target.value, 'number')} />
                       <StateSelect value={client.drivers_license?.state_issued || ''} onChange={v => isAddl ? handleAdditionalClientChange(index, 'drivers_license', v, 'state_issued') : handleChange('client', 'drivers_license', v, 'state_issued')} className={inputClass} placeholder="State Issued" />
                   </div>
               </div>
          </div>
      );
  };

  return (
    <div className="space-y-5">
       <div className="flex justify-between items-center pb-2 border-b border-stone-200">
           <div className="flex space-x-2 overflow-x-auto">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${activeSection === s.id ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                    >
                        {s.label}
                    </button>
                ))}
           </div>
       </div>

       <div className="max-w-5xl">

       {activeSection === 'admin' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Intake Administration</h3>
               <div className="grid grid-cols-2 gap-3">
                   <div>
                       <label className={labelClass}>Total Clients</label>
                       <input type="number" readOnly className={inputClass + " bg-stone-50"} value={formData.intake_admin?.total_clients} />
                   </div>
                   <div>
                       <label className={labelClass}>Primary Language</label>
                       <select className={inputClass} value={formData.intake_admin?.primary_language} onChange={e => handleChange('intake_admin', 'primary_language', e.target.value)}>
                           <option>English</option><option>Spanish</option><option>Other</option>
                       </select>
                   </div>
                   <div>
                       <label className={labelClass}>Referral Source</label>
                       <select className={inputClass} value={formData.intake_admin?.referral_source} onChange={e => handleChange('intake_admin', 'referral_source', e.target.value)}>
                           <option>Internet</option><option>TV</option><option>Doctor Ref</option>
                           <option>Attorney Ref</option><option>Billboard</option><option>Other</option>
                       </select>
                   </div>
                   {formData.intake_admin?.referral_source === 'Other' && (
                       <div>
                           <label className={labelClass}>Specify Source</label>
                           <input type="text" className={inputClass} value={formData.intake_admin?.referral_source_other} onChange={e => handleChange('intake_admin', 'referral_source_other', e.target.value)} />
                       </div>
                   )}
                   <div className="col-span-2 mt-2">
                       <label className={labelClass}>Interview Details</label>
                       <div className="grid grid-cols-3 gap-2">
                           <input type="date" className={inputClass} value={formData.intake_admin?.interview?.date || ''} onChange={e => handleChange('intake_admin', 'interview', e.target.value, 'date')} />
                           <input type="time" className={inputClass} value={formData.intake_admin?.interview?.time || ''} onChange={e => handleChange('intake_admin', 'interview', e.target.value, 'time')} />
                           <select className={inputClass} value={formData.intake_admin?.interview?.location} onChange={e => handleChange('intake_admin', 'interview', e.target.value, 'location')}>
                               <option value="">Select Location...</option><option value="Office">Office</option><option value="Field">Field</option>
                           </select>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {activeSection === 'accident' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Accident Details</h3>
               <div className="grid grid-cols-2 gap-3">
                   <div>
                       <label className={labelClass}>Crash Report #</label>
                       <input type="text" className={inputClass} value={formData.accident?.crash_report_number || ''} onChange={e => handleChange('accident', 'crash_report_number', e.target.value)} />
                   </div>
                   <div>
                       <label className={labelClass}>Agency</label>
                       <input type="text" className={inputClass} value={formData.accident?.agency || ''} onChange={e => handleChange('accident', 'agency', e.target.value)} />
                   </div>
                   <div>
                       <label className={labelClass}>Date of Loss</label>
                       <input type="date" className={inputClass} value={formData.accident?.date_of_loss || ''} onChange={e => handleChange('accident', 'date_of_loss', e.target.value)} />
                   </div>
                   <div>
                       <label className={labelClass}>Day of Week</label>
                       <select className={inputClass} value={formData.accident?.day_of_week || ''} onChange={e => handleChange('accident', 'day_of_week', e.target.value)}>
                           <option value="">Select...</option>
                           <option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
                       </select>
                   </div>
                   <div>
                       <label className={labelClass}>Time of Accident</label>
                       <input type="time" className={inputClass} value={formData.accident?.time_of_accident || ''} onChange={e => handleChange('accident', 'time_of_accident', e.target.value)} />
                   </div>
                   <div className="col-span-2">
                       <label className={labelClass}>Street / Intersection</label>
                       <input type="text" placeholder="e.g. Main St & 5th Ave" className={inputClass} value={formData.accident?.accident_location || ''} onChange={e => handleChange('accident', 'accident_location', e.target.value)} />
                   </div>
                   <div className="col-span-2">
                       <div className="grid grid-cols-6 gap-2">
                            <div className="col-span-3">
                                <label className={labelClass}>City</label>
                                <input type="text" className={inputClass} value={formData.accident?.city || ''} onChange={e => handleChange('accident', 'city', e.target.value)} />
                            </div>
                            <div className="col-span-1">
                                <label className={labelClass}>State</label>
                                <StateSelect value={formData.accident?.state || ''} onChange={v => handleChange('accident', 'state', v)} className={inputClass} />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>Zip</label>
                                <input type="text" className={inputClass} value={formData.accident?.zip || ''} onChange={e => handleChange('accident', 'zip', e.target.value)} />
                            </div>
                       </div>
                   </div>
                   <div>
                       <label className={labelClass}>Plaintiff Role</label>
                       <select className={inputClass} value={formData.accident?.plaintiff_role} onChange={e => handleChange('accident', 'plaintiff_role', e.target.value)}>
                           <option value="">Select...</option><option>Driver</option><option>Passenger</option><option>Pedestrian</option>
                       </select>
                   </div>
                   <div>
                        <label className={labelClass}>Weather</label>
                        <select className={inputClass} value={formData.accident?.weather_conditions} onChange={e => handleChange('accident', 'weather_conditions', e.target.value)}>
                           <option value="">Select...</option><option>Clear</option><option>Rain</option><option>Snow</option><option>Ice</option>
                       </select>
                   </div>
                   <div className="col-span-2">
                       <label className={labelClass}>Narrative / Accident Facts</label>
                       <textarea className={inputClass + " h-32"} value={formData.accident?.accident_facts || ''} onChange={e => handleChange('accident', 'accident_facts', e.target.value)} />
                   </div>
                   <div className="col-span-2 border-t pt-3 mt-1">
                     <h4 className="font-semibold text-stone-700 mb-2 text-sm">Plaintiff</h4>
                     <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className={labelClass}>Plaintiff Direction</label>
                         <input type="text" className={inputClass} placeholder="e.g. Northbound" value={formData.accident?.plaintiff_direction || ''} onChange={e => handleChange('accident', 'plaintiff_direction', e.target.value)} />
                       </div>
                       <div>
                         <label className={labelClass}>On</label>
                         <input type="text" className={inputClass} placeholder="e.g. Main Street" value={formData.accident?.plaintiff_on || ''} onChange={e => handleChange('accident', 'plaintiff_on', e.target.value)} />
                       </div>
                     </div>
                   </div>
                   <div className="col-span-2 border-t pt-3 mt-1">
                     <h4 className="font-semibold text-stone-700 mb-2 text-sm">Defendant</h4>
                     <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className={labelClass}>Defendant Direction</label>
                         <input type="text" className={inputClass} placeholder="e.g. Westbound" value={formData.accident?.defendant_direction || ''} onChange={e => handleChange('accident', 'defendant_direction', e.target.value)} />
                       </div>
                       <div>
                         <label className={labelClass}>On</label>
                         <input type="text" className={inputClass} placeholder="e.g. 5th Avenue" value={formData.accident?.defendant_on || ''} onChange={e => handleChange('accident', 'defendant_on', e.target.value)} />
                       </div>
                     </div>
                   </div>
               </div>
           </div>
       )}

       {activeSection === 'client' && (
           <div className="space-y-4">
               <div className="flex space-x-1 border-b border-stone-200 pb-1">
                 {clientSubSections.map(s => (
                   <button
                     key={s.id}
                     onClick={() => setClientSubSection(s.id)}
                     className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${clientSubSection === s.id ? 'bg-white border border-b-white border-stone-200 text-stone-800 -mb-px' : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'}`}
                   >
                     {s.label}
                   </button>
                 ))}
               </div>

               {clientSubSection === 'demographics' && (
                 <div className={sectionClass}>
                   <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Client Details</h3>
                   <div className="mb-6">
                       <h4 className="font-bold text-blue-800 uppercase text-xs tracking-wider mb-3 bg-blue-50 p-2 rounded">Primary Client</h4>
                       {renderClientFields(formData.client || {}, true)}
                   </div>
                   {formData.additional_clients && formData.additional_clients.map((client, idx) => (
                       <div key={idx} className="mb-4">{renderClientFields(client, false, idx)}</div>
                   ))}
                   <button
                      onClick={handleAddClient}
                      className="w-full py-2.5 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center text-sm"
                   >
                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                       Add Another Client
                   </button>
                 </div>
               )}

               {clientSubSection === 'employment' && (
                 <div className={sectionClass}>
                   <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Employment & Lost Wages</h3>
                   <div className="grid grid-cols-2 gap-3">
                       <div className="flex items-center space-x-2 col-span-2">
                           <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.employment?.time_lost_from_work || false} onChange={e => handleChange('employment', 'time_lost_from_work', e.target.checked)} />
                           <span className="text-sm font-medium text-stone-700">Time lost from work?</span>
                       </div>
                       {formData.employment?.time_lost_from_work && (
                           <>
                               <div>
                                   <label className={labelClass}>How much time lost?</label>
                                   <input type="text" className={inputClass} value={formData.employment?.how_much_time_lost || ''} onChange={e => handleChange('employment', 'how_much_time_lost', e.target.value)} />
                               </div>
                               <div>
                                   <label className={labelClass}>Position/Title</label>
                                   <input type="text" className={inputClass} value={formData.employment?.position || ''} onChange={e => handleChange('employment', 'position', e.target.value)} />
                               </div>
                               <div>
                                   <label className={labelClass}>Employer Name</label>
                                   <input type="text" className={inputClass} value={formData.employment?.employer?.name || ''} onChange={e => handleChange('employment', 'employer', e.target.value, 'name')} />
                               </div>
                               <div>
                                   <label className={labelClass}>Employer Phone</label>
                                   <input type="text" className={inputClass} value={formData.employment?.employer?.phone || ''} onChange={e => handleChange('employment', 'employer', e.target.value, 'phone')} />
                               </div>
                               <div className="col-span-2">
                                   <label className={labelClass}>Employer Address</label>
                                   <input type="text" className={inputClass} placeholder="Street" value={formData.employment?.employer?.address?.street || ''} onChange={e => handleChange('employment', 'employer', e.target.value, 'address', 'street')} />
                                   <div className="grid grid-cols-6 gap-2 mt-2">
                                     <div className="col-span-3"><input className={inputClass} placeholder="City" value={formData.employment?.employer?.address?.city || ''} onChange={e => handleChange('employment', 'employer', e.target.value, 'address', 'city')} /></div>
                                     <div className="col-span-1"><StateSelect value={formData.employment?.employer?.address?.state || ''} onChange={v => handleChange('employment', 'employer', v, 'address', 'state')} className={inputClass} /></div>
                                     <div className="col-span-2"><input className={inputClass} placeholder="Zip" value={formData.employment?.employer?.address?.zip || ''} onChange={e => handleChange('employment', 'employer', e.target.value, 'address', 'zip')} /></div>
                                   </div>
                               </div>
                               <div>
                                   <label className={labelClass}>Wages Amount</label>
                                   <input type="number" className={inputClass} value={formData.employment?.wages?.amount || ''} onChange={e => handleChange('employment', 'wages', parseFloat(e.target.value), 'amount')} />
                               </div>
                               <div>
                                   <label className={labelClass}>Per</label>
                                   <select className={inputClass} value={formData.employment?.wages?.per} onChange={e => handleChange('employment', 'wages', e.target.value, 'per')}>
                                       <option>Hour</option><option>Week</option><option>Year</option>
                                   </select>
                               </div>
                               <div>
                                   <label className={labelClass}>Hours Per Week</label>
                                   <input type="number" className={inputClass} value={formData.employment?.hours_per_week || ''} onChange={e => handleChange('employment', 'hours_per_week', parseFloat(e.target.value))} />
                               </div>
                           </>
                       )}
                   </div>
                 </div>
               )}

               {clientSubSection === 'medical' && (
                 <div className={sectionClass}>
                   <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Medical Treatment</h3>
                   <div className="grid grid-cols-2 gap-3">
                       <div className="col-span-2">
                           <label className={labelClass}>Injuries Detail</label>
                           <textarea className={inputClass + " h-20"} value={formData.medical?.injuries_detail || ''} onChange={e => handleChange('medical', 'injuries_detail', e.target.value)} />
                       </div>
                       <div className="flex items-center space-x-2">
                           <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.medical?.ambulance || false} onChange={e => handleChange('medical', 'ambulance', e.target.checked)} />
                           <span className="text-sm font-medium text-stone-700">Ambulance taken?</span>
                       </div>
                       <div className="flex items-center space-x-2">
                           <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.medical?.xrays_taken || false} onChange={e => handleChange('medical', 'xrays_taken', e.target.checked)} />
                           <span className="text-sm font-medium text-stone-700">X-Rays taken?</span>
                       </div>
                       <div className="col-span-2">
                           <label className={labelClass}>Hospital Name</label>
                           <input type="text" className={inputClass} value={formData.medical?.hospital?.name || ''} onChange={e => handleChange('medical', 'hospital', e.target.value, 'name')} />
                       </div>
                       <div>
                           <label className={labelClass}>Hospital Address</label>
                           <input type="text" className={inputClass} value={formData.medical?.hospital?.address || ''} onChange={e => handleChange('medical', 'hospital', e.target.value, 'address')} />
                       </div>
                       <div>
                           <label className={labelClass}>Hospital Phone</label>
                           <input type="text" className={inputClass} value={formData.medical?.hospital?.phone || ''} onChange={e => handleChange('medical', 'hospital', e.target.value, 'phone')} />
                       </div>
                       <div className="col-span-2">
                           <label className={labelClass}>Pre-existing Conditions</label>
                           <select className={inputClass + " mb-2"} value={formData.medical?.pre_existing_conditions ? 'yes' : ''} onChange={e => handleChange('medical', 'pre_existing_conditions', e.target.value === 'yes' ? formData.medical?.pre_existing_conditions || 'Yes' : '')}>
                             <option value="">No</option>
                             <option value="yes">Yes</option>
                           </select>
                           {formData.medical?.pre_existing_conditions && (
                             <textarea className={inputClass + " h-16"} placeholder="Describe conditions..." value={formData.medical?.conditions_detail || ''} onChange={e => handleChange('medical', 'conditions_detail', e.target.value)} />
                           )}
                       </div>
                       <div className="col-span-2 border-t pt-3 mt-2">
                           <h4 className="font-semibold text-stone-700 mb-3 text-sm">Doctor Referred To</h4>
                           <div className="grid grid-cols-2 gap-3">
                             <div className="col-span-2">
                               <label className={labelClass}>Doctor Name</label>
                               <input type="text" className={inputClass} value={formData.medical?.doctor_referred_to?.name || ''} onChange={e => handleChange('medical', 'doctor_referred_to', e.target.value, 'name')} />
                             </div>
                             <div>
                               <label className={labelClass}>Address</label>
                               <input type="text" className={inputClass} value={formData.medical?.doctor_referred_to?.address || ''} onChange={e => handleChange('medical', 'doctor_referred_to', e.target.value, 'address')} />
                             </div>
                             <div>
                               <label className={labelClass}>Phone</label>
                               <input type="text" className={inputClass} value={formData.medical?.doctor_referred_to?.phone || ''} onChange={e => handleChange('medical', 'doctor_referred_to', e.target.value, 'phone')} />
                             </div>
                           </div>
                       </div>
                       <div className="col-span-2 border-t pt-3 mt-2">
                            <h4 className="font-semibold text-stone-700 mb-3 text-sm">Additional Treatment Providers</h4>
                            {formData.medical?.providers && formData.medical.providers.length > 0 && (
                                <div className="space-y-2 mb-3">
                                    {formData.medical.providers.map((p, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-stone-50 p-3 rounded border border-stone-200 text-sm">
                                            <div>
                                                <div className="font-bold text-stone-800">{p.name}</div>
                                                <div className="text-stone-500 text-xs">{p.address} {p.phone ? `\u2022 ${p.phone}` : ''}</div>
                                            </div>
                                            <button onClick={() => handleDeleteProvider(idx)} className="text-red-500 hover:text-red-700">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 bg-stone-50 p-3 rounded border border-stone-200">
                                <div className="col-span-2">
                                    <input placeholder="Provider Name" className={inputClass} value={newProvider.name} onChange={e => setNewProvider({...newProvider, name: e.target.value})} />
                                </div>
                                <input placeholder="Address" className={inputClass} value={newProvider.address} onChange={e => setNewProvider({...newProvider, address: e.target.value})} />
                                <input placeholder="Phone" className={inputClass} value={newProvider.phone} onChange={e => setNewProvider({...newProvider, phone: e.target.value})} />
                                <div className="col-span-2 text-right">
                                    <button onClick={handleAddProvider} disabled={!newProvider.name} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 font-medium">+ Add Provider</button>
                                </div>
                            </div>
                       </div>
                   </div>
                 </div>
               )}

               {clientSubSection === 'insurance' && (
                 <div className={sectionClass}>
                   <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Client Insurance</h3>
                   <div className="space-y-8">
                     <div>
                       <h4 className="font-bold text-stone-700 mb-3 text-sm flex items-center">
                         Auto Insurance
                         <span className="ml-2 bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] px-2 py-0.5 rounded-full uppercase border">1st Party</span>
                       </h4>
                       <div className="grid grid-cols-2 gap-3 mb-4">
                         <div>
                           <label className={labelClass}>Driver/Passenger Ins. Co.</label>
                           <input className={inputClass} placeholder="Insurance Company" value={formData.auto_insurance?.driver_or_passenger_insurance_company || ''} onChange={e => handleChange('auto_insurance', 'driver_or_passenger_insurance_company', e.target.value)} />
                         </div>
                         <div>
                           <label className={labelClass}>Owner of Vehicle Ins. Co.</label>
                           <input className={inputClass} placeholder="Vehicle Owner's Insurance" value={formData.auto_insurance?.vehicle_owner_insurance_company || ''} onChange={e => handleChange('auto_insurance', 'vehicle_owner_insurance_company', e.target.value)} />
                         </div>
                         <div>
                           <label className={labelClass}>Insured Name</label>
                           <input className={inputClass} placeholder="Insured" value={formData.auto_insurance?.insured_name || ''} onChange={e => handleChange('auto_insurance', 'insured_name', e.target.value)} />
                         </div>
                         <div>
                           <label className={labelClass}>Auto Ins. Type</label>
                           <select className={inputClass} value={formData.auto_insurance?.auto_insurance_type || ''} onChange={e => handleChange('auto_insurance', 'auto_insurance_type', e.target.value)}>
                             <option value="">Select...</option>
                             <option value="Personal">Personal</option>
                             <option value="Commercial">Commercial</option>
                           </select>
                         </div>
                       </div>
                       <InsuranceBlock
                         label=""
                         badge=""
                         badgeColor="emerald"
                         ins={clientIns}
                         onFieldChange={fields => handleInsuranceFieldChange('Client', fields)}
                         inputClass={inputClass}
                         labelClass={labelClass}
                       />
                       <div className="grid grid-cols-2 gap-3 mt-3">
                         <div className="col-span-2">
                           <label className={labelClass}>Insured Policy Info</label>
                           <input className={inputClass} placeholder="Additional policy details" value={formData.auto_insurance?.insured_policy_info || ''} onChange={e => handleChange('auto_insurance', 'insured_policy_info', e.target.value)} />
                         </div>
                       </div>
                     </div>

                     <div className="border-t border-stone-200 pt-6">
                       <h4 className="font-bold text-stone-700 mb-3 text-sm">Health Insurance</h4>
                       <div className="mb-4">
                         <div className="flex items-center gap-4">
                           <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="health_ins_status" checked={formData.health_insurance?.has_insurance === true} onChange={() => handleChange('health_insurance', 'has_insurance', true)} className="w-4 h-4 text-blue-600" />
                             <span className="text-sm font-medium text-stone-700">Insured</span>
                           </label>
                           <label className="flex items-center gap-2 cursor-pointer">
                             <input type="radio" name="health_ins_status" checked={formData.health_insurance?.has_insurance === false} onChange={() => handleChange('health_insurance', 'has_insurance', false)} className="w-4 h-4 text-blue-600" />
                             <span className="text-sm font-medium text-stone-700">No Insurance</span>
                           </label>
                         </div>
                       </div>
                       {formData.health_insurance?.has_insurance !== false && (
                         <div className="grid grid-cols-2 gap-3">
                              <div>
                                  <label className={labelClass}>Company</label>
                                  <input className={inputClass} placeholder="e.g. AETNA" value={formData.health_insurance?.company || ''} onChange={e => handleChange('health_insurance', 'company', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>Insured Name</label>
                                  <input className={inputClass} placeholder="Insured" value={formData.health_insurance?.insured_name || ''} onChange={e => handleChange('health_insurance', 'insured_name', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>S.S.N</label>
                                  <input className={inputClass} placeholder="XXX-XX-XXXX" value={formData.health_insurance?.ssn || ''} onChange={e => handleChange('health_insurance', 'ssn', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>Member #</label>
                                  <input className={inputClass} placeholder="Member #" value={formData.health_insurance?.member_number || ''} onChange={e => handleChange('health_insurance', 'member_number', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>Group #</label>
                                  <input className={inputClass} placeholder="Group #" value={formData.health_insurance?.group_number || ''} onChange={e => handleChange('health_insurance', 'group_number', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>ID #</label>
                                  <input className={inputClass} placeholder="ID #" value={formData.health_insurance?.id_number || ''} onChange={e => handleChange('health_insurance', 'id_number', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>Phone</label>
                                  <input className={inputClass} placeholder="Phone" value={formData.health_insurance?.phone || ''} onChange={e => handleChange('health_insurance', 'phone', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>Email</label>
                                  <input className={inputClass} type="email" placeholder="Email" value={formData.health_insurance?.email || ''} onChange={e => handleChange('health_insurance', 'email', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>Fax</label>
                                  <input className={inputClass} placeholder="Fax" value={formData.health_insurance?.fax || ''} onChange={e => handleChange('health_insurance', 'fax', e.target.value)} />
                              </div>
                              <div className="col-span-2">
                                  <label className={labelClass}>Address</label>
                                  <input className={inputClass} placeholder="Street" value={formData.health_insurance?.address?.street || ''} onChange={e => handleChange('health_insurance', 'address', e.target.value, 'street')} />
                                  <div className="grid grid-cols-6 gap-2 mt-2">
                                    <div className="col-span-3">
                                      <input className={inputClass} placeholder="City" value={formData.health_insurance?.address?.city || ''} onChange={e => handleChange('health_insurance', 'address', e.target.value, 'city')} />
                                    </div>
                                    <div className="col-span-1">
                                      <StateSelect value={formData.health_insurance?.address?.state || ''} onChange={v => handleChange('health_insurance', 'address', v, 'state')} className={inputClass} />
                                    </div>
                                    <div className="col-span-2">
                                      <input className={inputClass} placeholder="Zip" value={formData.health_insurance?.address?.zip || ''} onChange={e => handleChange('health_insurance', 'address', e.target.value, 'zip')} />
                                    </div>
                                  </div>
                              </div>
                         </div>
                       )}
                       {formData.health_insurance?.has_insurance === false && (
                         <div className="px-4 py-3 rounded-lg border bg-amber-50 border-amber-200">
                           <span className="text-sm font-medium text-amber-700">Client does not have health insurance.</span>
                         </div>
                       )}
                     </div>
                   </div>
                 </div>
               )}

               {clientSubSection === 'vehicle' && (
                 <div className={sectionClass}>
                   <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Vehicle Property Damage</h3>
                   <div className="grid grid-cols-2 gap-3">
                       <div>
                           <label className={labelClass}>License Plate #</label>
                           <input type="text" className={inputClass} value={formData.vehicle_property_damage?.license_plate || ''} onChange={e => handleChange('vehicle_property_damage', 'license_plate', e.target.value)} />
                       </div>
                       <div className="col-span-2 border-t pt-3 mt-1">
                         <h4 className="font-semibold text-stone-700 mb-2 text-sm">Damaged Vehicle</h4>
                         <div className="grid grid-cols-4 gap-3">
                           <div>
                             <label className={labelClass}>Year</label>
                             <input type="number" className={inputClass} value={formData.vehicle_property_damage?.damaged_vehicle?.year || ''} onChange={e => handleChange('vehicle_property_damage', 'damaged_vehicle', parseInt(e.target.value) || undefined, 'year')} />
                           </div>
                           <div>
                             <label className={labelClass}>Make</label>
                             <input type="text" className={inputClass} value={formData.vehicle_property_damage?.damaged_vehicle?.make || ''} onChange={e => handleChange('vehicle_property_damage', 'damaged_vehicle', e.target.value, 'make')} />
                           </div>
                           <div>
                             <label className={labelClass}>Model</label>
                             <input type="text" className={inputClass} value={formData.vehicle_property_damage?.damaged_vehicle?.model || ''} onChange={e => handleChange('vehicle_property_damage', 'damaged_vehicle', e.target.value, 'model')} />
                           </div>
                           <div>
                             <label className={labelClass}>Color</label>
                             <input type="text" className={inputClass} value={formData.vehicle_property_damage?.damaged_vehicle?.color || ''} onChange={e => handleChange('vehicle_property_damage', 'damaged_vehicle', e.target.value, 'color')} />
                           </div>
                         </div>
                       </div>
                       <div className="col-span-2 grid grid-cols-2 gap-3 border-t pt-3 mt-1">
                           <div className="col-span-2">
                             <h4 className="font-semibold text-stone-700 mb-2 text-sm">Vehicle Location</h4>
                           </div>
                           <div className="col-span-2">
                               <label className={labelClass}>Current Location</label>
                               <input type="text" className={inputClass} placeholder="e.g. At client's home, parked at friend's house, at body shop..." value={formData.vehicle_property_damage?.vehicle_location || ''} onChange={e => handleChange('vehicle_property_damage', 'vehicle_location', e.target.value)} />
                           </div>
                           <div className="col-span-2">
                             <h4 className="font-semibold text-stone-700 mb-2 text-sm mt-2">Body Shop</h4>
                           </div>
                           <div className="col-span-2">
                               <label className={labelClass}>Shop Name</label>
                               <input type="text" className={inputClass} value={formData.vehicle_property_damage?.body_shop?.name || ''} onChange={e => handleChange('vehicle_property_damage', 'body_shop', e.target.value, 'name')} />
                           </div>
                           <div>
                               <label className={labelClass}>Shop Address</label>
                               <input type="text" className={inputClass} value={formData.vehicle_property_damage?.body_shop?.address || ''} onChange={e => handleChange('vehicle_property_damage', 'body_shop', e.target.value, 'address')} />
                           </div>
                           <div>
                               <label className={labelClass}>Shop Phone</label>
                               <input type="text" className={inputClass} value={formData.vehicle_property_damage?.body_shop?.phone || ''} onChange={e => handleChange('vehicle_property_damage', 'body_shop', e.target.value, 'phone')} />
                           </div>
                       </div>
                       <div className="col-span-2 grid grid-cols-2 gap-3 mt-1 border-t pt-3">
                           <div>
                               <label className={labelClass}>Vehicle Drivable</label>
                               <select className={inputClass} value={formData.vehicle_property_damage?.vehicle_drivable === true ? 'yes' : formData.vehicle_property_damage?.vehicle_drivable === false ? 'no' : ''} onChange={e => handleChange('vehicle_property_damage', 'vehicle_drivable', e.target.value === 'yes' ? true : e.target.value === 'no' ? false : undefined)}>
                                   <option value="">Select...</option>
                                   <option value="yes">Yes</option>
                                   <option value="no">No</option>
                               </select>
                           </div>
                           <label className="flex items-center space-x-2">
                               <input type="checkbox" checked={formData.vehicle_property_damage?.airbags_deployed || false} onChange={e => handleChange('vehicle_property_damage', 'airbags_deployed', e.target.checked)} />
                               <span className="text-sm text-stone-700">Airbags Deployed</span>
                           </label>
                           <label className="flex items-center space-x-2">
                               <input type="checkbox" checked={formData.vehicle_property_damage?.seatbelt_worn || false} onChange={e => handleChange('vehicle_property_damage', 'seatbelt_worn', e.target.checked)} />
                               <span className="text-sm text-stone-700">Seatbelt Worn</span>
                           </label>
                           <label className="flex items-center space-x-2">
                               <input type="checkbox" checked={formData.vehicle_property_damage?.pictures_taken || false} onChange={e => handleChange('vehicle_property_damage', 'pictures_taken', e.target.checked)} />
                               <span className="text-sm text-stone-700">Pictures Taken</span>
                           </label>
                           <label className="flex items-center space-x-2">
                               <input type="checkbox" checked={formData.vehicle_property_damage?.total_loss || false} onChange={e => handleChange('vehicle_property_damage', 'total_loss', e.target.checked)} />
                               <span className="text-sm text-stone-700">Total Loss</span>
                           </label>
                       </div>
                       {formData.vehicle_property_damage?.pictures_taken && (
                         <div>
                           <label className={labelClass}>Pictures Taken By</label>
                           <input type="text" className={inputClass} value={formData.vehicle_property_damage?.pictures_taken_by_whom || ''} onChange={e => handleChange('vehicle_property_damage', 'pictures_taken_by_whom', e.target.value)} />
                         </div>
                       )}
                       <div>
                           <label className={labelClass}>Property Damage Est. ($)</label>
                           <input type="number" className={inputClass} value={formData.vehicle_property_damage?.property_damage_amount_or_estimate || ''} onChange={e => handleChange('vehicle_property_damage', 'property_damage_amount_or_estimate', parseFloat(e.target.value))} />
                       </div>
                       <div className="col-span-2 border-t pt-3 mt-1">
                         <h4 className="font-semibold text-stone-700 mb-2 text-sm">Prior Accidents (Last 10 Years)</h4>
                         <div className="grid grid-cols-2 gap-3">
                           <div className="col-span-2 flex items-center space-x-2">
                             <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.vehicle_property_damage?.prior_accidents_within_last_10_years || false} onChange={e => handleChange('vehicle_property_damage', 'prior_accidents_within_last_10_years', e.target.checked)} />
                             <span className="text-sm font-medium text-stone-700">Prior accidents within the last 10 years?</span>
                           </div>
                           {formData.vehicle_property_damage?.prior_accidents_within_last_10_years && (
                             <>
                               <div>
                                 <label className={labelClass}>Prior Accident Date</label>
                                 <input type="date" className={inputClass} value={(formData.vehicle_property_damage?.prior_accident_dates || [])[0] || ''} onChange={e => handleChange('vehicle_property_damage', 'prior_accident_dates', [e.target.value])} />
                               </div>
                               <div>
                                 <label className={labelClass}>Injuries</label>
                                 <input type="text" className={inputClass} value={formData.vehicle_property_damage?.injuries_summary || ''} onChange={e => handleChange('vehicle_property_damage', 'injuries_summary', e.target.value)} />
                               </div>
                               <div className="flex items-center space-x-2">
                                 <input type="checkbox" checked={formData.vehicle_property_damage?.at_fault || false} onChange={e => handleChange('vehicle_property_damage', 'at_fault', e.target.checked)} />
                                 <span className="text-sm text-stone-700">At Fault</span>
                               </div>
                               <div className="flex items-center space-x-2">
                                 <input type="checkbox" checked={formData.vehicle_property_damage?.claim_made || false} onChange={e => handleChange('vehicle_property_damage', 'claim_made', e.target.checked)} />
                                 <span className="text-sm text-stone-700">Claim Made</span>
                               </div>
                             </>
                           )}
                         </div>
                       </div>
                       <div className="col-span-2 border-t pt-3 mt-1">
                         <h4 className="font-semibold text-stone-700 mb-2 text-sm">Passengers Involved</h4>
                         {(formData.passengers_involved || []).length > 0 && (
                           <div className="space-y-2 mb-3">
                             {(formData.passengers_involved || []).map((p, idx) => (
                               <div key={idx} className="flex items-center gap-2 bg-stone-50 p-2 rounded border border-stone-200 text-sm">
                                 <div className="flex-1 grid grid-cols-3 gap-2">
                                   <input className={inputClass + ' !py-1.5 !text-xs'} placeholder="Name" value={p.name} onChange={e => {
                                     const updated = [...(formData.passengers_involved || [])];
                                     updated[idx] = { ...updated[idx], name: e.target.value };
                                     setFormData(prev => ({ ...prev, passengers_involved: updated }));
                                   }} />
                                   <input className={inputClass + ' !py-1.5 !text-xs'} placeholder="Phone" value={p.phone || ''} onChange={e => {
                                     const updated = [...(formData.passengers_involved || [])];
                                     updated[idx] = { ...updated[idx], phone: e.target.value };
                                     setFormData(prev => ({ ...prev, passengers_involved: updated }));
                                   }} />
                                   <input className={inputClass + ' !py-1.5 !text-xs'} placeholder="Notes" value={p.notes || ''} onChange={e => {
                                     const updated = [...(formData.passengers_involved || [])];
                                     updated[idx] = { ...updated[idx], notes: e.target.value };
                                     setFormData(prev => ({ ...prev, passengers_involved: updated }));
                                   }} />
                                 </div>
                                 <button onClick={() => setFormData(prev => ({ ...prev, passengers_involved: (prev.passengers_involved || []).filter((_, i) => i !== idx) }))} className="text-red-500 hover:text-red-700 p-1">
                                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                 </button>
                               </div>
                             ))}
                           </div>
                         )}
                         <button
                           onClick={() => setFormData(prev => ({ ...prev, passengers_involved: [...(prev.passengers_involved || []), { name: '' }] }))}
                           className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 font-medium"
                         >
                           + Add Passenger
                         </button>
                       </div>
                   </div>
                 </div>
               )}
           </div>
       )}

       {activeSection === 'defendant' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Defendant Information</h3>
               <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelClass}>Name</label>
                        <input className={inputClass} value={formData.defendant?.name || ''} onChange={e => handleChange('defendant', 'name', e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>Phone</label>
                        <input className={inputClass} value={formData.defendant?.phone || ''} onChange={e => handleChange('defendant', 'phone', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                        <label className={labelClass}>Address</label>
                        <input className={inputClass} placeholder="Street" value={formData.defendant?.address?.street || ''} onChange={e => handleChange('defendant', 'address', e.target.value, 'street')} />
                        <div className="grid grid-cols-6 gap-2 mt-2">
                            <div className="col-span-3">
                                <input className={inputClass} placeholder="City" value={formData.defendant?.address?.city || ''} onChange={e => handleChange('defendant', 'address', e.target.value, 'city')} />
                            </div>
                            <div className="col-span-1">
                                <StateSelect value={formData.defendant?.address?.state || ''} onChange={v => handleChange('defendant', 'address', v, 'state')} className={inputClass} />
                            </div>
                            <div className="col-span-2">
                                <input className={inputClass} placeholder="Zip" value={formData.defendant?.address?.zip || ''} onChange={e => handleChange('defendant', 'address', e.target.value, 'zip')} />
                            </div>
                        </div>
                    </div>
               </div>

               <div className="border-t border-stone-200 pt-6 mt-6">
                 <InsuranceBlock
                   label="Defendant Insurance"
                   badge="3rd Party"
                   badgeColor="stone"
                   ins={defIns}
                   onFieldChange={fields => handleInsuranceFieldChange('Defendant', fields)}
                   inputClass={inputClass}
                   labelClass={labelClass}
                 />
               </div>
           </div>
       )}

       </div>

       <div className="flex justify-end pt-4 border-t border-stone-200 max-w-5xl">
           <button
             onClick={handleSave}
             disabled={saveStatus === 'saving' || saveStatus === 'saved'}
             className={`px-6 py-2 rounded-lg font-medium shadow-sm flex items-center transition-all ${
                 saveStatus === 'saved' ? 'bg-emerald-600 text-white' :
                 saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-wait' :
                 'bg-blue-600 text-white hover:bg-blue-700'
             }`}
           >
               {saveStatus === 'saving' ? (
                   <>
                       <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                       Saving...
                   </>
               ) : saveStatus === 'saved' ? (
                   <>
                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                       Saved!
                   </>
               ) : (
                   <>
                       <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                       Save Full Intake
                   </>
               )}
           </button>
       </div>

       {isFormModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                   <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                       <h3 className="font-bold text-stone-800">Generate Legal Documents</h3>
                       <button onClick={() => setIsFormModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       </button>
                   </div>
                   <div className="p-6">
                       <p className="text-sm text-stone-600 mb-4">Select the documents you wish to generate based on the current intake data.</p>
                       <div className="space-y-3 mb-6">
                           {[
                             { id: 'rep_lien_1p' as const, label: 'Letter of Representation + Lien — 1P (Client Insurance)', desc: 'LOR and lien sent to the client\'s own insurance company.' },
                             { id: 'rep_lien_3p' as const, label: 'Letter of Representation + Lien — 3P (Defendant Insurance)', desc: 'LOR and lien sent to the defendant\'s insurance company.' },
                             { id: 'foia' as const, label: 'Chicago FOIA Package', desc: 'Request letter, CPD form, and crash report attachment placeholder.' },
                             { id: 'intake_summary' as const, label: 'Client Intake Summary', desc: 'Detailed form including Accident, Client, Medical, and Insurance info.' },
                             { id: 'sap_intake_form' as const, label: 'SAP Intake Form', desc: 'Auto-populated intake spreadsheet with all case data, providers, and insurance.' },
                           ].map(form => (
                             <label key={form.id} className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedForm === form.id ? 'border-blue-500 bg-blue-50' : 'border-stone-200 hover:bg-stone-50'}`}>
                               <input type="radio" name="formType" checked={selectedForm === form.id} onChange={() => setSelectedForm(form.id)} className="w-5 h-5 text-blue-600 focus:ring-blue-500" />
                               <div>
                                 <span className="text-sm font-bold text-stone-800 block">{form.label}</span>
                                 <span className="text-xs text-stone-500">{form.desc}</span>
                               </div>
                             </label>
                           ))}
                       </div>
                       <div className="flex justify-end pt-2 border-t border-stone-100">
                           <button onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg mr-2">Cancel</button>
                           <button
                               onClick={handleGenerateClick}
                               disabled={!selectedForm}
                               className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all flex items-center disabled:opacity-50"
                           >
                               Preview & Print
                           </button>
                       </div>
                   </div>
               </div>
           </div>
       )}

       <DocumentGenerator
          isOpen={showDocPreview}
          onClose={() => setShowDocPreview(false)}
          caseData={{...caseData, extendedIntake: formData}}
          formType={selectedForm}
          onSaveToDocuments={onUpdateCase ? (docName: string, docFormType: DocumentFormType) => {
            const newDoc: DocumentAttachment = {
              type: 'other',
              fileData: null,
              fileName: `${docName} — ${caseData.clientName} — ${new Date().toISOString().split('T')[0]}.pdf`,
              mimeType: 'application/pdf',
              source: 'Generated',
              category: 'intake',
              generatedFormType: docFormType,
              uploadedAt: new Date().toISOString(),
            };
            onUpdateCase({ ...caseData, documents: [...caseData.documents, newDoc] });
          } : undefined}
       />
    </div>
  );
};
