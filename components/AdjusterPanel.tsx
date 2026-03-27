import React, { useState, useRef, useEffect } from 'react';
import { Adjuster } from '../types';

interface AdjusterPanelProps {
  adjusters: Adjuster[];
  insuranceEntries?: { type: string; provider: string }[];
  onChange: (adjusters: Adjuster[]) => void;
}

const emptyForm = { name: '', email: '', phone: '', insuranceType: '' as const, insuranceProvider: '' };

export const AdjusterPanel: React.FC<AdjusterPanelProps> = ({ adjusters, insuranceEntries = [], onChange }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showForm && formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showForm]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    const isFirst = adjusters.length === 0;

    if (editingId) {
      onChange(adjusters.map(a => a.id === editingId ? {
        ...a,
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        insuranceType: (form.insuranceType as Adjuster['insuranceType']) || undefined,
        insuranceProvider: form.insuranceProvider.trim() || undefined,
      } : a));
    } else {
      const newAdj: Adjuster = {
        id: crypto.randomUUID(),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        isPrimary: isFirst,
        insuranceType: (form.insuranceType as Adjuster['insuranceType']) || undefined,
        insuranceProvider: form.insuranceProvider.trim() || undefined,
        addedDate: new Date().toISOString(),
      };
      onChange([...adjusters, newAdj]);
    }
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (adj: Adjuster) => {
    setEditingId(adj.id);
    setForm({
      name: adj.name,
      email: adj.email || '',
      phone: adj.phone || '',
      insuranceType: adj.insuranceType || '',
      insuranceProvider: adj.insuranceProvider || '',
    });
    setShowForm(true);
  };

  const handleRemove = (id: string) => {
    const updated = adjusters.filter(a => a.id !== id);
    if (updated.length > 0 && !updated.some(a => a.isPrimary)) {
      updated[0].isPrimary = true;
    }
    onChange(updated);
  };

  const handleSetPrimary = (id: string) => {
    onChange(adjusters.map(a => ({ ...a, isPrimary: a.id === id })));
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Insurance Adjusters</h3>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(!showForm); }}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Adjuster
        </button>
      </div>

      {adjusters.length === 0 && !showForm && (
        <div className="flex items-center gap-2 py-1">
          <span className="w-6 h-6 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </span>
          <span className="text-xs text-slate-400">No adjusters added</span>
        </div>
      )}

      {adjusters.length > 0 && (
        <div className="space-y-1.5">
          {adjusters.map(adj => (
            <div key={adj.id} className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 group transition-colors border border-transparent hover:border-slate-100">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-800">{adj.name}</span>
                  {adj.isPrimary && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200">PRIMARY</span>
                  )}
                  {adj.insuranceProvider && (
                    <span className="text-[10px] text-slate-400">{adj.insuranceType ? `${adj.insuranceType} - ` : ''}{adj.insuranceProvider}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {adj.email && (
                    <a href={`mailto:${adj.email}`} className="text-xs text-blue-600 hover:underline truncate">{adj.email}</a>
                  )}
                  {adj.phone && (
                    <a href={`tel:${adj.phone}`} className="text-xs text-slate-500 hover:text-blue-600">{adj.phone}</a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {!adj.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(adj.id)}
                    className="text-[10px] text-slate-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                    title="Set as primary"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  onClick={() => handleEdit(adj)}
                  className="p-1 text-slate-300 hover:text-slate-600 transition-colors"
                  title="Edit"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button
                  onClick={() => handleRemove(adj.id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                  title="Remove"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div ref={formRef} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase">{editingId ? 'Edit Adjuster' : 'New Adjuster'}</span>
            <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Name *</label>
            <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email</label>
              <input className={inputClass} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="adjuster@insurance.com" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Phone</label>
              <input className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
          </div>
          {insuranceEntries.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Insurance Company</label>
              <select
                className={inputClass}
                value={form.insuranceProvider ? `${form.insuranceType}|${form.insuranceProvider}` : ''}
                onChange={e => {
                  if (!e.target.value) {
                    setForm({ ...form, insuranceType: '', insuranceProvider: '' });
                  } else {
                    const [type, ...rest] = e.target.value.split('|');
                    setForm({ ...form, insuranceType: type, insuranceProvider: rest.join('|') });
                  }
                }}
              >
                <option value="">Not assigned</option>
                {insuranceEntries.map((ins, i) => (
                  <option key={i} value={`${ins.type}|${ins.provider}`}>
                    {ins.type} - {ins.provider}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-all"
            >
              {editingId ? 'Save Changes' : 'Add Adjuster'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
