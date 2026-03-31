import React, { useState } from 'react';
import { CaseFile, DocumentAttachment, CaseStatus, DocumentType } from '../../types';
import { uploadBase64Document } from '../../services/documentStorageService';
import { useAuth } from '../../contexts/AuthContext';

interface ManualIntakeFormProps {
  onSubmit: (newCase: CaseFile) => void;
  referralSource: string;
}

export const ManualIntakeForm: React.FC<ManualIntakeFormProps> = ({ onSubmit, referralSource }) => {
  const { profile } = useAuth();
  const authorName = profile?.full_name || profile?.email || 'Unknown User';
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [clientInfo, setClientInfo] = useState({ name: '', dob: '', address: '', phone: '', email: '' });
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
  const [medicalInfo, setMedicalInfo] = useState({ status: 'Emergency Room', providers: '' });
  const [documents, setDocuments] = useState<DocumentAttachment[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments(prev => [...prev, {
          type,
          fileData: reader.result as string,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream'
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);

    const insuranceList: any[] = [];

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

    if (partyInfo.clientInsurance) {
      insuranceList.push({
        type: 'Client',
        provider: partyInfo.clientInsurance,
        claimNumber: partyInfo.clientClaim,
        policyNumber: partyInfo.clientPolicy,
        coverageLimits: partyInfo.clientLimits
      });
    }

    if (partyInfo.otherProvider) {
      insuranceList.push({
        type: 'Other',
        provider: partyInfo.otherProvider,
        coverageLimits: partyInfo.otherLimits,
        policyNumber: partyInfo.otherInsurance
      });
    }

    const accidentDate = incidentInfo.date || new Date().toISOString().split('T')[0];
    const solDate = new Date(accidentDate);
    solDate.setFullYear(solDate.getFullYear() + 2);

    const caseId = Math.random().toString(36).substr(2, 9);

    const uploadedDocs: DocumentAttachment[] = [];
    for (const doc of documents) {
      const entry: DocumentAttachment = { ...doc, uploadedAt: new Date().toISOString() };
      if (doc.fileData) {
        const result = await uploadBase64Document(caseId, doc.fileData, doc.fileName, doc.mimeType);
        if (!('error' in result)) {
          entry.storagePath = result.path;
          entry.storageUrl = result.url;
          entry.fileData = null;
        }
      }
      uploadedDocs.push(entry);
    }

    const newCase: CaseFile = {
      id: caseId,
      clientName: clientInfo.name || 'Unknown Client',
      clientDob: clientInfo.dob,
      clientAddress: clientInfo.address,
      clientEmail: clientInfo.email || 'no-email@example.com',
      clientPhone: clientInfo.phone || '555-0000',
      accidentDate,
      location: incidentInfo.location,
      description: incidentInfo.description || 'No description provided.',
      statuteOfLimitationsDate: solDate.toISOString().split('T')[0],
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
      referralSource,
      documents: uploadedDocs,
      activityLog: [{
        id: Math.random().toString(36).substr(2, 9),
        type: 'user' as const,
        message: 'Case created via Manual Intake',
        timestamp: new Date().toISOString(),
        author: authorName,
      }]
    };

    onSubmit(newCase);
    setLoading(false);
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-slate-400 transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-400";
  const labelClass = "text-xs font-bold text-slate-500 uppercase mb-1.5 block tracking-wide";

  const steps = ['Demographics', 'Incident', 'Parties/Ins', 'Medical', 'Documents'];

  return (
    <div className="flex flex-col">
      <div className="px-2 pb-6">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-4 w-full h-0.5 bg-slate-100 -z-10" />
          <div
            className="absolute left-0 top-4 h-0.5 bg-blue-500 -z-10 transition-all duration-500"
            style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
          />
          {steps.map((label, i) => (
            <div
              key={i}
              className="flex flex-col items-center cursor-pointer group bg-white px-2 z-10"
              onClick={() => setStep(i + 1)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2 ${
                step > i + 1
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : step === i + 1
                  ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-50'
                  : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-300'
              }`}>
                {step > i + 1 ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-xs mt-2 font-bold uppercase tracking-wider ${step === i + 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-[400px]">
        {step === 1 && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Client Demographics</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Full Name</label>
                <input type="text" className={inputClass} value={clientInfo.name} onChange={e => setClientInfo({ ...clientInfo, name: e.target.value })} placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" className={inputClass} value={clientInfo.dob} onChange={e => setClientInfo({ ...clientInfo, dob: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" className={inputClass} value={clientInfo.phone} onChange={e => setClientInfo({ ...clientInfo, phone: e.target.value })} placeholder="(555) 555-5555" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Address</label>
                <input type="text" className={inputClass} value={clientInfo.address} onChange={e => setClientInfo({ ...clientInfo, address: e.target.value })} placeholder="Street, City, State, Zip" />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Email</label>
                <input type="email" className={inputClass} value={clientInfo.email} onChange={e => setClientInfo({ ...clientInfo, email: e.target.value })} placeholder="client@example.com" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Incident & Vehicle</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date of Loss</label>
                <input type="date" className={inputClass} value={incidentInfo.date} onChange={e => setIncidentInfo({ ...incidentInfo, date: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Location</label>
                <input type="text" className={inputClass} placeholder="City, State or Intersection" value={incidentInfo.location} onChange={e => setIncidentInfo({ ...incidentInfo, location: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Facts of Loss / Description</label>
                <textarea className={inputClass + " h-24 resize-none"} value={incidentInfo.description} onChange={e => setIncidentInfo({ ...incidentInfo, description: e.target.value })} placeholder="Describe how the accident happened..." />
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h5 className="font-bold text-slate-700 mb-3 text-sm">Client Vehicle</h5>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Year</label>
                  <input type="text" placeholder="20XX" className={inputClass} value={incidentInfo.vehYear} onChange={e => setIncidentInfo({ ...incidentInfo, vehYear: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Make</label>
                  <input type="text" placeholder="Toyota" className={inputClass} value={incidentInfo.vehMake} onChange={e => setIncidentInfo({ ...incidentInfo, vehMake: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Model</label>
                  <input type="text" placeholder="Camry" className={inputClass} value={incidentInfo.vehModel} onChange={e => setIncidentInfo({ ...incidentInfo, vehModel: e.target.value })} />
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Damage Description</label>
                  <input type="text" placeholder="e.g. Rear bumper damage, trunk crushed" className={inputClass} value={incidentInfo.vehDamage} onChange={e => setIncidentInfo({ ...incidentInfo, vehDamage: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                <span>Defendant (At-Fault)</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={partyInfo.defUninsured} onChange={e => setPartyInfo({ ...partyInfo, defUninsured: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" />
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wide">Uninsured?</span>
                </label>
              </h4>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12">
                  <label className={labelClass}>Defendant Name</label>
                  <input type="text" className={inputClass} value={partyInfo.defName} onChange={e => setPartyInfo({ ...partyInfo, defName: e.target.value })} placeholder="At-fault driver name" />
                </div>
                <div className="col-span-6">
                  <label className={labelClass}>Insurance Company</label>
                  <input type="text" disabled={partyInfo.defUninsured} className={inputClass} value={partyInfo.defInsurance} onChange={e => setPartyInfo({ ...partyInfo, defInsurance: e.target.value })} placeholder={partyInfo.defUninsured ? 'UNINSURED' : 'e.g. State Farm'} />
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Coverage Limits</label>
                  <input type="text" disabled={partyInfo.defUninsured} className={inputClass} value={partyInfo.defLimits} onChange={e => setPartyInfo({ ...partyInfo, defLimits: e.target.value })} placeholder="e.g. 25/50" />
                </div>
                <div className="col-span-3">
                  <label className={labelClass}>Claim #</label>
                  <input type="text" disabled={partyInfo.defUninsured} className={inputClass} value={partyInfo.defClaim} onChange={e => setPartyInfo({ ...partyInfo, defClaim: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Client Insurance</h4>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label className={labelClass}>Carrier</label>
                  <input type="text" className={inputClass} value={partyInfo.clientInsurance} onChange={e => setPartyInfo({ ...partyInfo, clientInsurance: e.target.value })} placeholder="Client's insurance" />
                </div>
                <div className="col-span-6">
                  <label className={labelClass}>Coverage Limits</label>
                  <input type="text" className={inputClass} value={partyInfo.clientLimits} onChange={e => setPartyInfo({ ...partyInfo, clientLimits: e.target.value })} placeholder="e.g. 50/100 UIM" />
                </div>
                <div className="col-span-6">
                  <label className={labelClass}>Policy Number</label>
                  <input type="text" className={inputClass} value={partyInfo.clientPolicy} onChange={e => setPartyInfo({ ...partyInfo, clientPolicy: e.target.value })} />
                </div>
                <div className="col-span-6">
                  <label className={labelClass}>Claim Number</label>
                  <input type="text" className={inputClass} value={partyInfo.clientClaim} onChange={e => setPartyInfo({ ...partyInfo, clientClaim: e.target.value })} />
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Other Party Insurance</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Provider</label>
                  <input type="text" className={inputClass} value={partyInfo.otherProvider} onChange={e => setPartyInfo({ ...partyInfo, otherProvider: e.target.value })} placeholder="Add'l Insurer" />
                </div>
                <div>
                  <label className={labelClass}>Policy/Claim</label>
                  <input type="text" className={inputClass} value={partyInfo.otherInsurance} onChange={e => setPartyInfo({ ...partyInfo, otherInsurance: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Limits</label>
                  <input type="text" className={inputClass} value={partyInfo.otherLimits} onChange={e => setPartyInfo({ ...partyInfo, otherLimits: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Medical Treatment</h4>
            <div>
              <label className={labelClass}>Treatment Status</label>
              <select className={inputClass} value={medicalInfo.status} onChange={e => setMedicalInfo({ ...medicalInfo, status: e.target.value })}>
                <option>Not Started</option>
                <option>Emergency Room</option>
                <option>Urgent Care</option>
                <option>Chiro/PT</option>
                <option>Ortho/Specialist</option>
                <option>Concluded</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Known Providers</label>
              <textarea className={inputClass + " h-32 resize-none"} placeholder="List names and locations of all medical providers seen..." value={medicalInfo.providers} onChange={e => setMedicalInfo({ ...medicalInfo, providers: e.target.value })} />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h4 className="font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Key Documents</h4>
            <div className="grid grid-cols-2 gap-4">
              {([
                { id: 'retainer', label: 'Signed Retainer' },
                { id: 'crash_report', label: 'Crash Report' },
                { id: 'authorization', label: 'HIPAA Auth' },
                { id: 'insurance_card', label: 'Insurance Card' },
                { id: 'photo', label: 'Scene/Injury Photos' }
              ] as { id: DocumentType; label: string }[]).map(type => (
                <div key={type.id} className="border border-dashed border-slate-300 bg-slate-50 rounded-xl p-4 hover:bg-slate-100 hover:border-slate-400 transition-all relative group text-center cursor-pointer">
                  <input type="file" accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => handleFileUpload(e, type.id)} />
                  <div className="flex flex-col items-center gap-2 pointer-events-none">
                    <div className="w-10 h-10 bg-white border border-slate-200 text-blue-600 rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-slate-700">{type.label}</span>
                  </div>
                </div>
              ))}
            </div>
            {documents.length > 0 && (
              <div className="mt-4 space-y-2">
                <h5 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Attached ({documents.length})</h5>
                {documents.map((doc, i) => (
                  <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 text-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${doc.mimeType?.includes('pdf') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="font-medium text-slate-900 truncate">{doc.fileName}</p>
                    </div>
                    <button onClick={() => removeDocument(i)} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-slate-50 px-0 py-5 border-t border-slate-100 flex justify-between mt-6 flex-shrink-0">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="px-6 py-2.5 text-slate-600 font-bold hover:text-slate-900 transition-colors hover:bg-slate-200 rounded-lg">
            Back
          </button>
        ) : <div />}

        <button
          onClick={() => step < 5 ? setStep(step + 1) : handleSubmit()}
          disabled={loading}
          className={`px-8 py-2.5 rounded-lg font-bold shadow-lg transition-all flex items-center ${
            loading
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : step < 5
              ? 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
              : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Case...
            </>
          ) : step < 5 ? (
            <>
              Next Step
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Intake
            </>
          )}
        </button>
      </div>
    </div>
  );
};
