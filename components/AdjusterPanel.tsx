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

  const inputClass = "w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-700">Insurance Adjusters</h3>
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
          <span className="w-6 h-6 rounded-full border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </span>
          <span className="text-xs text-stone-400">No adjusters added</span>
        </div>
      )}

      {adjusters.length > 0 && (
        <div className="space-y-1.5">
          {adjusters.map(adj => (
            <div key={adj.id} className="px-3 py-2.5 rounded-lg hover:bg-stone-50 group transition-colors border border-transparent hover:border-stone-100">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base font-bold text-stone-900 truncate">{adj.name}</span>
                  {adj.isPrimary && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-200 flex-shrink-0">PRIMARY</span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {!adj.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(adj.id)}
                      className="text-[10px] text-stone-400 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors whitespace-nowrap"
                      title="Set as primary"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(adj)}
                    className="p-1 text-stone-300 hover:text-stone-600 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={() => handleRemove(adj.id)}
                    className="p-1 text-stone-300 hover:text-red-500 transition-colors"
                    title="Remove"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
              {adj.insuranceProvider && (
                <p className="text-[11px] text-stone-400 mb-1">{adj.insuranceType ? `${adj.insuranceType} - ` : ''}{adj.insuranceProvider}</p>
              )}
              <div className="flex items-center gap-4 mt-1">
                {adj.phone && (
                  <a href={`tel:${adj.phone}`} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-blue-600 hover:underline transition-colors whitespace-nowrap">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-60" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    {adj.phone}
                  </a>
                )}
                {adj.email && (
                  <a href={`mailto:${adj.email}`} className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-blue-600 hover:underline truncate transition-colors">
                    <svg className="w-3.5 h-3.5 flex-shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="truncate">{adj.email}</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div ref={formRef} className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500 uppercase">{editingId ? 'Edit Adjuster' : 'New Adjuster'}</span>
            <button onClick={handleCancel} className="text-stone-400 hover:text-stone-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Name *</label>
            <input className={inputClass} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Email</label>
              <input className={inputClass} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="adjuster@insurance.com" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Phone</label>
              <input className={inputClass} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" />
            </div>
          </div>
          {insuranceEntries.length > 0 && (
            <div>
              <label className="block text-[11px] font-bold text-stone-400 uppercase mb-1">Insurance Company</label>
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
            <button onClick={handleCancel} className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors">Cancel</button>
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
