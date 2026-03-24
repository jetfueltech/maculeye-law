import React, { useState } from 'react';
import { CaseFinancials, MedicalExpense, HealthInsuranceSub } from '../../types';
import { currency } from './helpers';

interface Props {
  fin: CaseFinancials;
  onUpdate: (updated: CaseFinancials) => void;
}

const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
const thClass = "text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2";

export const MedicalExpensesSection: React.FC<Props> = ({ fin, onUpdate }) => {
  const expenses = fin.medicalExpenses || [];
  const subs = fin.healthInsuranceSubs || [];

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

  const removeExpense = (id: string) => {
    onUpdate({ ...fin, medicalExpenses: expenses.filter(e => e.id !== id) });
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

  return (
    <div className="space-y-6">
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
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {expenses.map((exp, i) => (
                <tr key={exp.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-sm text-slate-700">{String.fromCharCode(65 + i)}. {exp.facility}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(exp.totalCharges)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(exp.amountDue)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(exp.reductionAmount)}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums text-right">{currency(exp.clientResponsible)}</td>
                  <td className="px-3 py-2 text-xs text-slate-500 italic">{exp.notes || ''}</td>
                  <td className="pr-3">
                    <button onClick={() => removeExpense(exp.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
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
