
import React, { useState, useEffect } from 'react';
import { CaseFile, ExtendedIntakeData, ClientDetails, Insurance, InsuranceAdjuster } from '../types';
import { DocumentGenerator, DocumentFormType } from './DocumentGenerator';
import { DocumentAttachment } from '../types';
import { CoverageFieldGroup } from './CoverageFieldGroup';

interface InsuranceBlockProps {
  label: string;
  badge: string;
  badgeColor: 'stone' | 'emerald';
  ins: Insurance;
  onFieldChange: (fields: Partial<Insurance>) => void;
  inputClass: string;
  selectClass: string;
  labelClass: string;
}

const InsuranceBlock: React.FC<InsuranceBlockProps> = ({ label, badge, badgeColor, ins, onFieldChange, inputClass, selectClass, labelClass }) => {
  const [newAdj, setNewAdj] = useState({ name: '', phone: '', email: '' });
  const adjusters = ins.adjusters || [];
  const badgeStyles = badgeColor === 'emerald'
    ? 'bg-emerald-50 text-emerald-600'
    : 'bg-stone-100 text-stone-500';

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
      <h4 className="font-bold text-stone-700 mb-3 text-sm flex items-center">
        {label}
        <span className={`ml-2 ${badgeStyles} text-[10px] px-2 py-0.5 rounded-full uppercase`}>{badge}</span>
      </h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Carrier</label>
          <input className={inputClass} placeholder="e.g. State Farm" value={ins.provider || ''} onChange={e => onFieldChange({ provider: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Claim #</label>
          <input className={inputClass} placeholder="Claim #" value={ins.claimNumber || ''} onChange={e => onFieldChange({ claimNumber: e.target.value })} />
        </div>
        <div>
          <label className={labelClass}>Policy #</label>
          <input className={inputClass} placeholder="Policy #" value={ins.policyNumber || ''} onChange={e => onFieldChange({ policyNumber: e.target.value })} />
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

      <div className="mt-5 border-t border-stone-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-xs font-bold text-stone-500 uppercase">Adjusters</h5>
          <span className="text-xs text-stone-400">{adjusters.length} {adjusters.length === 1 ? 'adjuster' : 'adjusters'}</span>
        </div>

        {adjusters.length > 0 && (
          <div className="space-y-3 mb-4">
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
    };
  });

  const [activeSection, setActiveSection] = useState<string>(initialSection || 'admin');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newProvider, setNewProvider] = useState({ name: '', address: '', phone: '' });

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<'rep_lien' | 'foia' | 'intake_summary' | 'boss_intake_form' | null>(null);
  const [showDocPreview, setShowDocPreview] = useState(false);

  useEffect(() => {
    if (initialSection) setActiveSection(initialSection);
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
    onUpdateCase({ ...caseData, insurance: newIns });
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
                 client = {
                     ...client,
                     [field]: {
                         ...fieldData,
                         [subField]: {
                             ...subFieldData,
                             [subSubField]: value
                         }
                     }
                 };
             } else {
                 client = {
                     ...client,
                     [field]: {
                         ...fieldData,
                         [subField]: value
                     }
                 };
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
          additional_clients: [
              ...(prev.additional_clients || []),
              { full_name: '', address: {} }
          ],
          intake_admin: {
              ...prev.intake_admin,
              total_clients: (prev.intake_admin?.total_clients || 1) + 1
          }
      }));
  };

  const handleRemoveClient = (index: number) => {
      if(!confirm('Remove this additional client?')) return;
      setFormData(prev => ({
          ...prev,
          additional_clients: (prev.additional_clients || []).filter((_, i) => i !== index),
          intake_admin: {
              ...prev.intake_admin,
              total_clients: Math.max(1, (prev.intake_admin?.total_clients || 1) - 1)
          }
      }));
  };

  const handleAddProvider = () => {
    if (!newProvider.name) return;
    setFormData(prev => {
        const currentMedical = prev.medical || {};
        const currentProviders = currentMedical.providers || [];
        return {
            ...prev,
            medical: {
                ...currentMedical,
                providers: [...currentProviders, newProvider]
            }
        };
    });
    setNewProvider({ name: '', address: '', phone: '' });
  };

  const handleDeleteProvider = (index: number) => {
      setFormData(prev => {
          const currentMedical = prev.medical || {};
          const currentProviders = currentMedical.providers || [];
          return {
              ...prev,
              medical: {
                  ...currentMedical,
                  providers: currentProviders.filter((_, i) => i !== index)
              }
          };
      });
  };

  const handleSave = () => {
      setSaveStatus('saving');
      setTimeout(() => {
          onSave(formData);
          setSaveStatus('saved');
      }, 600);
  };

  const handleGenerateClick = () => {
      if (!selectedForm) return;
      setShowDocPreview(true);
      setIsFormModalOpen(false);
  };

  const sections = [
    { id: 'admin', label: 'Admin & Referral' },
    { id: 'client', label: 'Client' },
    { id: 'accident', label: 'Accident' },
    { id: 'defendant', label: 'Defendant' },
    { id: 'employment', label: 'Employment' },
    { id: 'medical', label: 'Medical' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'vehicle', label: 'Vehicle' }
  ];

  const inputClass = "w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none";
  const selectClass = "w-full bg-white border border-stone-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer";
  const labelClass = "block text-xs font-bold text-stone-500 uppercase mb-1";
  const sectionClass = "bg-white rounded-lg border border-stone-200 p-6 animate-fade-in";

  const renderClientFields = (client: ClientDetails, isPrimary: boolean, index?: number) => {
      const isAddl = !isPrimary && index !== undefined;
      const getValue = (field: keyof ClientDetails) => client[field] || '';
      const getAddr = (field: string) => client.address ? (client.address as any)[field] || '' : '';

      const onChange = (field: string, val: any, sub?: string) => {
          if (isAddl) {
              handleAdditionalClientChange(index, field, val, sub);
          } else {
              handleChange('client', field, val, sub);
          }
      };

      return (
          <div className={`grid grid-cols-2 gap-4 ${isAddl ? 'bg-stone-50 p-4 rounded-xl border border-stone-200 mt-6 relative' : ''}`}>
               {isAddl && (
                   <button
                        onClick={() => handleRemoveClient(index)}
                        className="absolute top-4 right-4 text-red-500 hover:text-red-700 font-bold text-xs flex items-center bg-white px-2 py-1 rounded border border-red-100 shadow-sm"
                   >
                       <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                       Remove
                   </button>
               )}
               {isAddl && <h4 className="col-span-2 font-bold text-stone-700 border-b pb-2 mb-2">Additional Client #{index + 1}</h4>}

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

               <div className="col-span-2 border-t pt-2 mt-2">
                   <label className={labelClass}>Address</label>
                   <div className="grid grid-cols-6 gap-2">
                       <div className="col-span-6">
                           <input placeholder="Street Address" className={inputClass} value={getAddr('street')} onChange={e => onChange('address', e.target.value, 'street')} />
                       </div>
                       <div className="col-span-3">
                           <input placeholder="City" className={inputClass} value={getAddr('city')} onChange={e => onChange('address', e.target.value, 'city')} />
                       </div>
                       <div className="col-span-1">
                           <input placeholder="State" className={inputClass} value={getAddr('state')} onChange={e => onChange('address', e.target.value, 'state')} />
                       </div>
                       <div className="col-span-2">
                           <input placeholder="Zip" className={inputClass} value={getAddr('zip')} onChange={e => onChange('address', e.target.value, 'zip')} />
                       </div>
                   </div>
               </div>

               <div className="col-span-2 border-t pt-2 mt-2">
                   <label className={labelClass}>Driver's License</label>
                   <div className="grid grid-cols-2 gap-2">
                       <input placeholder="DL Number" className={inputClass} value={client.drivers_license?.number || ''} onChange={e => isAddl ? handleAdditionalClientChange(index, 'drivers_license', e.target.value, 'number') : handleChange('client', 'drivers_license', e.target.value, 'number')} />
                       <input placeholder="State Issued" className={inputClass} value={client.drivers_license?.state_issued || ''} onChange={e => isAddl ? handleAdditionalClientChange(index, 'drivers_license', e.target.value, 'state_issued') : handleChange('client', 'drivers_license', e.target.value, 'state_issued')} />
                   </div>
               </div>
          </div>
      );
  };

  const defIns = getIns('Defendant');
  const clientIns = getIns('Client');

  return (
    <div className="space-y-6">
       {/* Section Navigation & Tools */}
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
           <div className="flex items-center gap-2">
           </div>
       </div>

       {activeSection === 'admin' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Intake Administration</h3>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className={labelClass}>Total Clients</label>
                       <input type="number" readOnly className={inputClass + " bg-stone-50"} value={formData.intake_admin?.total_clients} />
                   </div>
                   <div>
                       <label className={labelClass}>Primary Language</label>
                       <select className={inputClass} value={formData.intake_admin?.primary_language} onChange={e => handleChange('intake_admin', 'primary_language', e.target.value)}>
                           <option>English</option>
                           <option>Spanish</option>
                           <option>Other</option>
                       </select>
                   </div>
                   <div>
                       <label className={labelClass}>Referral Source</label>
                       <select className={inputClass} value={formData.intake_admin?.referral_source} onChange={e => handleChange('intake_admin', 'referral_source', e.target.value)}>
                           <option>Internet</option>
                           <option>TV</option>
                           <option>Doctor Ref</option>
                           <option>Attorney Ref</option>
                           <option>Billboard</option>
                           <option>Other</option>
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
                               <option value="">Select Location...</option>
                               <option value="Office">Office</option>
                               <option value="Field">Field</option>
                           </select>
                       </div>
                   </div>
               </div>
           </div>
       )}

       {activeSection === 'client' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Client Details</h3>
               <div className="mb-8">
                   <h4 className="font-bold text-blue-800 uppercase text-xs tracking-wider mb-4 bg-blue-50 p-2 rounded">Primary Client</h4>
                   {renderClientFields(formData.client || {}, true)}
               </div>
               {formData.additional_clients && formData.additional_clients.map((client, idx) => (
                   <div key={idx} className="mb-6">
                       {renderClientFields(client, false, idx)}
                   </div>
               ))}
               <button
                  onClick={handleAddClient}
                  className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center"
               >
                   <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                   Add Another Client
               </button>
           </div>
       )}

       {activeSection === 'accident' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Accident Details</h3>
               <div className="grid grid-cols-2 gap-4">
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
                                <input type="text" className={inputClass} value={formData.accident?.state || ''} onChange={e => handleChange('accident', 'state', e.target.value)} />
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
                           <option value="">Select...</option>
                           <option>Driver</option>
                           <option>Passenger</option>
                           <option>Pedestrian</option>
                       </select>
                   </div>
                   <div>
                        <label className={labelClass}>Weather</label>
                        <select className={inputClass} value={formData.accident?.weather_conditions} onChange={e => handleChange('accident', 'weather_conditions', e.target.value)}>
                           <option value="">Select...</option>
                           <option>Clear</option>
                           <option>Rain</option>
                           <option>Snow</option>
                           <option>Ice</option>
                       </select>
                   </div>
                   <div className="col-span-2">
                       <label className={labelClass}>Narrative / Accident Facts</label>
                       <textarea className={inputClass + " h-32"} value={formData.accident?.accident_facts || ''} onChange={e => handleChange('accident', 'accident_facts', e.target.value)} />
                   </div>
               </div>
           </div>
       )}

       {activeSection === 'defendant' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Defendant Information</h3>
               <div className="grid grid-cols-2 gap-4">
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
                                <input className={inputClass} placeholder="ST" value={formData.defendant?.address?.state || ''} onChange={e => handleChange('defendant', 'address', e.target.value, 'state')} />
                            </div>
                            <div className="col-span-2">
                                <input className={inputClass} placeholder="Zip" value={formData.defendant?.address?.zip || ''} onChange={e => handleChange('defendant', 'address', e.target.value, 'zip')} />
                            </div>
                        </div>
                    </div>

                    {defIns.provider && (
                      <div className="col-span-2 border-t pt-4 mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-stone-700 text-sm">Defendant Insurance</h4>
                          <button
                            onClick={() => setActiveSection('insurance')}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            Edit in Insurance tab
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                        <div className="bg-stone-50 rounded-lg border border-stone-200 p-4 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-xs text-stone-400 uppercase font-bold block">Carrier</span>
                            <span className="text-stone-800 font-medium">{defIns.provider || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-stone-400 uppercase font-bold block">Claim #</span>
                            <span className="text-stone-800 font-medium">{defIns.claimNumber || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-stone-400 uppercase font-bold block">Status</span>
                            <span className="text-stone-800 font-medium capitalize">{defIns.insuredStatus || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-xs text-stone-400 uppercase font-bold block">Limits</span>
                            <span className="text-stone-800 font-medium">{defIns.coverageLimits || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    )}
               </div>
           </div>
       )}

       {activeSection === 'employment' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Employment & Lost Wages</h3>
               <div className="grid grid-cols-2 gap-4">
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
                           <div className="col-span-2">
                               <label className={labelClass}>Employer Name</label>
                               <input type="text" className={inputClass} value={formData.employment?.employer?.name || ''} onChange={e => handleChange('employment', 'employer', e.target.value, 'name')} />
                           </div>
                           <div className="col-span-2">
                               <label className={labelClass}>Employer Address</label>
                               <input type="text" className={inputClass} placeholder="Street, City, State" value={formData.employment?.employer?.address?.street || ''} onChange={e => handleChange('employment', 'employer', e.target.value, 'address', 'street')} />
                           </div>
                           <div>
                               <label className={labelClass}>Wages Amount</label>
                               <input type="number" className={inputClass} value={formData.employment?.wages?.amount || ''} onChange={e => handleChange('employment', 'wages', parseFloat(e.target.value), 'amount')} />
                           </div>
                           <div>
                               <label className={labelClass}>Per</label>
                               <select className={inputClass} value={formData.employment?.wages?.per} onChange={e => handleChange('employment', 'wages', e.target.value, 'per')}>
                                   <option>Hour</option>
                                   <option>Week</option>
                                   <option>Year</option>
                               </select>
                           </div>
                       </>
                   )}
               </div>
           </div>
       )}

       {activeSection === 'medical' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Medical Treatment</h3>
               <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                       <label className={labelClass}>Injuries Detail</label>
                       <textarea className={inputClass + " h-24"} value={formData.medical?.injuries_detail || ''} onChange={e => handleChange('medical', 'injuries_detail', e.target.value)} />
                   </div>
                   <div className="flex items-center space-x-2">
                       <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.medical?.ambulance || false} onChange={e => handleChange('medical', 'ambulance', e.target.checked)} />
                       <span className="text-sm font-medium text-stone-700">Ambulance taken?</span>
                   </div>
                   <div className="flex items-center space-x-2">
                       <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" checked={formData.medical?.xrays_taken || false} onChange={e => handleChange('medical', 'xrays_taken', e.target.checked)} />
                       <span className="text-sm font-medium text-stone-700">X-Rays taken?</span>
                   </div>
                   <div className="col-span-2 mt-2">
                       <label className={labelClass}>Hospital Name</label>
                       <input type="text" className={inputClass} value={formData.medical?.hospital?.name || ''} onChange={e => handleChange('medical', 'hospital', e.target.value, 'name')} />
                   </div>
                   <div className="col-span-2 mt-2">
                       <label className={labelClass}>Pre-existing Conditions</label>
                       <textarea className={inputClass + " h-16"} value={formData.medical?.pre_existing_conditions || ''} onChange={e => handleChange('medical', 'pre_existing_conditions', e.target.value)} />
                   </div>

                   <div className="col-span-2 border-t pt-4 mt-4">
                        <h4 className="font-semibold text-stone-700 mb-3 text-sm">Additional Treatment Providers</h4>

                        {formData.medical?.providers && formData.medical.providers.length > 0 && (
                            <div className="space-y-3 mb-4">
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

                        <div className="grid grid-cols-2 gap-3 bg-stone-50 p-3 rounded border border-stone-200">
                            <div className="col-span-2">
                                <input
                                    placeholder="Provider Name (e.g. Dr. Smith)"
                                    className={inputClass}
                                    value={newProvider.name}
                                    onChange={e => setNewProvider({...newProvider, name: e.target.value})}
                                />
                            </div>
                            <input
                                placeholder="Address"
                                className={inputClass}
                                value={newProvider.address}
                                onChange={e => setNewProvider({...newProvider, address: e.target.value})}
                            />
                            <input
                                placeholder="Phone"
                                className={inputClass}
                                value={newProvider.phone}
                                onChange={e => setNewProvider({...newProvider, phone: e.target.value})}
                            />
                            <div className="col-span-2 text-right">
                                <button
                                    onClick={handleAddProvider}
                                    disabled={!newProvider.name}
                                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50 font-medium"
                                >
                                    + Add Provider
                                </button>
                            </div>
                        </div>
                   </div>
               </div>
           </div>
       )}

       {activeSection === 'insurance' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Insurance</h3>
               <div className="space-y-8">
                   <InsuranceBlock
                     label="Defendant Insurance"
                     badge="3rd Party"
                     badgeColor="stone"
                     ins={defIns}
                     onFieldChange={fields => handleInsuranceFieldChange('Defendant', fields)}
                     inputClass={inputClass}
                     selectClass={selectClass}
                     labelClass={labelClass}
                   />

                   <div className="border-t border-stone-200 pt-6">
                     <InsuranceBlock
                       label="Client Insurance"
                       badge="1st Party"
                       badgeColor="emerald"
                       ins={clientIns}
                       onFieldChange={fields => handleInsuranceFieldChange('Client', fields)}
                       inputClass={inputClass}
                       selectClass={selectClass}
                       labelClass={labelClass}
                     />
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
                         <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className={labelClass}>Company</label>
                                  <input className={inputClass} placeholder="e.g. AETNA" value={formData.health_insurance?.company || ''} onChange={e => handleChange('health_insurance', 'company', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>Member ID</label>
                                  <input className={inputClass} placeholder="Member ID" value={formData.health_insurance?.member_number || ''} onChange={e => handleChange('health_insurance', 'member_number', e.target.value)} />
                              </div>
                              <div>
                                  <label className={labelClass}>Group #</label>
                                  <input className={inputClass} placeholder="Group #" value={formData.health_insurance?.group_number || ''} onChange={e => handleChange('health_insurance', 'group_number', e.target.value)} />
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
                                      <input className={inputClass} placeholder="ST" value={formData.health_insurance?.address?.state || ''} onChange={e => handleChange('health_insurance', 'address', e.target.value, 'state')} />
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

       {activeSection === 'vehicle' && (
           <div className={sectionClass}>
               <h3 className="text-lg font-bold text-stone-800 mb-4 border-b pb-2">Vehicle Property Damage</h3>
               <div className="grid grid-cols-2 gap-4">
                   <div>
                       <label className={labelClass}>License Plate</label>
                       <input type="text" className={inputClass} value={formData.vehicle_property_damage?.license_plate || ''} onChange={e => handleChange('vehicle_property_damage', 'license_plate', e.target.value)} />
                   </div>
                   <div>
                       <label className={labelClass}>Damage Est. ($)</label>
                       <input type="number" className={inputClass} value={formData.vehicle_property_damage?.property_damage_amount_or_estimate || ''} onChange={e => handleChange('vehicle_property_damage', 'property_damage_amount_or_estimate', parseFloat(e.target.value))} />
                   </div>
                   <div className="col-span-2 flex space-x-6 mt-2">
                       <label className="flex items-center space-x-2">
                           <input type="checkbox" checked={formData.vehicle_property_damage?.vehicle_drivable || false} onChange={e => handleChange('vehicle_property_damage', 'vehicle_drivable', e.target.checked)} />
                           <span className="text-sm text-stone-700">Vehicle Drivable</span>
                       </label>
                       <label className="flex items-center space-x-2">
                           <input type="checkbox" checked={formData.vehicle_property_damage?.airbags_deployed || false} onChange={e => handleChange('vehicle_property_damage', 'airbags_deployed', e.target.checked)} />
                           <span className="text-sm text-stone-700">Airbags Deployed</span>
                       </label>
                       <label className="flex items-center space-x-2">
                           <input type="checkbox" checked={formData.vehicle_property_damage?.seatbelt_worn || false} onChange={e => handleChange('vehicle_property_damage', 'seatbelt_worn', e.target.checked)} />
                           <span className="text-sm text-stone-700">Seatbelt Worn</span>
                       </label>
                   </div>

                   <div className="col-span-2 mt-4 border-t pt-4">
                        <h4 className="font-semibold text-stone-700 mb-2 text-sm">Body Shop Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={labelClass}>Shop Name</label>
                                <input type="text" className={inputClass} value={formData.vehicle_property_damage?.body_shop?.name || ''} onChange={e => handleChange('vehicle_property_damage', 'body_shop', e.target.value, 'name')} />
                            </div>
                            <div>
                                <label className={labelClass}>Shop Phone</label>
                                <input type="text" className={inputClass} value={formData.vehicle_property_damage?.body_shop?.phone || ''} onChange={e => handleChange('vehicle_property_damage', 'body_shop', e.target.value, 'phone')} />
                            </div>
                            <div>
                                <label className={labelClass}>Shop Address</label>
                                <input type="text" className={inputClass} value={formData.vehicle_property_damage?.body_shop?.address || ''} onChange={e => handleChange('vehicle_property_damage', 'body_shop', e.target.value, 'address')} />
                            </div>
                        </div>
                   </div>
               </div>
           </div>
       )}

       <div className="flex justify-end pt-4 border-t border-stone-200">
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
                             { id: 'rep_lien' as const, label: 'Letter of Representation + Lien', desc: 'Includes notification to insurance carrier and attorney lien notice.' },
                             { id: 'foia' as const, label: 'Chicago FOIA Package', desc: 'Request letter, CPD form, and crash report attachment placeholder.' },
                             { id: 'intake_summary' as const, label: 'Client Intake Summary', desc: 'Detailed form including Accident, Client, Medical, and Insurance info.' },
                             { id: 'boss_intake_form' as const, label: 'Boss Intake Form', desc: 'Auto-populated intake spreadsheet with all case data, providers, and insurance.' },
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
