import React from 'react';
import { CaseFinancials } from '../../types';
import { currency } from './helpers';

interface Props {
  fin: CaseFinancials;
  grossSettlement: number;
  editing: boolean;
  form: CaseFinancials;
  setForm: (f: CaseFinancials) => void;
}

const inputClass = "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
const labelClass = "block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1";

export const FeesAndCostsSection: React.FC<Props> = ({ fin, grossSettlement, editing, form, setForm }) => {
  const pct = fin.feePercentage || 0;
  const attorneyFee = grossSettlement * (pct / 100);
  const totalMiscCosts = (fin.adminCosts || 0) + (fin.litigationCosts || 0) + (fin.otherCosts || 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Fees, Costs, Financial Liens, and Expenses</h3>
      </div>
      <div className="p-6 space-y-6">
        <div>
          <p className="text-xs font-bold text-slate-700 mb-3">1. Attorney Fees</p>
          {editing ? (
            <div className="flex items-end gap-4 max-w-md">
              <div className="flex-1">
                <label className={labelClass}>Fee Percentage</label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className={inputClass + ' pr-8'}
                    placeholder="33.33"
                    value={form.feePercentage ?? ''}
                    onChange={e => setForm({ ...form, feePercentage: e.target.value ? parseFloat(e.target.value) : undefined })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                </div>
              </div>
              <div className="pb-2 text-sm text-slate-500">
                per contract: <span className="font-semibold text-slate-800">{currency(grossSettlement * ((form.feePercentage || 0) / 100))}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-6 pl-4">
              <span className="text-sm text-slate-600">{pct}% per contract:</span>
              <span className="text-sm font-semibold text-slate-800 tabular-nums">{currency(attorneyFee)}</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-bold text-slate-700 mb-3">2. Miscellaneous Costs</p>
          {editing ? (
            <div className="grid grid-cols-3 gap-4 pl-4">
              <div>
                <label className={labelClass}>A. Administration Costs</label>
                <DollarInput value={form.adminCosts} onChange={v => setForm({ ...form, adminCosts: v })} />
              </div>
              <div>
                <label className={labelClass}>B. Litigation Costs</label>
                <DollarInput value={form.litigationCosts} onChange={v => setForm({ ...form, litigationCosts: v })} />
              </div>
              <div>
                <label className={labelClass}>C. Other</label>
                <DollarInput value={form.otherCosts} onChange={v => setForm({ ...form, otherCosts: v })} />
              </div>
              {(form.otherCosts || 0) > 0 && (
                <div className="col-span-3">
                  <label className={labelClass}>Other Description</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Specify..."
                    value={form.otherCostsDescription || ''}
                    onChange={e => setForm({ ...form, otherCostsDescription: e.target.value })}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5 pl-4">
              <CostRow letter="A" label="Administration Costs" value={currency(fin.adminCosts)} />
              <CostRow letter="B" label="Litigation Costs" value={currency(fin.litigationCosts)} />
              <CostRow letter="C" label={`Other${fin.otherCostsDescription ? ` (${fin.otherCostsDescription})` : ''}`} value={currency(fin.otherCosts)} />
              <div className="border-t border-slate-100 pt-2 mt-2 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700">Total Miscellaneous Costs</span>
                <span className="text-sm font-semibold text-slate-800 tabular-nums">{currency(totalMiscCosts)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function CostRow({ letter, label, value }: { letter: string; label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-sm text-slate-600">{letter}. {label}</span>
      <span className="text-sm font-medium text-slate-800 tabular-nums">{value}</span>
    </div>
  );
}

function DollarInput({ value, onChange }: { value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
      <input
        type="text"
        className="w-full px-3 py-2 pl-7 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
        placeholder="0.00"
        value={value ?? ''}
        onChange={e => {
          const cleaned = e.target.value.replace(/[^0-9.]/g, '');
          onChange(cleaned ? parseFloat(cleaned) || 0 : 0);
        }}
      />
    </div>
  );
}
