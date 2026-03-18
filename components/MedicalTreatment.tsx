import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CaseFile, MedicalProvider, MedicalProviderType, DocumentAttachment, PreferredContactMethod } from '../types';
import { searchProviders, saveProviderToDirectory, DirectoryProvider } from '../services/medicalProviderService';
import { MedicalBillUpload, ExtractedBillEntry } from './MedicalBillUpload';
import { generateDocumentNameWithExt } from '../services/documentNamingService';

interface MedicalTreatmentProps {
  caseData: CaseFile;
  onUpdateCase: (updatedCase: CaseFile) => void;
}

const PROVIDER_TYPE_LABELS: Record<MedicalProviderType, string> = {
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

const PROVIDER_TYPE_COLORS: Record<MedicalProviderType, string> = {
  hospital: 'bg-red-50 text-red-700 border-red-200',
  er: 'bg-rose-50 text-rose-700 border-rose-200',
  urgent_care: 'bg-orange-50 text-orange-700 border-orange-200',
  chiropractor: 'bg-teal-50 text-teal-700 border-teal-200',
  physical_therapy: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  orthopedic: 'bg-blue-50 text-blue-700 border-blue-200',
  neurologist: 'bg-slate-100 text-slate-700 border-slate-200',
  pain_management: 'bg-amber-50 text-amber-700 border-amber-200',
  primary_care: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  imaging: 'bg-sky-50 text-sky-700 border-sky-200',
  surgery_center: 'bg-pink-50 text-pink-700 border-pink-200',
  other: 'bg-stone-50 text-stone-700 border-stone-200',
};

const CONTACT_METHOD_LABELS: Record<PreferredContactMethod, string> = {
  email: 'Email',
  fax: 'Fax',
  mail: 'Mail',
  phone: 'Phone',
};

const emptyProvider: Omit<MedicalProvider, 'id'> = {
  name: '',
  type: 'hospital',
  address: '',
  city: '',
  state: '',
  zip: '',
  phone: '',
  fax: '',
  email: '',
  contactPerson: '',
  totalCost: undefined,
  notes: '',
  dateOfFirstVisit: '',
  dateOfLastVisit: '',
  isCurrentlyTreating: false,
  preferredContactMethod: undefined,
};

function formatCurrency(val: number | undefined): string {
  if (val === undefined || val === null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

function directoryToForm(dp: DirectoryProvider): Omit<MedicalProvider, 'id'> {
  return {
    name: dp.name,
    type: dp.type,
    address: dp.address,
    city: dp.city,
    state: dp.state,
    zip: dp.zip,
    phone: dp.phone,
    fax: dp.fax,
    contactPerson: dp.contact_person,
    totalCost: undefined,
    notes: dp.notes,
    dateOfFirstVisit: '',
    dateOfLastVisit: '',
    isCurrentlyTreating: false,
  };
}

export const MedicalTreatment: React.FC<MedicalTreatmentProps> = ({ caseData, onUpdateCase }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<Omit<MedicalProvider, 'id'>>(emptyProvider);
  const [linkingDocProviderId, setLinkingDocProviderId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [showBillUpload, setShowBillUpload] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DirectoryProvider[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedFromDirectory, setSelectedFromDirectory] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const providers = caseData.medicalProviders || [];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setForm(prev => ({ ...prev, name: query }));
    setSelectedFromDirectory(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchProviders(query);
      setSearchResults(results);
      setShowSearchResults(results.length > 0);
      setSearching(false);
    }, 300);
  }, []);

  const handleSelectFromDirectory = (dp: DirectoryProvider) => {
    const populated = directoryToForm(dp);
    setForm(populated);
    setSearchQuery(dp.name);
    setShowSearchResults(false);
    setSelectedFromDirectory(true);
  };

  const getLinkedDocs = (providerId: string): DocumentAttachment[] => {
    return caseData.documents.filter(d => d.linkedFacilityId === providerId);
  };

  const totalMedicalCosts = providers.reduce((sum, p) => sum + (p.totalCost || 0), 0);

  const handleAdd = async () => {
    const newProvider: MedicalProvider = {
      ...form,
      id: `mp-${Date.now()}`,
    };
    const updated = {
      ...caseData,
      medicalProviders: [...providers, newProvider],
    };
    onUpdateCase(updated);

    saveProviderToDirectory({
      name: form.name,
      type: form.type,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      phone: form.phone,
      fax: form.fax,
      contact_person: form.contactPerson,
      notes: form.notes,
    });

    setForm(emptyProvider);
    setSearchQuery('');
    setSelectedFromDirectory(false);
    setShowAddForm(false);
    setExpandedId(newProvider.id);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const updated = {
      ...caseData,
      medicalProviders: providers.map(p =>
        p.id === editingId ? { ...form, id: editingId } : p
      ),
    };
    onUpdateCase(updated);

    saveProviderToDirectory({
      name: form.name,
      type: form.type,
      address: form.address,
      city: form.city,
      state: form.state,
      zip: form.zip,
      phone: form.phone,
      fax: form.fax,
      contact_person: form.contactPerson,
      notes: form.notes,
    });

    setEditingId(null);
    setForm(emptyProvider);
    setSearchQuery('');
    setSelectedFromDirectory(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Remove this medical provider?')) return;
    const newDocs = caseData.documents.map(d =>
      d.linkedFacilityId === id ? { ...d, linkedFacilityId: undefined } : d
    );
    const updated = {
      ...caseData,
      medicalProviders: providers.filter(p => p.id !== id),
      documents: newDocs,
    };
    onUpdateCase(updated);
    if (expandedId === id) setExpandedId(null);
  };

  const handleStartEdit = (provider: MedicalProvider) => {
    setEditingId(provider.id);
    const { id, ...rest } = provider;
    setForm(rest);
    setSearchQuery(rest.name);
    setSelectedFromDirectory(false);
    setShowAddForm(false);
  };

  const handleLinkDoc = (docIndex: number, providerId: string) => {
    const newDocs = [...caseData.documents];
    newDocs[docIndex] = { ...newDocs[docIndex], linkedFacilityId: providerId };
    onUpdateCase({ ...caseData, documents: newDocs });
    setLinkingDocProviderId(null);
  };

  const handleUnlinkDoc = (docIndex: number) => {
    const newDocs = [...caseData.documents];
    newDocs[docIndex] = { ...newDocs[docIndex], linkedFacilityId: undefined };
    onUpdateCase({ ...caseData, documents: newDocs });
  };

  const handleBillsExtracted = (entries: ExtractedBillEntry[]) => {
    const validTypes: MedicalProviderType[] = ['hospital', 'er', 'urgent_care', 'chiropractor', 'physical_therapy', 'orthopedic', 'neurologist', 'pain_management', 'primary_care', 'imaging', 'surgery_center', 'other'];

    let updatedProviders = [...providers];
    let updatedDocs = [...caseData.documents];
    let lastProviderId: string | null = null;

    for (let i = 0; i < entries.length; i++) {
      const { bill: data, fileData, fileName, mimeType } = entries[i];
      const providerType = (data.providerType && validTypes.includes(data.providerType)) ? data.providerType : 'other';

      const docTypeKey = data.documentTypeKey || 'medical_bill';
      const generatedName = generateDocumentNameWithExt({
        clientName: caseData.clientName || 'Unknown',
        dol: caseData.accidentDate || '',
        docType: docTypeKey,
        source: data.providerName?.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20),
        originalFileName: fileName,
      });

      const existingProvider = data.providerName
        ? updatedProviders.find(p => p.name.toLowerCase() === data.providerName!.toLowerCase())
        : null;

      const newDoc: DocumentAttachment = {
        type: 'medical_record',
        fileData,
        fileName: generatedName,
        mimeType,
        source: 'bill_upload',
        tags: ['medical_bill', data.billType || 'bill'].filter(Boolean),
        linkedFacilityId: existingProvider?.id,
        billAmount: data.totalCharges,
        documentTypeKey: docTypeKey,
      };

      if (existingProvider) {
        updatedProviders = updatedProviders.map(p => {
          if (p.id !== existingProvider.id) return p;
          const newTotalCost = (data.totalCharges != null)
            ? (p.totalCost || 0) + data.totalCharges
            : p.totalCost;
          return {
            ...p,
            totalCost: newTotalCost,
            dateOfFirstVisit: data.dateOfService && (!p.dateOfFirstVisit || data.dateOfService < p.dateOfFirstVisit)
              ? data.dateOfService : p.dateOfFirstVisit,
            dateOfLastVisit: data.dateOfService && (!p.dateOfLastVisit || data.dateOfService > p.dateOfLastVisit)
              ? data.dateOfService : p.dateOfLastVisit,
            phone: data.providerPhone || p.phone,
            fax: data.providerFax || p.fax,
            address: data.providerAddress || p.address,
            city: data.providerCity || p.city,
            state: data.providerState || p.state,
            zip: data.providerZip || p.zip,
          };
        });
        newDoc.linkedFacilityId = existingProvider.id;
        lastProviderId = existingProvider.id;
      } else {
        const newProvider: MedicalProvider = {
          id: `mp-${Date.now()}-${i}`,
          name: data.providerName || 'Unknown Provider',
          type: providerType,
          address: data.providerAddress,
          city: data.providerCity,
          state: data.providerState,
          zip: data.providerZip,
          phone: data.providerPhone,
          fax: data.providerFax,
          totalCost: data.totalCharges,
          dateOfFirstVisit: data.dateOfService,
          dateOfLastVisit: data.dateOfServiceEnd || data.dateOfService,
          notes: [
            data.billType ? `Bill type: ${data.billType}` : '',
            data.diagnosisCodes?.length ? `Dx: ${data.diagnosisCodes.join(', ')}` : '',
            data.notes || '',
          ].filter(Boolean).join('. '),
        };
        newDoc.linkedFacilityId = newProvider.id;
        updatedProviders.push(newProvider);
        lastProviderId = newProvider.id;

        if (data.providerName) {
          saveProviderToDirectory({
            name: newProvider.name,
            type: newProvider.type,
            address: newProvider.address,
            city: newProvider.city,
            state: newProvider.state,
            zip: newProvider.zip,
            phone: newProvider.phone,
            fax: newProvider.fax,
          });
        }
      }

      updatedDocs.push(newDoc);
    }

    onUpdateCase({
      ...caseData,
      medicalProviders: updatedProviders,
      documents: updatedDocs,
    });

    if (lastProviderId) setExpandedId(lastProviderId);
    setShowBillUpload(false);
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  const renderProviderForm = (isNew: boolean) => (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-slate-800">{isNew ? 'Add Medical Provider' : 'Edit Provider'}</h4>
        <button
          onClick={() => { isNew ? setShowAddForm(false) : setEditingId(null); setForm(emptyProvider); setSearchQuery(''); setSelectedFromDirectory(false); }}
          className="text-slate-400 hover:text-slate-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 relative" ref={searchRef}>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Facility Name</label>
          <div className="relative">
            <input
              className={inputClass}
              value={isNew ? searchQuery : form.name}
              onChange={e => {
                if (isNew) {
                  handleSearch(e.target.value);
                } else {
                  setForm({ ...form, name: e.target.value });
                }
              }}
              onFocus={() => { if (isNew && searchResults.length > 0) setShowSearchResults(true); }}
              placeholder="Start typing to search existing providers..."
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {isNew && showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Existing Providers</p>
              </div>
              {searchResults.map(dp => (
                <button
                  key={dp.id}
                  onClick={() => handleSelectFromDirectory(dp)}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-slate-900">{dp.name}</span>
                      <span className={`ml-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${PROVIDER_TYPE_COLORS[dp.type] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {PROVIDER_TYPE_LABELS[dp.type] || dp.type}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                  {(dp.address || dp.city || dp.phone) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {[dp.address, dp.city, dp.state].filter(Boolean).join(', ')}
                      {dp.phone ? ` - ${dp.phone}` : ''}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
          {isNew && selectedFromDirectory && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Auto-filled from provider directory
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Provider Type</label>
          <select className={inputClass} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as MedicalProviderType })}>
            {Object.entries(PROVIDER_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contact Person</label>
          <input className={inputClass} value={form.contactPerson || ''} onChange={e => setForm({ ...form, contactPerson: e.target.value })} placeholder="Dr. Smith" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Street Address</label>
        <input className={inputClass} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Medical Center Dr" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">City</label>
          <input className={inputClass} value={form.city || ''} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Chicago" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">State</label>
          <input className={inputClass} value={form.state || ''} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="IL" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ZIP</label>
          <input className={inputClass} value={form.zip || ''} onChange={e => setForm({ ...form, zip: e.target.value })} placeholder="60611" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone</label>
          <input className={inputClass} value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(312) 555-0000" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fax</label>
          <input className={inputClass} value={form.fax || ''} onChange={e => setForm({ ...form, fax: e.target.value })} placeholder="(312) 555-0001" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
          <input className={inputClass} value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="records@hospital.com" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Preferred Contact Method</label>
          <select className={inputClass} value={form.preferredContactMethod || ''} onChange={e => setForm({ ...form, preferredContactMethod: (e.target.value || undefined) as PreferredContactMethod | undefined })}>
            <option value="">Not specified</option>
            {Object.entries(CONTACT_METHOD_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">First Visit</label>
          <input type="date" className={inputClass} value={form.dateOfFirstVisit || ''} onChange={e => setForm({ ...form, dateOfFirstVisit: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Last Visit</label>
          <input type="date" className={inputClass} value={form.dateOfLastVisit || ''} onChange={e => setForm({ ...form, dateOfLastVisit: e.target.value })} />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Total Cost ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={inputClass}
            value={form.totalCost ?? ''}
            onChange={e => setForm({ ...form, totalCost: e.target.value ? parseFloat(e.target.value) : undefined })}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            checked={form.isCurrentlyTreating || false}
            onChange={e => setForm({ ...form, isCurrentlyTreating: e.target.checked })}
          />
          <span className="text-sm text-slate-700 font-medium">Currently treating</span>
        </label>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notes</label>
        <textarea className={inputClass + ' h-20 resize-none'} value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Treatment details, diagnosis, etc." />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => { isNew ? setShowAddForm(false) : setEditingId(null); setForm(emptyProvider); setSearchQuery(''); setSelectedFromDirectory(false); }}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={isNew ? handleAdd : handleSaveEdit}
          disabled={!form.name.trim()}
          className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isNew ? 'Add Provider' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Providers</div>
          <div className="text-2xl font-bold text-slate-900">{providers.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Medical Costs</div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalMedicalCosts) || '$0.00'}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Currently Treating</div>
          <div className="text-2xl font-bold text-slate-900">{providers.filter(p => p.isCurrentlyTreating).length}</div>
        </div>
      </div>

      {showBillUpload && (
        <MedicalBillUpload
          onBillsExtracted={handleBillsExtracted}
          onClose={() => setShowBillUpload(false)}
        />
      )}

      {editingId ? (
        renderProviderForm(false)
      ) : showAddForm ? (
        renderProviderForm(true)
      ) : (
        <div className="flex gap-3">
          <button
            onClick={() => { setForm(emptyProvider); setSearchQuery(''); setSelectedFromDirectory(false); setShowAddForm(true); }}
            className="flex-1 py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
          >
            + Add Medical Provider
          </button>
          {!showBillUpload && (
            <button
              onClick={() => setShowBillUpload(true)}
              className="flex items-center gap-2 px-5 py-3 border-2 border-dashed border-emerald-200 rounded-xl text-sm font-bold text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Bill
            </button>
          )}
        </div>
      )}

      {providers.length === 0 && !showAddForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Medical Providers</h3>
          <p className="text-sm text-slate-500">Add medical facilities and treatment providers for this case.</p>
        </div>
      )}

      <div className="space-y-4">
        {providers.map(provider => {
          const linkedDocs = getLinkedDocs(provider.id);
          const isExpanded = expandedId === provider.id;
          const isEditing = editingId === provider.id;
          if (isEditing) return null;

          return (
            <div key={provider.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all">
              <div
                className="px-6 py-5 flex items-start justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : provider.id)}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${PROVIDER_TYPE_COLORS[provider.type]}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-base">{provider.name}</h4>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${PROVIDER_TYPE_COLORS[provider.type]}`}>
                        {PROVIDER_TYPE_LABELS[provider.type]}
                      </span>
                      {provider.isCurrentlyTreating && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      {provider.phone && <span>{provider.phone}</span>}
                      {provider.phone && provider.address && <span className="text-slate-300">|</span>}
                      {provider.address && <span className="truncate">{provider.address}{provider.city ? `, ${provider.city}` : ''}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{provider.totalCost ? formatCurrency(provider.totalCost) : '--'}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total Cost</div>
                  </div>
                  {linkedDocs.length > 0 && (
                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-full border border-blue-200">
                      {linkedDocs.length} doc{linkedDocs.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  <svg className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 animate-fade-in">
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Facility Details</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Address</span>
                          <span className="text-sm font-medium text-slate-900 text-right">
                            {[provider.address, provider.city, provider.state, provider.zip].filter(Boolean).join(', ') || '--'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Phone</span>
                          <span className="text-sm font-medium text-slate-900">{provider.phone || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Fax</span>
                          <span className="text-sm font-medium text-slate-900">{provider.fax || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Email</span>
                          <span className="text-sm font-medium text-slate-900">{provider.email || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Contact</span>
                          <span className="text-sm font-medium text-slate-900">{provider.contactPerson || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Preferred Method</span>
                          <span className={`text-sm font-bold ${provider.preferredContactMethod ? 'text-blue-600' : 'text-slate-400'}`}>
                            {provider.preferredContactMethod ? CONTACT_METHOD_LABELS[provider.preferredContactMethod] : '--'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Treatment Info</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">First Visit</span>
                          <span className="text-sm font-medium text-slate-900">{provider.dateOfFirstVisit || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Last Visit</span>
                          <span className="text-sm font-medium text-slate-900">{provider.dateOfLastVisit || '--'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Status</span>
                          <span className={`text-sm font-bold ${provider.isCurrentlyTreating ? 'text-green-600' : 'text-slate-500'}`}>
                            {provider.isCurrentlyTreating ? 'Currently Treating' : 'Discharged / Inactive'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Total Cost</span>
                          <span className="text-sm font-bold text-slate-900">{provider.totalCost ? formatCurrency(provider.totalCost) : '--'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {provider.notes && (
                    <div className="px-6 pb-4">
                      <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-100">{provider.notes}</div>
                    </div>
                  )}

                  <div className="px-6 pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Tagged Documents ({linkedDocs.length})
                      </h5>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLinkingDocProviderId(linkingDocProviderId === provider.id ? null : provider.id); }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Tag Document
                      </button>
                    </div>

                    {linkingDocProviderId === provider.id && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3 animate-fade-in">
                        <p className="text-xs font-bold text-blue-700 mb-2">Select a document to tag to this facility:</p>
                        {caseData.documents.length > 0 ? (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {caseData.documents.map((doc, idx) => {
                              const alreadyLinked = doc.linkedFacilityId === provider.id;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handleLinkDoc(idx, provider.id)}
                                  disabled={alreadyLinked}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                                    alreadyLinked
                                      ? 'bg-blue-100 text-blue-400 cursor-not-allowed'
                                      : doc.linkedFacilityId
                                        ? 'bg-white text-slate-500 hover:bg-blue-100 border border-slate-200'
                                        : 'bg-white text-slate-800 hover:bg-blue-100 border border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    <span className="truncate">{doc.fileName}</span>
                                  </div>
                                  {alreadyLinked && <span className="text-[10px] font-bold">LINKED</span>}
                                  {!alreadyLinked && doc.linkedFacilityId && (
                                    <span className="text-[10px] text-slate-400">Linked elsewhere</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-blue-600">No documents available. Upload documents in the Documents tab first.</p>
                        )}
                      </div>
                    )}

                    {linkedDocs.length > 0 ? (
                      <div className="space-y-2">
                        {linkedDocs.map((doc) => {
                          const docIdx = caseData.documents.findIndex(d => d === doc);
                          return (
                            <div key={docIdx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-slate-200 transition-colors">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.mimeType?.includes('pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-800 truncate">{doc.fileName}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] text-slate-400">{doc.documentTypeKey ? (doc.documentTypeKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())) : doc.type}{doc.source ? ` - ${doc.source}` : ''}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                                {doc.billAmount != null && (
                                  <span className="text-sm font-bold text-slate-900">{formatCurrency(doc.billAmount)}</span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleUnlinkDoc(docIdx); }}
                                  className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Unlink from this facility"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        {linkedDocs.some(d => d.billAmount != null) && linkedDocs.length > 1 && (
                          <div className="flex justify-end px-3 py-1.5">
                            <span className="text-xs font-bold text-slate-500">
                              Docs Total: {formatCurrency(linkedDocs.reduce((sum, d) => sum + (d.billAmount || 0), 0))}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-sm text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No documents tagged to this facility
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(provider); }}
                      className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(provider.id); }}
                      className="px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors shadow-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
