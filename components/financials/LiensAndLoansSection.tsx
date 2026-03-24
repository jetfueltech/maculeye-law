import React, { useState } from 'react';
import { CaseFinancials, FinancialLien, ThirdPartyLoan } from '../../types';
import { currency } from './helpers';

interface Props {
  fin: CaseFinancials;
  onUpdate: (updated: CaseFinancials) => void;
}

const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
const thClass = "text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2";

export const LiensAndLoansSection: React.FC<Props> = ({ fin, onUpdate }) => {
  const liens = fin.financialLiens || [];
  const loans = fin.thirdPartyLoans || [];

  const totalLiens = liens.reduce((s, l) => s + l.amount, 0);
  const totalLiensReduced = liens.reduce((s, l) => s + l.reducedAmount, 0);
  const totalLoans = loans.reduce((s, l) => s + l.loanAmount, 0);
  const totalLoansFinal = loans.reduce((s, l) => s + l.finalAmount, 0);

  const [lienForm, setLienForm] = useState({ description: '', amount: '', date: '', reducedAmount: '', checkNumber: '' });
  const [loanForm, setLoanForm] = useState({ description: '', loanAmount: '', loanDate: '', finalAmount: '', dateDue: '' });

  const addLien = () => {
    if (!lienForm.amount) return;
    const lien: FinancialLien = {
      id: crypto.randomUUID(),
      description: lienForm.description,
      amount: parseFloat(lienForm.amount) || 0,
      date: lienForm.date,
      reducedAmount: parseFloat(lienForm.reducedAmount) || 0,
      checkNumber: lienForm.checkNumber,
    };
    onUpdate({ ...fin, financialLiens: [...liens, lien] });
    setLienForm({ description: '', amount: '', date: '', reducedAmount: '', checkNumber: '' });
  };

  const removeLien = (id: string) => {
    onUpdate({ ...fin, financialLiens: liens.filter(l => l.id !== id) });
  };

  const addLoan = () => {
    if (!loanForm.loanAmount) return;
    const loan: ThirdPartyLoan = {
      id: crypto.randomUUID(),
      description: loanForm.description,
      loanAmount: parseFloat(loanForm.loanAmount) || 0,
      loanDate: loanForm.loanDate,
      finalAmount: parseFloat(loanForm.finalAmount) || 0,
      dateDue: loanForm.dateDue,
    };
    onUpdate({ ...fin, thirdPartyLoans: [...loans, loan] });
    setLoanForm({ description: '', loanAmount: '', loanDate: '', finalAmount: '', dateDue: '' });
  };

  const removeLoan = (id: string) => {
    onUpdate({ ...fin, thirdPartyLoans: loans.filter(l => l.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Financial Liens */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">3. Financial Liens</h3>
          <span className="text-xs font-semibold text-slate-500">Total: {currency(totalLiens)} | Reduced: {currency(totalLiensReduced)}</span>
        </div>
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={thClass}>Description</th>
                <th className={thClass}>Amount</th>
                <th className={thClass}>Date</th>
                <th className={thClass}>Reduced Amt</th>
                <th className={thClass}>Check #</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {liens.map((lien, i) => (
                <tr key={lien.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-sm text-slate-700">{String.fromCharCode(65 + i)}. {lien.description || '--'}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums">{currency(lien.amount)}</td>
                  <td className="px-3 py-2 text-sm text-slate-500">{lien.date || '--'}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums">{currency(lien.reducedAmount)}</td>
                  <td className="px-3 py-2 text-sm text-slate-500">{lien.checkNumber || '--'}</td>
                  <td className="pr-3">
                    <button onClick={() => removeLien(lien.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {liens.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-slate-400">No financial liens</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <input type="text" className={inputClass} placeholder="Description" value={lienForm.description} onChange={e => setLienForm({ ...lienForm, description: e.target.value })} />
              <input type="text" className={inputClass + ' w-28'} placeholder="Amount" value={lienForm.amount} onChange={e => setLienForm({ ...lienForm, amount: e.target.value })} />
              <input type="date" className={inputClass + ' w-36'} value={lienForm.date} onChange={e => setLienForm({ ...lienForm, date: e.target.value })} />
              <input type="text" className={inputClass + ' w-28'} placeholder="Reduced" value={lienForm.reducedAmount} onChange={e => setLienForm({ ...lienForm, reducedAmount: e.target.value })} />
              <input type="text" className={inputClass + ' w-24'} placeholder="Check #" value={lienForm.checkNumber} onChange={e => setLienForm({ ...lienForm, checkNumber: e.target.value })} />
              <button onClick={addLien} className="px-3 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 shrink-0">Add</button>
            </div>
          </div>
        </div>
      </div>

      {/* Third Party Loans */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">4. Third Party Loans</h3>
          <span className="text-xs font-semibold text-slate-500">Total: {currency(totalLoans)} | Final: {currency(totalLoansFinal)}</span>
        </div>
        <div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className={thClass}>Description</th>
                <th className={thClass}>Loan Amt</th>
                <th className={thClass}>Loan Date</th>
                <th className={thClass}>Final Amt</th>
                <th className={thClass}>Date Due</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loans.map((loan, i) => (
                <tr key={loan.id} className="hover:bg-slate-50/50">
                  <td className="px-3 py-2 text-sm text-slate-700">{String.fromCharCode(65 + i)}. {loan.description || '--'}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums">{currency(loan.loanAmount)}</td>
                  <td className="px-3 py-2 text-sm text-slate-500">{loan.loanDate || '--'}</td>
                  <td className="px-3 py-2 text-sm text-slate-800 tabular-nums">{currency(loan.finalAmount)}</td>
                  <td className="px-3 py-2 text-sm text-slate-500">{loan.dateDue || '--'}</td>
                  <td className="pr-3">
                    <button onClick={() => removeLoan(loan.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {loans.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-sm text-slate-400">No third party loans</td></tr>
              )}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <input type="text" className={inputClass} placeholder="Description" value={loanForm.description} onChange={e => setLoanForm({ ...loanForm, description: e.target.value })} />
              <input type="text" className={inputClass + ' w-28'} placeholder="Loan Amt" value={loanForm.loanAmount} onChange={e => setLoanForm({ ...loanForm, loanAmount: e.target.value })} />
              <input type="date" className={inputClass + ' w-36'} value={loanForm.loanDate} onChange={e => setLoanForm({ ...loanForm, loanDate: e.target.value })} />
              <input type="text" className={inputClass + ' w-28'} placeholder="Final Amt" value={loanForm.finalAmount} onChange={e => setLoanForm({ ...loanForm, finalAmount: e.target.value })} />
              <input type="date" className={inputClass + ' w-36'} value={loanForm.dateDue} onChange={e => setLoanForm({ ...loanForm, dateDue: e.target.value })} />
              <button onClick={addLoan} className="px-3 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 shrink-0">Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
