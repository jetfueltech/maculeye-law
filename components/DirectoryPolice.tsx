import React, { useState, useEffect } from 'react';
import {
  DirectoryPoliceDepartment,
  PoliceDepartmentJurisdiction,
  getAllPoliceDepartments,
  savePoliceDepartment,
  updatePoliceDepartment,
  deletePoliceDepartment,
} from '../services/policeDepartmentService';

const JURISDICTION_LABELS: Record<PoliceDepartmentJurisdiction, string> = {
  city: 'City', county: 'County', state: 'State', federal: 'Federal',
  university: 'University', other: 'Other',
};

const JURISDICTION_COLORS: Record<string, string> = {
  city: 'bg-blue-50 text-blue-700 border-blue-200',
  county: 'bg-amber-50 text-amber-700 border-amber-200',
  state: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  federal: 'bg-slate-100 text-slate-700 border-slate-300',
  university: 'bg-teal-50 text-teal-700 border-teal-200',
  other: 'bg-slate-100 text-slate-600 border-slate-200',
};

interface FormData {
  name: string;
  jurisdiction: PoliceDepartmentJurisdiction;
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
  records_phone: string;
  records_email: string;
  website: string;
  notes: string;
}

const emptyForm: FormData = {
  name: '', jurisdiction: 'city', address: '', city: '', state: '', zip: '',
  mailing_address: '', mailing_city: '', mailing_state: '', mailing_zip: '',
  phone: '', fax: '', records_phone: '', records_email: '', website: '', notes: '',
};

export const DirectoryPolice: React.FC = () => {
  const [departments, setDepartments] = useState<DirectoryPoliceDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterJurisdiction, setFilterJurisdiction] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const data = await getAllPoliceDepartments();
    setDepartments(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = departments.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.city.toLowerCase().includes(search.toLowerCase());
    const matchJurisdiction = filterJurisdiction === 'all' || d.jurisdiction === filterJurisdiction;
    return matchSearch && matchJurisdiction;
  });

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editingId) {
      await updatePoliceDepartment(editingId, form);
    } else {
      await savePoliceDepartment(form);
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const handleEdit = (d: DirectoryPoliceDepartment) => {
    setEditingId(d.id);
    setForm({
      name: d.name, jurisdiction: d.jurisdiction, address: d.address, city: d.city,
      state: d.state, zip: d.zip, mailing_address: d.mailing_address,
      mailing_city: d.mailing_city, mailing_state: d.mailing_state,
      mailing_zip: d.mailing_zip, phone: d.phone, fax: d.fax,
      records_phone: d.records_phone, records_email: d.records_email,
      website: d.website, notes: d.notes,
    });
    setShowForm(true);
    setExpandedId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this police department from the directory?')) return;
    await deletePoliceDepartment(id);
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
          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Search police departments..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={filterJurisdiction}
          onChange={e => setFilterJurisdiction(e.target.value)}
        >
          <option value="all">All Jurisdictions</option>
          {Object.entries(JURISDICTION_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Department
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800">{editingId ? 'Edit Police Department' : 'New Police Department'}</h4>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Department Name</label>
              <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Springfield Police Department" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Jurisdiction</label>
              <select className={inputClass} value={form.jurisdiction} onChange={e => setForm({ ...form, jurisdiction: e.target.value as PoliceDepartmentJurisdiction })}>
                {Object.entries(JURISDICTION_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Website</label>
              <input className={inputClass} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Address</label>
            <input className={inputClass} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Main St" />
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
            <input className={inputClass} value={form.mailing_address} onChange={e => setForm({ ...form, mailing_address: e.target.value })} placeholder="P.O. Box or mailing address (if different)" />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Main Phone</label>
              <input className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 555-0000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Records Division Phone</label>
              <input className={inputClass} value={form.records_phone} onChange={e => setForm({ ...form, records_phone: e.target.value })} placeholder="(555) 555-0001" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fax</label>
              <input className={inputClass} value={form.fax} onChange={e => setForm({ ...form, fax: e.target.value })} placeholder="(555) 555-0002" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Records Email</label>
            <input type="email" className={inputClass} value={form.records_email} onChange={e => setForm({ ...form, records_email: e.target.value })} placeholder="records@pd.gov" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notes</label>
            <textarea className={inputClass + ' h-16 resize-none'} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Report request process, fees, turnaround time, etc." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={!form.name.trim() || saving} className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-40 transition-all">
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Department'}
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
            <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">
            {search || filterJurisdiction !== 'all' ? 'No matching departments' : 'No Police Departments Yet'}
          </h3>
          <p className="text-sm text-slate-500">
            {search || filterJurisdiction !== 'all' ? 'Try adjusting your search or filter.' : 'Add police departments to build your directory.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {filtered.length} department{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {filtered.map(d => (
              <div key={d.id}>
                <div
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${JURISDICTION_COLORS[d.jurisdiction] || JURISDICTION_COLORS.other}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">{d.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${JURISDICTION_COLORS[d.jurisdiction] || JURISDICTION_COLORS.other}`}>
                          {JURISDICTION_LABELS[d.jurisdiction as PoliceDepartmentJurisdiction] || d.jurisdiction}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {d.phone ? d.phone : 'No phone'}
                        {d.records_phone ? ` | Records: ${d.records_phone}` : ''}
                        {d.city ? ` — ${d.city}${d.state ? `, ${d.state}` : ''}` : ''}
                      </p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-slate-400 transition-transform ${expandedId === d.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                {expandedId === d.id && (
                  <div className="px-6 pb-4 bg-slate-50/50 border-t border-slate-100 animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Main Phone</span><span className="text-sm text-slate-800">{d.phone || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Records Phone</span><span className="text-sm text-slate-800">{d.records_phone || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Fax</span><span className="text-sm text-slate-800">{d.fax || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Records Email</span><span className="text-sm text-slate-800">{d.records_email || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Address</span><span className="text-sm text-slate-800">{[d.address, d.city, d.state, d.zip].filter(Boolean).join(', ') || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Mailing Address</span><span className="text-sm text-slate-800">{[d.mailing_address, d.mailing_city, d.mailing_state, d.mailing_zip].filter(Boolean).join(', ') || '--'}</span></div>
                      <div><span className="text-[11px] font-bold text-slate-400 uppercase block">Website</span><span className="text-sm text-slate-800">{d.website || '--'}</span></div>
                      <div className="md:col-span-2"><span className="text-[11px] font-bold text-slate-400 uppercase block">Notes</span><span className="text-sm text-slate-800">{d.notes || '--'}</span></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => handleEdit(d)} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Edit</button>
                      <button onClick={() => handleDelete(d.id)} className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors">Delete</button>
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
