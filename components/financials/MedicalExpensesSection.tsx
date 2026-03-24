import React, { useState } from 'react';
import { CaseFinancials, MedicalExpense, HealthInsuranceSub, MedicalProvider } from '../../types';
import { currency } from './helpers';

interface Props {
  fin: CaseFinancials;
  onUpdate: (updated: CaseFinancials) => void;
  medicalProviders?: MedicalProvider[];
}

const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
const thClass = "text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2";

export const MedicalExpensesSection: React.FC<Props> = ({ fin, onUpdate, medicalProviders }) => {
  const expenses = fin.medicalExpenses || [];
  const subs = fin.healthInsuranceSubs || [];
  const providers = medicalProviders || [];

  const totals = {
    charges: expenses.reduce((s, e) => s + e.totalCharges, 0),
    due: expenses.reduce((s, e) => s + e.amountDue, 0),
    reduction: expenses.reduce((s, e) => s + e.reductionAmount, 0),
    clientResp: expenses.reduce((s, e) => s + e.clientResponsible, 0),
  };

  const subTotals = {
    original: subs.reduce((s, e) => s + e.originalBill, 0),
    compromised: subs.reduce((s, e) => s + e.compromisedBill, 0),
    reduction: subs.reduce((s, e) => s + e.reductionAmount, 0),
  };

  const [expForm, setExpForm] = useState({ facility: '', totalCharges: '', amountDue: '', reductionAmount: '', clientResponsible: '', notes: '' });
  const [subForm, setSubForm] = useState({ carrier: '', originalBill: '', compromisedBill: '', reductionAmount: '', notes: '' });
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MedicalExpense | null>(null);

  const unlinkedProviders = providers.filter(p =>
    p.totalCost && p.totalCost > 0 &&
    !expenses.some(e => e.linkedProviderId === p.id)
  );

  const addExpense = () => {
    if (!expForm.facility) return;
    const exp: MedicalExpense = {
      id: crypto.randomUUID(),
      facility: expForm.facility,
      totalCharges: parseFloat(expForm.totalCharges) || 0,
      amountDue: parseFloat(expForm.amountDue) || 0,
      reductionAmount: parseFloat(expForm.reductionAmount) || 0,
      clientResponsible: parseFloat(expForm.clientResponsible) || 0,
      notes: expForm.notes,
    };
    onUpdate({ ...fin, medicalExpenses: [...expenses, exp] });
    setExpForm({ facility: '', totalCharges: '', amountDue: '', reductionAmount: '', clientResponsible: '', notes: '' });
  };

  const importProvider = (provider: MedicalProvider) => {
    const exp: MedicalExpense = {
      id: crypto.randomUUID(),
      facility: provider.name,
      totalCharges: provider.totalCost || 0,
      amountDue: 0,
      reductionAmount: 0,
      clientResponsible: 0,
      notes: '',
      linkedProviderId: provider.id,
    };
    onUpdate({ ...fin, medicalExpenses: [...expenses, exp] });
  };

  const importAllProviders = () => {
    const newExpenses = unlinkedProviders.map(provider => ({
      id: crypto.randomUUID(),
      facility: provider.name,
      totalCharges: provider.totalCost || 0,
      amountDue: 0,
      reductionAmount: 0,
      clientResponsible: 0,
      notes: '',
      linkedProviderId: provider.id,
    }));
    onUpdate({ ...fin, medicalExpenses: [...expenses, ...newExpenses] });
  };

  const removeExpense = (id: string) => {
    onUpdate({ ...fin, medicalExpenses: expenses.filter(e => e.id !== id) });
    if (editingExpId === id) {
      setEditingExpId(null);
      setEditForm(null);
    }
  };

  const startEditExpense = (exp: MedicalExpense) => {
    setEditingExpId(exp.id);
    setEditForm({ ...exp });
  };

  const saveEditExpense = () => {
    if (!editForm || !editingExpId) return;
    onUpdate({
      ...fin,
      medicalExpenses: expenses.map(e => e.id === editingExpId ? { ...editForm } : e),
    });
    setEditingExpId(null);
    setEditForm(null);
  };

  const cancelEditExpense = () => {
    setEditingExpId(null);
    setEditForm(null);
  };

  const addSub = () => {
    if (!subForm.carrier) return;
    const sub: HealthInsuranceSub = {
      id: crypto.randomUUID(),
      carrier: subForm.carrier,
      originalBill: parseFloat(subForm.originalBill) || 0,
      compromisedBill: parseFloat(subForm.compromisedBill) || 0,
      reductionAmount: parseFloat(subForm.reductionAmount) || 0,
      notes: subForm.notes,
    };
    onUpdate({ ...fin, healthInsuranceSubs: [...subs, sub] });
    setSubForm({ carrier: '', originalBill: '', compromisedBill: '', reductionAmount: '', notes: '' });
  };

  const removeSub = (id: string) => {
    onUpdate({ ...fin, healthInsuranceSubs: subs.filter(s => s.id !== id) });
  };

  const editInputClass = "w-full px-2 py-1 bg-white border border-blue-300 rounded text-sm outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="space-y-6">
      {/* Import from Medical Treatment */}
      {unlinkedProviders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm font-semibold text-blue-800">{unlinkedProviders.length} medical provider{unlinkedProviders.length !== 1 ? 's' : ''} not yet in financials</span>
            </div>
            <button
              onClick={importAllProviders}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Import All
            </button>
          </div>
          <div className="space-y-1.5">
            {unlinkedProviders.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
                <div>
                  <span className="text-sm font-medium text-slate-800">{p.name}</span>
                  <span className="ml-2 text-xs text-slate-500">({currency(p.totalCost)})</span>
                </div>
                <button
                  onClick={() => importProvider(p)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Import
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medical Expenses */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">5. Medical Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={thClass}>Facility</th>
                <th className={thClass + ' text-right'}>Total Charges</th>
                <th className={thClass + ' text-right'}>Amount Due</th>
                <th className={thClass + ' text-right'}>Reduction Amt</th>
                <th className={thClass + ' text-right'}>Client Resp.</th>
                <th className={thClass}>Notes</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {expenses.map((exp, i) => {
                const isEditing = editingExpId === exp.id;
                const ef = editForm;
                if (isEditing && ef) {
                  return (
                    <tr key={exp.id} className="bg-blue-50/50">
                      <td className="px-3 py-2">
                        <input className={editInputClass} value={ef.facility} onChange={e => setEditForm({ ...ef, facility: e.target.value })} />
                      </td>
                      <td className="px-3 py-2">
                        <input className={editInputClass + ' text-right'} value={ef.totalCharges || ''} onChange={e => setEditForm({ ...ef, totalCharges: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-2">
                        <input className={editInputClass + ' text-right'} value={ef.amountDue || ''} onChange={e => setEditForm({ ...ef, amountDue: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-2">
                        <input className={editInputClass + ' text-right'} value={ef.reductionAmount || ''} onChange={e => setEditForm({ ...ef, reductionAmount: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-2">
                        <input className={editInputClass + ' text-right'} value={ef.clientResponsible || ''} onChange={e => setEditForm({ ...ef, clientResponsible: parseFloat(e.target.value) || 0 })} />
                      </td>
                      <td className="px-3 py-2">
                        <input className={editInputClass} value={ef.notes || ''} onChange={e => setEditForm({ ...ef, notes: e.target.value })} />
                      </td>
                      <td className="pr-3">
                        <div className="flex items-center gap-1">
                          <button onClick={saveEditExpense} className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors" title="Save">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button onClick={cancelEditExpense} className="p-1 text-slate-400 hover:text-slate-600 transition-colors" title="Cancel">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={exp.id} className="hover:bg-slate-50/50 group">
                    <td className="px-3 py-2 text-sm text-slate-700">
                      {String.fromCharCode(65 + i)}. {exp.facility}
                      {exp.linkedProviderId && (
                        <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-blue-400 rounded-full" title="Linked to medical treatment provider"></span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(exp.totalCharges)}</td>
                    <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(exp.amountDue)}</td>
                    <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(exp.reductionAmount)}</td>
                    <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(exp.clientResponsible)}</td>
                    <td className="px-3 py-2 text-xs text-slate-500 italic">{exp.notes || ''}</td>
                    <td className="pr-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditExpense(exp)} className="p-1 text-slate-400 hover:text-blue-600 transition-colors" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => removeExpense(exp.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors" title="Remove">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {expenses.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-4 text-center text-sm text-slate-400">No medical expenses recorded</td></tr>
              )}
              {expenses.length > 0 && (
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-3 py-2 text-sm text-slate-800">Totals</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(totals.charges)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(totals.due)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(totals.reduction)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(totals.clientResp)}</td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <input type="text" className={inputClass} placeholder="Facility name" value={expForm.facility} onChange={e => setExpForm({ ...expForm, facility: e.target.value })} />
            <input type="text" className={inputClass + ' w-24'} placeholder="Total" value={expForm.totalCharges} onChange={e => setExpForm({ ...expForm, totalCharges: e.target.value })} />
            <input type="text" className={inputClass + ' w-24'} placeholder="Amt Due" value={expForm.amountDue} onChange={e => setExpForm({ ...expForm, amountDue: e.target.value })} />
            <input type="text" className={inputClass + ' w-24'} placeholder="Reduced" value={expForm.reductionAmount} onChange={e => setExpForm({ ...expForm, reductionAmount: e.target.value })} />
            <input type="text" className={inputClass + ' w-24'} placeholder="Client" value={expForm.clientResponsible} onChange={e => setExpForm({ ...expForm, clientResponsible: e.target.value })} />
            <input type="text" className={inputClass + ' w-28'} placeholder="Notes" value={expForm.notes} onChange={e => setExpForm({ ...expForm, notes: e.target.value })} />
            <button onClick={addExpense} className="px-3 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 shrink-0">Add</button>
          </div>
        </div>
      </div>

      {/* Health Insurance Subrogation */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">6. Health Insurance Subrogation</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={thClass}>Carrier</th>
                <th className={thClass + ' text-right'}>Original Bill</th>
                <th className={thClass + ' text-right'}>Compromised Bill</th>
                <th className={thClass + ' text-right'}>Reduction Amt</th>
                <th className={thClass}>Notes</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subs.map((sub, i) => (
                <tr key={sub.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-sm text-slate-700">{String.fromCharCode(65 + i)}. {sub.carrier}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(sub.originalBill)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(sub.compromisedBill)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(sub.reductionAmount)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 italic">{sub.notes || ''}</td>
                  <td className="pr-3">
                    <button onClick={() => removeSub(sub.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-slate-400">No subrogation claims</td></tr>
              )}
              {subs.length > 0 && (
                <tr className="bg-slate-50 font-semibold">
                  <td className="px-3 py-2 text-sm text-slate-800">Totals</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(subTotals.original)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(subTotals.compromised)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(subTotals.reduction)}</td>
                  <td colSpan={2}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <input type="text" className={inputClass} placeholder="Carrier name" value={subForm.carrier} onChange={e => setSubForm({ ...subForm, carrier: e.target.value })} />
            <input type="text" className={inputClass + ' w-28'} placeholder="Original" value={subForm.originalBill} onChange={e => setSubForm({ ...subForm, originalBill: e.target.value })} />
            <input type="text" className={inputClass + ' w-28'} placeholder="Compromised" value={subForm.compromisedBill} onChange={e => setSubForm({ ...subForm, compromisedBill: e.target.value })} />
            <input type="text" className={inputClass + ' w-28'} placeholder="Reduction" value={subForm.reductionAmount} onChange={e => setSubForm({ ...subForm, reductionAmount: e.target.value })} />
            <input type="text" className={inputClass + ' w-28'} placeholder="Notes" value={subForm.notes} onChange={e => setSubForm({ ...subForm, notes: e.target.value })} />
            <button onClick={addSub} className="px-3 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 shrink-0">Add</button>
          </div>
        </div>
      </div>
    </div>
  );
};
