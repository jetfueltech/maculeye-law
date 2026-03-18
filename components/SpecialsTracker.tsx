import React, { useState } from 'react';
import { CaseFile, SpecialsPackage, SpecialsItem, SpecialsStatus, ActivityLog } from '../types';

interface SpecialsTrackerProps {
  caseData: CaseFile;
  onUpdateCase: (c: CaseFile) => void;
}

const STATUS_LABELS: Record<SpecialsStatus, string> = {
  in_progress: 'In Progress',
  complete: 'Complete',
  sent_to_attorney: 'Sent to Attorney',
};

const STATUS_COLORS: Record<SpecialsStatus, string> = {
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  complete: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sent_to_attorney: 'bg-teal-50 text-teal-700 border-teal-200',
};

function addActivity(c: CaseFile, message: string): CaseFile {
  const log: ActivityLog = {
    id: Math.random().toString(36).substr(2, 9),
    type: 'system',
    message,
    timestamp: new Date().toISOString(),
  };
  return { ...c, activityLog: [log, ...(c.activityLog || [])] };
}

export const SpecialsTracker: React.FC<SpecialsTrackerProps> = ({ caseData, onUpdateCase }) => {
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<SpecialsItem>>({ providerName: '', documentType: 'Medical Bills', amount: 0, included: false });

  const specials = caseData.specials;
  const providers = caseData.medicalProviders || [];
  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  const initSpecials = () => {
    const items: SpecialsItem[] = providers.map(p => ({
      providerName: p.name,
      providerId: p.id,
      documentType: 'Medical Bills',
      amount: p.totalCost || 0,
      included: false,
    }));

    const pkg: SpecialsPackage = {
      id: `sp-${Date.now()}`,
      status: 'in_progress',
      items,
      totalAmount: items.reduce((sum, i) => sum + i.amount, 0),
      lastUpdated: new Date().toISOString(),
    };
    let updated = { ...caseData, specials: pkg };
    updated = addActivity(updated, 'Specials package tracking initiated');
    onUpdateCase(updated);
  };

  const updateStatus = (status: SpecialsStatus) => {
    if (!specials) return;
    const updated = { ...caseData, specials: { ...specials, status, lastUpdated: new Date().toISOString() } };
    onUpdateCase(addActivity(updated, `Specials package status updated to "${STATUS_LABELS[status]}"`));
  };

  const toggleItem = (idx: number) => {
    if (!specials) return;
    const items = [...specials.items];
    items[idx] = { ...items[idx], included: !items[idx].included };
    onUpdateCase({ ...caseData, specials: { ...specials, items, lastUpdated: new Date().toISOString() } });
  };

  const removeItem = (idx: number) => {
    if (!specials) return;
    const items = specials.items.filter((_, i) => i !== idx);
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    onUpdateCase({ ...caseData, specials: { ...specials, items, totalAmount, lastUpdated: new Date().toISOString() } });
  };

  const handleAddItem = () => {
    if (!specials || !newItem.providerName?.trim()) return;
    const item: SpecialsItem = {
      providerName: newItem.providerName || '',
      documentType: newItem.documentType || 'Medical Bills',
      amount: newItem.amount || 0,
      included: false,
    };
    const items = [...specials.items, item];
    const totalAmount = items.reduce((sum, i) => sum + i.amount, 0);
    onUpdateCase({ ...caseData, specials: { ...specials, items, totalAmount, lastUpdated: new Date().toISOString() } });
    setNewItem({ providerName: '', documentType: 'Medical Bills', amount: 0, included: false });
    setShowAddItem(false);
  };

  if (!specials) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Specials Package</h3>
        <p className="text-sm text-slate-500 mb-4">Compile all medical bills from providers into a specials package for the demand.</p>
        <button onClick={initSpecials} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
          Start Specials Package
        </button>
      </div>
    );
  }

  const includedCount = specials.items.filter(i => i.included).length;
  const includedTotal = specials.items.filter(i => i.included).reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              Specials Package
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[specials.status]}`}>
                {STATUS_LABELS[specials.status]}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">{includedCount} of {specials.items.length} items included</p>
          </div>
          <div className="flex items-center gap-2">
            {(['in_progress', 'complete', 'sent_to_attorney'] as SpecialsStatus[]).map(s => (
              <button
                key={s}
                onClick={() => updateStatus(s)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  specials.status === s ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-6">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Total Amount</div>
            <div className="text-2xl font-bold text-slate-900">${specials.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Included Total</div>
            <div className="text-2xl font-bold text-emerald-600">${includedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase">Last Updated</div>
            <div className="text-sm font-medium text-slate-700">{new Date(specials.lastUpdated).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="border-t border-slate-100">
          <div className="divide-y divide-slate-50">
            {specials.items.map((item, idx) => (
              <div key={idx} className="px-6 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 rounded border-slate-300"
                  checked={item.included}
                  onChange={() => toggleItem(idx)}
                />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${item.included ? 'text-slate-900' : 'text-slate-500'}`}>
                    {item.providerName}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">{item.documentType}</span>
                </div>
                <span className="text-sm font-bold text-slate-700">${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          {showAddItem ? (
            <div className="flex items-center gap-3">
              <input className={inputClass + ' flex-1'} placeholder="Provider Name" value={newItem.providerName || ''} onChange={e => setNewItem({ ...newItem, providerName: e.target.value })} />
              <input className={inputClass + ' w-24'} type="number" step="0.01" placeholder="Amount" value={newItem.amount || ''} onChange={e => setNewItem({ ...newItem, amount: parseFloat(e.target.value) || 0 })} />
              <button onClick={handleAddItem} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
              <button onClick={() => setShowAddItem(false)} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setShowAddItem(true)} className="text-sm font-bold text-blue-600 hover:text-blue-800">+ Add Item</button>
          )}
        </div>
      </div>
    </div>
  );
};
