import React, { useState, useEffect } from 'react';
import {
  DirectoryPhone, DirectoryFax, DirectoryAddress,
  getPhones, addPhone, updatePhone, deletePhone,
  getFaxes, addFax, updateFax, deleteFax,
  getAddresses, addAddress, updateAddress, deleteAddress,
} from '../services/directoryContactService';

interface MultiContactEditorProps {
  directoryType: 'provider' | 'insurance';
  directoryId: string;
}

const inputClass = "w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
const labelClass = "block text-[10px] font-bold text-stone-400 uppercase mb-0.5";
const addBtnClass = "flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors";

export const MultiContactEditor: React.FC<MultiContactEditorProps> = ({ directoryType, directoryId }) => {
  const [phones, setPhones] = useState<DirectoryPhone[]>([]);
  const [faxes, setFaxes] = useState<DirectoryFax[]>([]);
  const [addresses, setAddresses] = useState<DirectoryAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingPhone, setEditingPhone] = useState<{ id?: string; label: string; phone_number: string } | null>(null);
  const [editingFax, setEditingFax] = useState<{ id?: string; label: string; fax_number: string } | null>(null);
  const [editingAddr, setEditingAddr] = useState<{ id?: string; label: string; address: string; city: string; state: string; zip: string } | null>(null);

  useEffect(() => {
    if (!directoryId) return;
    loadAll();
  }, [directoryId]);

  const loadAll = async () => {
    setLoading(true);
    const [p, f, a] = await Promise.all([
      getPhones(directoryType, directoryId),
      getFaxes(directoryType, directoryId),
      getAddresses(directoryType, directoryId),
    ]);
    setPhones(p);
    setFaxes(f);
    setAddresses(a);
    setLoading(false);
  };

  const handleSavePhone = async () => {
    if (!editingPhone?.phone_number.trim()) return;
    if (editingPhone.id) {
      await updatePhone(editingPhone.id, { label: editingPhone.label, phone_number: editingPhone.phone_number });
    } else {
      await addPhone({ directory_type: directoryType, directory_id: directoryId, label: editingPhone.label || 'Main', phone_number: editingPhone.phone_number });
    }
    setEditingPhone(null);
    loadAll();
  };

  const handleSaveFax = async () => {
    if (!editingFax?.fax_number.trim()) return;
    if (editingFax.id) {
      await updateFax(editingFax.id, { label: editingFax.label, fax_number: editingFax.fax_number });
    } else {
      await addFax({ directory_type: directoryType, directory_id: directoryId, label: editingFax.label || 'Main', fax_number: editingFax.fax_number });
    }
    setEditingFax(null);
    loadAll();
  };

  const handleSaveAddr = async () => {
    if (!editingAddr?.address.trim()) return;
    if (editingAddr.id) {
      await updateAddress(editingAddr.id, { label: editingAddr.label, address: editingAddr.address, city: editingAddr.city, state: editingAddr.state, zip: editingAddr.zip });
    } else {
      await addAddress({ directory_type: directoryType, directory_id: directoryId, label: editingAddr.label || 'Main Office', address: editingAddr.address, city: editingAddr.city, state: editingAddr.state, zip: editingAddr.zip });
    }
    setEditingAddr(null);
    loadAll();
  };

  if (loading) return <div className="text-xs text-stone-400 py-2">Loading contacts...</div>;

  return (
    <div className="space-y-4 pt-3 border-t border-stone-100 mt-3">
      <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Additional Contact Information</div>

      {/* Phones */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-stone-400 uppercase">Phone Numbers</span>
          <button onClick={() => setEditingPhone({ label: 'Main', phone_number: '' })} className={addBtnClass}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add
          </button>
        </div>
        {phones.length === 0 && !editingPhone && <span className="text-xs text-stone-300">None added</span>}
        {phones.map(p => (
          <div key={p.id} className="flex items-center gap-2 py-1 group">
            <span className="text-[10px] font-semibold text-stone-400 uppercase w-16 flex-shrink-0">{p.label}</span>
            <span className="text-sm text-stone-800 flex-1">{p.phone_number}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingPhone({ id: p.id, label: p.label, phone_number: p.phone_number })} className="text-stone-300 hover:text-stone-600 p-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button onClick={async () => { await deletePhone(p.id); loadAll(); }} className="text-stone-300 hover:text-red-500 p-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}
        {editingPhone && (
          <div className="flex items-end gap-2 bg-stone-50 rounded-lg p-2 mt-1 animate-fade-in">
            <div className="w-24">
              <label className={labelClass}>Label</label>
              <input className={inputClass} value={editingPhone.label} onChange={e => setEditingPhone({ ...editingPhone, label: e.target.value })} placeholder="Main" />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Number</label>
              <input className={inputClass} value={editingPhone.phone_number} onChange={e => setEditingPhone({ ...editingPhone, phone_number: e.target.value })} placeholder="(555) 123-4567" autoFocus />
            </div>
            <button onClick={handleSavePhone} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            <button onClick={() => setEditingPhone(null)} className="px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-100 rounded-lg">Cancel</button>
          </div>
        )}
      </div>

      {/* Faxes */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-stone-400 uppercase">Fax Numbers</span>
          <button onClick={() => setEditingFax({ label: 'Main', fax_number: '' })} className={addBtnClass}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add
          </button>
        </div>
        {faxes.length === 0 && !editingFax && <span className="text-xs text-stone-300">None added</span>}
        {faxes.map(f => (
          <div key={f.id} className="flex items-center gap-2 py-1 group">
            <span className="text-[10px] font-semibold text-stone-400 uppercase w-16 flex-shrink-0">{f.label}</span>
            <span className="text-sm text-stone-800 flex-1">{f.fax_number}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingFax({ id: f.id, label: f.label, fax_number: f.fax_number })} className="text-stone-300 hover:text-stone-600 p-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button onClick={async () => { await deleteFax(f.id); loadAll(); }} className="text-stone-300 hover:text-red-500 p-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}
        {editingFax && (
          <div className="flex items-end gap-2 bg-stone-50 rounded-lg p-2 mt-1 animate-fade-in">
            <div className="w-24">
              <label className={labelClass}>Label</label>
              <input className={inputClass} value={editingFax.label} onChange={e => setEditingFax({ ...editingFax, label: e.target.value })} placeholder="Main" />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Number</label>
              <input className={inputClass} value={editingFax.fax_number} onChange={e => setEditingFax({ ...editingFax, fax_number: e.target.value })} placeholder="(555) 123-4567" autoFocus />
            </div>
            <button onClick={handleSaveFax} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            <button onClick={() => setEditingFax(null)} className="px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-100 rounded-lg">Cancel</button>
          </div>
        )}
      </div>

      {/* Addresses */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-stone-400 uppercase">Addresses</span>
          <button onClick={() => setEditingAddr({ label: 'Main Office', address: '', city: '', state: '', zip: '' })} className={addBtnClass}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add
          </button>
        </div>
        {addresses.length === 0 && !editingAddr && <span className="text-xs text-stone-300">None added</span>}
        {addresses.map(a => (
          <div key={a.id} className="flex items-center gap-2 py-1.5 group">
            <span className="text-[10px] font-semibold text-stone-400 uppercase w-16 flex-shrink-0">{a.label}</span>
            <span className="text-sm text-stone-800 flex-1">{[a.address, a.city, a.state, a.zip].filter(Boolean).join(', ')}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditingAddr({ id: a.id, label: a.label, address: a.address, city: a.city, state: a.state, zip: a.zip })} className="text-stone-300 hover:text-stone-600 p-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
              <button onClick={async () => { await deleteAddress(a.id); loadAll(); }} className="text-stone-300 hover:text-red-500 p-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}
        {editingAddr && (
          <div className="bg-stone-50 rounded-lg p-2 mt-1 space-y-2 animate-fade-in">
            <div className="flex gap-2">
              <div className="w-28">
                <label className={labelClass}>Label</label>
                <input className={inputClass} value={editingAddr.label} onChange={e => setEditingAddr({ ...editingAddr, label: e.target.value })} placeholder="Main Office" />
              </div>
              <div className="flex-1">
                <label className={labelClass}>Street Address</label>
                <input className={inputClass} value={editingAddr.address} onChange={e => setEditingAddr({ ...editingAddr, address: e.target.value })} placeholder="123 Main St" autoFocus />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={labelClass}>City</label>
                <input className={inputClass} value={editingAddr.city} onChange={e => setEditingAddr({ ...editingAddr, city: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input className={inputClass} value={editingAddr.state} onChange={e => setEditingAddr({ ...editingAddr, state: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input className={inputClass} value={editingAddr.zip} onChange={e => setEditingAddr({ ...editingAddr, zip: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingAddr(null)} className="px-2 py-1.5 text-xs text-stone-500 hover:bg-stone-100 rounded-lg">Cancel</button>
              <button onClick={handleSaveAddr} className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
