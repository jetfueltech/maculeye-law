import React, { useState, useEffect } from 'react';
import { MedicalProviderType } from '../types';
import {
  DirectoryProvider,
  getAllProviders,
  saveProviderToDirectory,
  updateProviderInDirectory,
  deleteProviderFromDirectory,
} from '../services/medicalProviderService';

const TYPE_LABELS: Record<MedicalProviderType, string> = {
  hospital: 'Hospital', er: 'Emergency Room', urgent_care: 'Urgent Care',
  chiropractor: 'Chiropractor', physical_therapy: 'Physical Therapy',
  orthopedic: 'Orthopedic', neurologist: 'Neurologist',
  pain_management: 'Pain Management', primary_care: 'Primary Care',
  imaging: 'Imaging Center', surgery_center: 'Surgery Center', other: 'Other',
};

const TYPE_COLORS: Record<string, string> = {
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

interface FormData {
  name: string;
  type: MedicalProviderType;
  address: string;
  city: string;
  state: string;
  zip: string;
  mailing_address: string;
  mailing_city: string;
  mailing_state: string;
  mailing_zip: string;
  phone: string;
  fax: string;
  contact_person: string;
  notes: string;
}

const emptyForm: FormData = {
  name: '', type: 'hospital', address: '', city: '', state: '',
  zip: '', mailing_address: '', mailing_city: '', mailing_state: '', mailing_zip: '',
  phone: '', fax: '', contact_person: '', notes: '',
};

export const DirectoryProviders: React.FC = () => {
  const [providers, setProviders] = useState<DirectoryProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const data = await getAllProviders();
    setProviders(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = providers.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.city.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || p.type === filterType;
    return matchSearch && matchType;
  });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editingId) {
      await updateProviderInDirectory(editingId, form);
    } else {
      await saveProviderToDirectory(form);
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const handleEdit = (p: DirectoryProvider) => {
    setEditingId(p.id);
    setForm({
      name: p.name, type: p.type, address: p.address, city: p.city,
      state: p.state, zip: p.zip, mailing_address: p.mailing_address,
      mailing_city: p.mailing_city, mailing_state: p.mailing_state,
      mailing_zip: p.mailing_zip, phone: p.phone, fax: p.fax,
      contact_person: p.contact_person, notes: p.notes,
    });
    setShowForm(true);
    setExpandedId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this provider from the directory? This will not affect cases already using it.')) return;
    await deleteProviderFromDirectory(id);
    load();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Search providers by name or city..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Provider
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800">{editingId ? 'Edit Provider' : 'New Provider'}</h4>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Facility Name</label>
              <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Northwestern Memorial Hospital" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
              <select className={inputClass} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as MedicalProviderType })}>
                {Object.entries(TYPE_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Contact Person</label>
              <input className={inputClass} value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="Dr. Smith" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Address</label>
            <input className={inputClass} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Medical Center Dr" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">City</label>
              <input className={inputClass} value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">State</label>
              <input className={inputClass} value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ZIP</label>
              <input className={inputClass} value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mailing Address</label>
            <input className={inputClass} value={form.mailing_address} onChange={e => setForm({ ...form, mailing_address: e.target.value })} placeholder="P.O. Box or mailing address" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mailing City</label>
              <input className={inputClass} value={form.mailing_city} onChange={e => setForm({ ...form, mailing_city: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mailing State</label>
              <input className={inputClass} value={form.mailing_state} onChange={e => setForm({ ...form, mailing_state: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mailing ZIP</label>
              <input className={inputClass} value={form.mailing_zip} onChange={e => setForm({ ...form, mailing_zip: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone</label>
              <input className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(312) 555-0000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fax</label>
              <input className={inputClass} value={form.fax} onChange={e => setForm({ ...form, fax: e.target.value })} placeholder="(312) 555-0001" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notes</label>
            <textarea className={inputClass + ' h-16 resize-none'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={!form.name.trim() || saving} className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-40 transition-all">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Provider'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">{search || filterType !== 'all' ? 'No matching providers' : 'No Providers Yet'}</h3>
          <p className="text-sm text-slate-500">{search || filterType !== 'all' ? 'Try adjusting your search or filter.' : 'Add medical providers to build your directory.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{filtered.length} provider{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map(p => (
              <div key={p.id}>
                <div
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${TYPE_COLORS[p.type] || TYPE_COLORS.other}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">{p.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${TYPE_COLORS[p.type] || TYPE_COLORS.other}`}>
                          {TYPE_LABELS[p.type as MedicalProviderType] || p.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {[p.address, p.city, p.state].filter(Boolean).join(', ') || 'No address'}
                        {p.phone ? ` - ${p.phone}` : ''}
                      </p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === p.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
                {expandedId === p.id && (
                  <div className="px-6 pb-4 bg-slate-50/50 border-t border-slate-100 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Phone</span><span className="text-sm text-slate-800">{p.phone || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Fax</span><span className="text-sm text-slate-800">{p.fax || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Contact</span><span className="text-sm text-slate-800">{p.contact_person || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Address</span><span className="text-sm text-slate-800">{[p.address, p.city, p.state, p.zip].filter(Boolean).join(', ') || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Mailing Address</span><span className="text-sm text-slate-800">{[p.mailing_address, p.mailing_city, p.mailing_state, p.mailing_zip].filter(Boolean).join(', ') || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Notes</span><span className="text-sm text-slate-800">{p.notes || '--'}</span></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => handleEdit(p)} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">Delete</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
