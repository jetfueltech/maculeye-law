import React, { useState } from 'react';
import { CaseFile, CaseFinancials, CaseCost } from '../types';

interface FinancialsTabProps {
  caseData: CaseFile;
  onUpdateCase: (updatedCase: CaseFile) => void;
}

function currency(val: number | undefined): string {
  if (val === undefined || val === null) return '';
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function parseCurrency(val: string): number | undefined {
  const cleaned = val.replace(/[^0-9.]/g, '');
  if (!cleaned) return undefined;
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

export const FinancialsTab: React.FC<FinancialsTabProps> = ({ caseData, onUpdateCase }) => {
  const fin = caseData.financials || {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CaseFinancials>({ ...fin });
  const [newCostDesc, setNewCostDesc] = useState('');
  const [newCostAmount, setNewCostAmount] = useState('');

  const startEdit = () => {
    setForm({ ...caseData.financials || {} });
    setEditing(true);
  };

  const save = () => {
    onUpdateCase({ ...caseData, financials: { ...form } });
    setEditing(false);
  };

  const cancel = () => {
    setForm({ ...caseData.financials || {} });
    setEditing(false);
  };

  const addCost = () => {
    const desc = newCostDesc.trim();
    const amt = parseCurrency(newCostAmount);
    if (!desc || !amt) return;
    const cost: CaseCost = {
      id: crypto.randomUUID(),
      description: desc,
      amount: amt,
      date: new Date().toISOString().split('T')[0],
    };
    const updated = { ...form, costs: [...(form.costs || []), cost] };
    setForm(updated);
    onUpdateCase({ ...caseData, financials: updated });
    setNewCostDesc('');
    setNewCostAmount('');
  };

  const removeCost = (costId: string) => {
    const updated = { ...form, costs: (form.costs || []).filter(c => c.id !== costId) };
    setForm(updated);
    onUpdateCase({ ...caseData, financials: updated });
  };

  const settlementAmount = fin.settlementAmount || 0;
  const feeAmount = fin.feeType === 'flat'
    ? (fin.feeFlatAmount || 0)
    : settlementAmount * ((fin.feePercentage || 0) / 100);
  const totalCosts = (fin.costs || []).reduce((sum, c) => sum + c.amount, 0);
  const clientNet = settlementAmount - feeAmount - totalCosts;

  const inputClass = "w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5";

  return (
    <div className="animate-fade-in space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="Demand Amount" value={fin.demandAmount ? currency(fin.demandAmount) : '--'} color="blue" />
        <SummaryCard label="Settlement" value={fin.settlementAmount ? currency(fin.settlementAmount) : '--'} color="emerald" />
        <SummaryCard label="Firm Fee" value={feeAmount ? currency(feeAmount) : '--'} sub={fin.feeType === 'percentage' ? `${fin.feePercentage || 0}%` : fin.feeType === 'flat' ? 'Flat fee' : undefined} color="amber" />
        <SummaryCard label="Client Net" value={settlementAmount ? currency(clientNet) : '--'} color="slate" />
      </div>

      {/* Demand & Settlement */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800">Demand & Settlement</h3>
          {!editing ? (
            <button onClick={startEdit} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancel} className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
              <button onClick={save} className="px-4 py-1.5 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors">Save</button>
            </div>
          )}
        </div>
        <div className="p-8">
          {editing ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Demand Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="text"
                    className={inputClass + ' pl-7'}
                    placeholder="0.00"
                    value={form.demandAmount ?? ''}
                    onChange={e => setForm({ ...form, demandAmount: parseCurrency(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Demand Notes</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Pain & suffering, medical specials..."
                  value={form.demandNotes || ''}
                  onChange={e => setForm({ ...form, demandNotes: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Settlement Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="text"
                    className={inputClass + ' pl-7'}
                    placeholder="0.00"
                    value={form.settlementAmount ?? ''}
                    onChange={e => setForm({ ...form, settlementAmount: parseCurrency(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>Settlement Date</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.settlementDate || ''}
                  onChange={e => setForm({ ...form, settlementDate: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              <ReadField label="Demand Amount" value={fin.demandAmount ? currency(fin.demandAmount) : '--'} />
              <ReadField label="Demand Notes" value={fin.demandNotes || '--'} />
              <ReadField label="Settlement Amount" value={fin.settlementAmount ? currency(fin.settlementAmount) : '--'} />
              <ReadField label="Settlement Date" value={fin.settlementDate ? new Date(fin.settlementDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '--'} />
            </div>
          )}
        </div>
      </div>

      {/* Firm Fee */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Firm Fee</h3>
        </div>
        <div className="p-8">
          {editing ? (
            <div className="space-y-5">
              <div className="flex gap-3">
                <button
                  onClick={() => setForm({ ...form, feeType: 'percentage', feeFlatAmount: undefined })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.feeType === 'percentage' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  Percentage
                </button>
                <button
                  onClick={() => setForm({ ...form, feeType: 'flat', feePercentage: undefined })}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.feeType === 'flat' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                >
                  Flat Fee
                </button>
              </div>
              {form.feeType === 'percentage' && (
                <div className="max-w-xs">
                  <label className={labelClass}>Fee Percentage</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      className={inputClass + ' pr-8'}
                      placeholder="33.33"
                      value={form.feePercentage ?? ''}
                      onChange={e => setForm({ ...form, feePercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                  {form.feePercentage && fin.settlementAmount ? (
                    <p className="text-xs text-slate-400 mt-1.5">= {currency(fin.settlementAmount * (form.feePercentage / 100))} of settlement</p>
                  ) : null}
                </div>
              )}
              {form.feeType === 'flat' && (
                <div className="max-w-xs">
                  <label className={labelClass}>Flat Fee Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input
                      type="text"
                      className={inputClass + ' pl-7'}
                      placeholder="0.00"
                      value={form.feeFlatAmount ?? ''}
                      onChange={e => setForm({ ...form, feeFlatAmount: parseCurrency(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-8">
              <ReadField label="Fee Type" value={fin.feeType === 'percentage' ? 'Percentage' : fin.feeType === 'flat' ? 'Flat Fee' : '--'} />
              {fin.feeType === 'percentage' && (
                <ReadField label="Percentage" value={fin.feePercentage ? `${fin.feePercentage}%` : '--'} />
              )}
              {fin.feeType === 'flat' && (
                <ReadField label="Flat Fee" value={fin.feeFlatAmount ? currency(fin.feeFlatAmount) : '--'} />
              )}
              <ReadField label="Firm Fee Amount" value={feeAmount ? currency(feeAmount) : '--'} />
            </div>
          )}
        </div>
      </div>

      {/* Case Costs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-800">Case Costs</h3>
          <span className="text-sm font-semibold text-slate-500">Total: {currency(totalCosts)}</span>
        </div>
        <div>
          {(fin.costs || []).length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-8 py-3">Description</th>
                  <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-8 py-3">Amount</th>
                  <th className="w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(fin.costs || []).map(cost => (
                  <tr key={cost.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-3 text-sm text-slate-700">{cost.description}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{cost.date || '--'}</td>
                    <td className="px-8 py-3 text-sm text-slate-800 font-medium text-right">{currency(cost.amount)}</td>
                    <td className="pr-4">
                      <button onClick={() => removeCost(cost.id)} className="p-1 text-slate-400 hover:text-rose-500 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-8 py-8 text-center text-sm text-slate-400">No costs recorded yet.</div>
          )}
          <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <input
                type="text"
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="Cost description"
                value={newCostDesc}
                onChange={e => setNewCostDesc(e.target.value)}
              />
              <div className="relative w-36">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="text"
                  className="w-full px-3 py-2 pl-7 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="0.00"
                  value={newCostAmount}
                  onChange={e => setNewCostAmount(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCost(); }}
                />
              </div>
              <button
                onClick={addCost}
                disabled={!newCostDesc.trim() || !newCostAmount.trim()}
                className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Summary */}
      {settlementAmount > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-800">Settlement Distribution</h3>
          </div>
          <div className="p-8">
            <div className="space-y-3">
              <DistributionRow label="Gross Settlement" amount={settlementAmount} bold />
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <DistributionRow label="Firm Fee" amount={-feeAmount} sub={fin.feeType === 'percentage' ? `${fin.feePercentage}%` : undefined} />
                <DistributionRow label="Case Costs" amount={-totalCosts} sub={`${(fin.costs || []).length} item${(fin.costs || []).length !== 1 ? 's' : ''}`} />
              </div>
              <div className="border-t-2 border-slate-200 pt-3">
                <DistributionRow label="Client Net" amount={clientNet} bold highlight />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    slate: 'bg-slate-50 border-slate-100',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    slate: 'text-slate-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${bgMap[color] || bgMap.slate}`}>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-bold ${textMap[color] || textMap.slate}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-slate-800 font-medium">{value}</p>
    </div>
  );
}

function DistributionRow({ label, amount, sub, bold, highlight }: { label: string; amount: number; sub?: string; bold?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={`text-sm ${bold ? 'font-bold text-slate-800' : 'text-slate-600'} ${highlight ? 'text-emerald-700' : ''}`}>{label}</span>
        {sub && <span className="ml-2 text-xs text-slate-400">({sub})</span>}
      </div>
      <span className={`text-sm font-semibold tabular-nums ${highlight ? 'text-emerald-700 text-base' : amount < 0 ? 'text-rose-600' : 'text-slate-800'} ${bold ? 'font-bold' : ''}`}>
        {amount < 0 ? '-' : ''}{currency(Math.abs(amount))}
      </span>
    </div>
  );
}
