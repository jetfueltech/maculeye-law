import React, { useState } from 'react';
import { CaseFile, CaseFinancials } from '../types';
import { currency } from './financials/helpers';
import { SettlementSection } from './financials/SettlementSection';
import { FeesAndCostsSection } from './financials/FeesAndCostsSection';
import { LiensAndLoansSection } from './financials/LiensAndLoansSection';
import { MedicalExpensesSection } from './financials/MedicalExpensesSection';
import { DistributionSummary, calcDistribution } from './financials/DistributionSummary';
import { DocumentGenerator } from './DocumentGenerator';

interface FinancialsTabProps {
  caseData: CaseFile;
  onUpdateCase: (updatedCase: CaseFile) => void;
}

export const FinancialsTab: React.FC<FinancialsTabProps> = ({ caseData, onUpdateCase }) => {
  const fin = caseData.financials || {};
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<CaseFinancials>({ ...fin });
  const [showDistSheet, setShowDistSheet] = useState(false);

  const startEdit = () => {
    setForm({ ...caseData.financials || {} });
    setEditing(true);
  };

  const save = () => {
    const currentFin = caseData.financials || {};
    const merged: CaseFinancials = {
      ...currentFin,
      demandAmount: form.demandAmount,
      demandNotes: form.demandNotes,
      thirdPartySettlement: form.thirdPartySettlement,
      umUimSettlement: form.umUimSettlement,
      medicalPayments: form.medicalPayments,
      feePercentage: form.feePercentage,
      adminCosts: form.adminCosts,
      litigationCosts: form.litigationCosts,
      otherCosts: form.otherCosts,
      otherCostsDescription: form.otherCostsDescription,
    };
    onUpdateCase({ ...caseData, financials: merged });
    setEditing(false);
  };

  const cancel = () => {
    setForm({ ...caseData.financials || {} });
    setEditing(false);
  };

  const updateFinancials = (updated: CaseFinancials) => {
    onUpdateCase({ ...caseData, financials: updated });
  };

  const d = calcDistribution(fin);
  const grossSettlement = d.grossSettlement;
  const feeAmount = d.attorneyFee;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Gross Settlement" value={grossSettlement ? currency(grossSettlement) : '--'} color="blue" />
        <SummaryCard label="Attorney Fee" value={feeAmount ? currency(feeAmount) : '--'} sub={fin.feePercentage ? `${fin.feePercentage}%` : undefined} color="amber" />
        <SummaryCard label="Medical Expenses" value={d.medicalExpenses ? currency(d.medicalExpenses) : '--'} color="rose" />
        <SummaryCard label="Total Deductions" value={d.totalDeductions ? currency(d.totalDeductions) : '--'} color="slate" />
        <SummaryCard label="Balance Due Client" value={grossSettlement ? currency(d.balanceDueClient) : '--'} color="emerald" />
      </div>

      {/* Demand Info */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wide">Demand Letter</h3>
        </div>
        <div className="p-6">
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Demand Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -transtone-y-1/2 text-stone-400 text-sm">$</span>
                  <input
                    type="text"
                    className="w-full px-3 py-2 pl-7 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    placeholder="0.00"
                    value={form.demandAmount ?? ''}
                    onChange={e => {
                      const cleaned = e.target.value.replace(/[^0-9.]/g, '');
                      setForm({ ...form, demandAmount: cleaned ? parseFloat(cleaned) || 0 : undefined });
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Demand Notes</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  placeholder="Pain & suffering, medical specials..."
                  value={form.demandNotes || ''}
                  onChange={e => setForm({ ...form, demandNotes: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              <ReadField label="Demand Amount" value={fin.demandAmount ? currency(fin.demandAmount) : '--'} />
              <ReadField label="Notes" value={fin.demandNotes || '--'} />
            </div>
          )}
        </div>
      </div>

      {/* Edit Controls for Settlement / Fees sections */}
      <div className="flex justify-end">
        {!editing ? (
          <button onClick={startEdit} className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Edit Settlement & Fees
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={cancel} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800 font-medium border border-stone-200 rounded-lg">Cancel</button>
            <button onClick={save} className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-stone-800 transition-colors">Save Changes</button>
          </div>
        )}
      </div>

      {/* Settlement Sources */}
      <SettlementSection fin={fin} editing={editing} form={form} setForm={setForm} />

      {/* Attorney Fees & Misc Costs */}
      <FeesAndCostsSection fin={fin} grossSettlement={grossSettlement} editing={editing} form={form} setForm={setForm} />

      {/* Financial Liens & Third Party Loans */}
      <LiensAndLoansSection fin={fin} onUpdate={updateFinancials} />

      {/* Medical Expenses & Health Insurance Subrogation */}
      <MedicalExpensesSection fin={fin} onUpdate={updateFinancials} medicalProviders={caseData.medicalProviders} />

      {/* Total Fees, Costs, Financial Liens, and Expenses */}
      <div className="bg-stone-100 rounded-2xl border border-stone-200 px-6 py-4 flex justify-between items-center">
        <span className="text-sm font-bold text-stone-700 uppercase">Total Fees, Costs, Financial Liens, and Expenses</span>
        <span className="text-lg font-bold text-stone-900 tabular-nums">{currency(d.totalDeductions)}</span>
      </div>

      {/* Distribution Summary / Balance Due Client */}
      <DistributionSummary fin={fin} />

      {/* Generate Distribution Sheet Button */}
      {grossSettlement > 0 && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setShowDistSheet(true)}
            className="px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-stone-800 transition-colors flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Generate Distribution Sheet
          </button>
        </div>
      )}

      {/* Distribution Sheet Modal */}
      {showDistSheet && (
        <DocumentGenerator
          isOpen={true}
          onClose={() => setShowDistSheet(false)}
          caseData={caseData}
          formType="distribution_sheet"
        />
      )}
    </div>
  );
};

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const bgMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    amber: 'bg-amber-50 border-amber-100',
    slate: 'bg-stone-50 border-stone-100',
    rose: 'bg-rose-50 border-rose-100',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    slate: 'text-stone-700',
    rose: 'text-rose-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${bgMap[color] || bgMap.slate}`}>
      <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-lg font-bold ${textMap[color] || textMap.slate} tabular-nums`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-stone-800 font-medium">{value}</p>
    </div>
  );
}
