import React from 'react';
import { CaseFinancials } from '../../types';
import { currency } from './helpers';

interface Props {
  fin: CaseFinancials;
  editing: boolean;
  form: CaseFinancials;
  setForm: (f: CaseFinancials) => void;
}

const inputClass = "w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow";
const labelClass = "block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1";

function DollarInput({ value, onChange, placeholder }: { value: number | undefined; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -transtone-y-1/2 text-stone-400 text-sm">$</span>
      <input
        type="text"
        className={inputClass + ' pl-7'}
        placeholder={placeholder || '0.00'}
        value={value ?? ''}
        onChange={e => {
          const cleaned = e.target.value.replace(/[^0-9.]/g, '');
          onChange(cleaned ? parseFloat(cleaned) || 0 : 0);
        }}
      />
    </div>
  );
}

export const SettlementSection: React.FC<Props> = ({ fin, editing, form, setForm }) => {
  const grossSettlement = (fin.thirdPartySettlement || 0) + (fin.umUimSettlement || 0) + (fin.medicalPayments || 0);

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wide">Settlement</h3>
      </div>
      <div className="p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>1. Third Party Settlement</label>
                <DollarInput value={form.thirdPartySettlement} onChange={v => setForm({ ...form, thirdPartySettlement: v })} />
              </div>
              <div>
                <label className={labelClass}>2. UM/UIM Settlement</label>
                <DollarInput value={form.umUimSettlement} onChange={v => setForm({ ...form, umUimSettlement: v })} />
              </div>
              <div>
                <label className={labelClass}>3. Medical Payments</label>
                <DollarInput value={form.medicalPayments} onChange={v => setForm({ ...form, medicalPayments: v })} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Row num="1" label="Third Party Settlement" value={currency(fin.thirdPartySettlement)} />
            <Row num="2" label="UM/UIM Settlement" value={currency(fin.umUimSettlement)} />
            <Row num="3" label="Medical Payments" value={currency(fin.medicalPayments)} />
            <div className="border-t-2 border-stone-200 pt-3 mt-3 flex justify-between items-center">
              <span className="text-sm font-bold text-stone-800 uppercase">Gross Settlement</span>
              <span className="text-base font-bold text-stone-900 tabular-nums">{currency(grossSettlement)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function Row({ num, label, value }: { num: string; label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-stone-600">{num}. {label}</span>
      <span className="text-sm font-medium text-stone-800 tabular-nums">{value}</span>
    </div>
  );
}
