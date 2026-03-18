import React, { useState } from 'react';
import { CaseFile, DocumentAttachment, CaseStatus, DocumentType } from '../types';

interface NewIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newCase: CaseFile) => void;
}

export const NewIntakeModal: React.FC<NewIntakeModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [clientInfo, setClientInfo] = useState({
    name: '', dob: '', address: '', phone: '', email: ''
  });
  const [incidentInfo, setIncidentInfo] = useState({
    date: '', location: '', description: '',
    vehYear: '', vehMake: '', vehModel: '', vehDamage: ''
  });
  const [partyInfo, setPartyInfo] = useState({
    defName: '', 
    defInsurance: '', defClaim: '', defLimits: '', defUninsured: false,
    clientInsurance: '', clientClaim: '', clientPolicy: '', clientLimits: '',
    otherInsurance: '', otherProvider: '', otherLimits: ''
  });
  const [medicalInfo, setMedicalInfo] = useState({
    status: 'Emergency Room', providers: ''
  });
  
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments(prev => [
          ...prev, 
          { 
            type, 
            fileData: reader.result as string, 
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream'
          }
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSimulateSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      const insuranceList: any[] = [];
      
      // Defendant Insurance Logic
      if (partyInfo.defUninsured) {
          insuranceList.push({ type: 'Defendant', provider: 'Uninsured', isUninsured: true });
      } else if (partyInfo.defInsurance) {
          insuranceList.push({ 
              type: 'Defendant', 
              provider: partyInfo.defInsurance, 
              claimNumber: partyInfo.defClaim,
              coverageLimits: partyInfo.defLimits
          });
      }

      // Client Insurance
      if (partyInfo.clientInsurance) {
          insuranceList.push({ 
              type: 'Client', 
              provider: partyInfo.clientInsurance, 
              claimNumber: partyInfo.clientClaim, 
              policyNumber: partyInfo.clientPolicy,
              coverageLimits: partyInfo.clientLimits
          });
      }

      // Other Party Insurance
      if (partyInfo.otherProvider) {
          insuranceList.push({
              type: 'Other',
              provider: partyInfo.otherProvider,
              coverageLimits: partyInfo.otherLimits,
              policyNumber: partyInfo.otherInsurance // hijacking field for policy/claim
          });
      }

      const accidentDate = incidentInfo.date || new Date().toISOString().split('T')[0];
      const solDate = new Date(accidentDate);
      solDate.setFullYear(solDate.getFullYear() + 2);
      const statuteOfLimitationsDate = solDate.toISOString().split('T')[0];

      const newCase: CaseFile = {
        id: Math.random().toString(36).substr(2, 9),
        clientName: clientInfo.name || 'Unknown Client',
        clientDob: clientInfo.dob,
        clientAddress: clientInfo.address,
        clientEmail: clientInfo.email || 'no-email@example.com',
        clientPhone: clientInfo.phone || '555-0000',

        accidentDate: accidentDate,
        location: incidentInfo.location,
        description: incidentInfo.description || 'No description provided.',
        statuteOfLimitationsDate: statuteOfLimitationsDate,
        
        vehicleInfo: {
          year: incidentInfo.vehYear,
          make: incidentInfo.vehMake,
          model: incidentInfo.vehModel,
          damage: incidentInfo.vehDamage
        },

        parties: partyInfo.defName ? [{ name: partyInfo.defName, role: 'Defendant' }] : [],
        insurance: insuranceList,

        treatmentStatus: medicalInfo.status,
        treatmentProviders: medicalInfo.providers,

        status: CaseStatus.NEW,
        createdAt: new Date().toISOString(),
        referralSource: 'TopRank Agency Portal',
        documents: documents,
        activityLog: [
            {
                id: Math.random().toString(36).substr(2, 9),
                type: 'system',
                message: 'Case created via Web Intake Form',
                timestamp: new Date().toISOString()
            }
        ]
      };

      onSubmit(newCase);
      setLoading(false);
      onClose();
    }, 1500);
  };

  const fillMockData = () => {
    setClientInfo({
      name: 'Michael Anderson',
      dob: '1985-04-12',
      address: '123 Maple Ave, Springfield, IL',
      phone: '(555) 123-4567',
      email: 'm.anderson@example.com'
    });
    setIncidentInfo({
      date: '2023-10-15',
      location: 'I-95 Southbound, Mile Marker 42',
      description: 'Rear-ended at high speed while stopped in traffic. Driver admitted fault at scene. Police report filed.',
      vehYear: '2019', vehMake: 'Toyota', vehModel: 'Camry', vehDamage: 'Totaled rear end, trunk crushed'
    });
    setPartyInfo({
      defName: 'Robert Smith',
      defInsurance: 'State Farm',
      defClaim: 'SF-992834-X',
      defLimits: '100/300/100',
      defUninsured: false,
      clientInsurance: 'Geico',
      clientClaim: 'G-112233',
      clientPolicy: 'POL-998877',
      clientLimits: '50/100/50',
      otherInsurance: '',
      otherProvider: '',
      otherLimits: ''
    });
    setMedicalInfo({
      status: 'Emergency Room',
      providers: 'Springfield General Hospital, Dr. Jones (Ortho)'
    });
  };

  const steps = ['Demographics', 'Incident', 'Parties/Ins', 'Medical', 'Documents'];

  // Standardized classes for light theme inputs
  const inputClass = "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-400";
  const labelClass = "text-xs font-bold text-slate-500 uppercase mb-1.5 block tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Agency Intake Submission</h3>
            <p className="text-sm text-slate-500">New Client Webhook Simulation</p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={fillMockData} className="text-xs text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
              Auto-fill Mock Data
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Stepper */}
        <div className="px-6 pt-6 flex-shrink-0">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-100 -z-10"></div>
            {steps.map((label, i) => (
              <div key={i} className="flex flex-col items-center cursor-pointer group" onClick={() => setStep(i + 1)}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${step > i ? 'bg-green-500 border-green-500 text-white' : step === i + 1 ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-50' : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'}`}>
                  {step > i ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-2 font-medium ${step === i + 1 ? 'text-blue-600' : 'text-slate-500'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Client Demographics</h4>
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className={labelClass}>Full Name</label>
                  <input type="text" className={inputClass} value={clientInfo.name} onChange={e => setClientInfo({...clientInfo, name: e.target.value})} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <label className={labelClass}>Date of Birth</label>
                  <input type="date" className={inputClass} value={clientInfo.dob} onChange={e => setClientInfo({...clientInfo, dob: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" className={inputClass} value={clientInfo.phone} onChange={e => setClientInfo({...clientInfo, phone: e.target.value})} placeholder="(555) 555-5555" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Address</label>
                  <input type="text" className={inputClass} value={clientInfo.address} onChange={e => setClientInfo({...clientInfo, address: e.target.value})} placeholder="Street address, City, State, Zip" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Email</label>
                  <input type="email" className={inputClass} value={clientInfo.email} onChange={e => setClientInfo({...clientInfo, email: e.target.value})} placeholder="client@example.com" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Incident & Vehicle</h4>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={labelClass}>Date of Loss</label>
                  <input type="date" className={inputClass} value={incidentInfo.date} onChange={e => setIncidentInfo({...incidentInfo, date: e.target.value})} />
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <input type="text" className={inputClass} placeholder="City, State or Intersection" value={incidentInfo.location} onChange={e => setIncidentInfo({...incidentInfo, location: e.target.value})} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Facts of Loss / Description</label>
                  <textarea className={inputClass + " h-24 resize-none"} value={incidentInfo.description} onChange={e => setIncidentInfo({...incidentInfo, description: e.target.value})} placeholder="Describe how the accident happened..." />
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-2">
                <h5 className="font-semibold text-slate-700 mb-3 text-sm">Client Vehicle Information</h5>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Year</label>
                    <input type="text" placeholder="20XX" className={inputClass} value={incidentInfo.vehYear} onChange={e => setIncidentInfo({...incidentInfo, vehYear: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Make</label>
                    <input type="text" placeholder="Toyota" className={inputClass} value={incidentInfo.vehMake} onChange={e => setIncidentInfo({...incidentInfo, vehMake: e.target.value})} />
                  </div>
                  <div>
                    <label className={labelClass}>Model</label>
                    <input type="text" placeholder="Camry" className={inputClass} value={incidentInfo.vehModel} onChange={e => setIncidentInfo({...incidentInfo, vehModel: e.target.value})} />
                  </div>
                  <div className="col-span-3 mt-1">
                    <label className={labelClass}>Damage Description</label>
                    <input type="text" placeholder="e.g. Rear bumper damage, trunk crushed" className={inputClass} value={incidentInfo.vehDamage} onChange={e => setIncidentInfo({...incidentInfo, vehDamage: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-fade-in">
              {/* Defendant */}
              <div>
                <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
                    <span>Defendant (At-Fault)</span>
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="checkbox" checked={partyInfo.defUninsured} onChange={e => setPartyInfo({...partyInfo, defUninsured: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500" />
                        <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Uninsured Driver?</span>
                    </label>
                </h4>
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-12">
                    <label className={labelClass}>Defendant Name</label>
                    <input type="text" className={inputClass} value={partyInfo.defName} onChange={e => setPartyInfo({...partyInfo, defName: e.target.value})} placeholder="At-fault driver name" />
                  </div>
                  <div className="col-span-6">
                    <label className={labelClass}>Insurance Company</label>
                    <input type="text" disabled={partyInfo.defUninsured} className={inputClass} value={partyInfo.defInsurance} onChange={e => setPartyInfo({...partyInfo, defInsurance: e.target.value})} placeholder={partyInfo.defUninsured ? "UNINSURED" : "e.g. State Farm"} />
                  </div>
                  <div className="col-span-3">
                    <label className={labelClass}>Coverage Limits</label>
                    <input type="text" disabled={partyInfo.defUninsured} className={inputClass} value={partyInfo.defLimits} onChange={e => setPartyInfo({...partyInfo, defLimits: e.target.value})} placeholder="e.g. 25/50" />
                  </div>
                  <div className="col-span-3">
                    <label className={labelClass}>Claim Number</label>
                    <input type="text" disabled={partyInfo.defUninsured} className={inputClass} value={partyInfo.defClaim} onChange={e => setPartyInfo({...partyInfo, defClaim: e.target.value})} placeholder="Claim #" />
                  </div>
                </div>
              </div>
              
              {/* Client */}
              <div>
                <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Client Insurance</h4>
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-6">
                    <label className={labelClass}>Carrier</label>
                    <input type="text" className={inputClass} value={partyInfo.clientInsurance} onChange={e => setPartyInfo({...partyInfo, clientInsurance: e.target.value})} placeholder="Client's insurance" />
                  </div>
                  <div className="col-span-6">
                     <label className={labelClass}>Coverage Limits</label>
                     <input type="text" className={inputClass} value={partyInfo.clientLimits} onChange={e => setPartyInfo({...partyInfo, clientLimits: e.target.value})} placeholder="e.g. 50/100 UIM" />
                  </div>
                  <div className="col-span-6">
                     <label className={labelClass}>Policy Number</label>
                    <input type="text" className={inputClass} value={partyInfo.clientPolicy} onChange={e => setPartyInfo({...partyInfo, clientPolicy: e.target.value})} />
                  </div>
                   <div className="col-span-6">
                     <label className={labelClass}>Claim Number</label>
                    <input type="text" className={inputClass} value={partyInfo.clientClaim} onChange={e => setPartyInfo({...partyInfo, clientClaim: e.target.value})} />
                  </div>
                </div>
              </div>

               {/* Other */}
               <div>
                <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Other Party Insurance</h4>
                <div className="grid grid-cols-12 gap-5">
                  <div className="col-span-4">
                    <label className={labelClass}>Provider</label>
                    <input type="text" className={inputClass} value={partyInfo.otherProvider} onChange={e => setPartyInfo({...partyInfo, otherProvider: e.target.value})} placeholder="Add'l Insurer" />
                  </div>
                  <div className="col-span-4">
                    <label className={labelClass}>Policy/Claim</label>
                    <input type="text" className={inputClass} value={partyInfo.otherInsurance} onChange={e => setPartyInfo({...partyInfo, otherInsurance: e.target.value})} />
                  </div>
                  <div className="col-span-4">
                    <label className={labelClass}>Limits</label>
                    <input type="text" className={inputClass} value={partyInfo.otherLimits} onChange={e => setPartyInfo({...partyInfo, otherLimits: e.target.value})} placeholder="Coverage" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
             <div className="space-y-4 animate-fade-in">
               <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Medical Treatment</h4>
               <div>
                  <label className={labelClass}>Treatment Status</label>
                  <select className={inputClass} value={medicalInfo.status} onChange={e => setMedicalInfo({...medicalInfo, status: e.target.value})}>
                    <option>Not Started</option>
                    <option>Emergency Room</option>
                    <option>Urgent Care</option>
                    <option>Chiro/PT</option>
                    <option>Ortho/Specialist</option>
                    <option>Concluded</option>
                  </select>
               </div>
               <div>
                 <label className={labelClass}>Known Providers (Hospital, Doctors)</label>
                 <textarea className={inputClass + " h-32 resize-none"} placeholder="List names and locations of all medical providers seen..." value={medicalInfo.providers} onChange={e => setMedicalInfo({...medicalInfo, providers: e.target.value})} />
               </div>
             </div>
          )}

          {step === 5 && (
            <div className="space-y-4 animate-fade-in">
              <h4 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Key Documents</h4>
              <p className="text-sm text-slate-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-800">Please simulate uploading the following key items required for valid intake processing. (Images & PDF supported)</p>
              
              <div className="grid grid-cols-2 gap-4">
                 {[
                   { id: 'retainer', label: 'Signed Retainer' },
                   { id: 'crash_report', label: 'Crash Report' },
                   { id: 'authorization', label: 'HIPAA Auth' },
                   { id: 'insurance_card', label: 'Insurance Card' },
                   { id: 'photo', label: 'Scene/Injury Photos' }
                 ].map((type) => (
                    <div key={type.id} className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-4 hover:bg-slate-100 hover:border-slate-400 transition-all relative group text-center cursor-pointer">
                        <input type="file" accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, type.id as DocumentType)} />
                        <div className="flex flex-col items-center space-y-2 pointer-events-none">
                            <div className="w-10 h-10 bg-white border border-slate-200 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <span className="text-sm font-medium text-slate-700">{type.label}</span>
                        </div>
                    </div>
                 ))}
              </div>

              {documents.length > 0 && (
                <div className="mt-6">
                   <h5 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-wider">Attached Files ({documents.length})</h5>
                   <div className="space-y-2">
                     {documents.map((doc, i) => (
                       <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm text-sm hover:border-blue-300 transition-colors">
                          <div className="flex items-center space-x-3 overflow-hidden">
                             <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${doc.mimeType?.includes('pdf') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                               {doc.mimeType?.includes('pdf') ? (
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                               ) : (
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                               )}
                             </div>
                             <div className="truncate">
                               <p className="font-medium text-slate-900 truncate">{doc.fileName}</p>
                               <p className="text-xs text-slate-500">{doc.type} • {doc.mimeType?.includes('pdf') ? 'PDF' : 'Image'}</p>
                             </div>
                          </div>
                          <button onClick={() => removeDocument(i)} className="text-slate-400 hover:text-red-500 p-2 transition-colors rounded-full hover:bg-red-50">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between flex-shrink-0">
           {step > 1 ? (
             <button onClick={() => setStep(step - 1)} className="px-5 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors hover:bg-slate-200 rounded-lg">
               Back
             </button>
           ) : <div></div>}
           
           <button
             onClick={() => step < 5 ? setStep(step + 1) : handleSimulateSubmit()}
             disabled={loading}
             className={`px-6 py-2 bg-blue-600 text-white rounded-lg font-medium shadow-md hover:bg-blue-700 transition-all flex items-center ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
           >
             {loading ? (
               <>
                 <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 Processing...
               </>
             ) : step < 5 ? 'Next Step' : 'Submit Intake'}
           </button>
        </div>
      </div>
    </div>
  );
};