import React from 'react';
import { CaseFinancials } from '../../types';
import { currency } from './helpers';

interface Props {
  fin: CaseFinancials;
}

export function calcDistribution(fin: CaseFinancials) {
  const grossSettlement = (fin.thirdPartySettlement || 0) + (fin.umUimSettlement || 0) + (fin.medicalPayments || 0);
  const attorneyFee = grossSettlement * ((fin.feePercentage || 0) / 100);
  const miscCosts = (fin.adminCosts || 0) + (fin.litigationCosts || 0) + (fin.otherCosts || 0);
  const attorneyFeesAndCosts = attorneyFee + miscCosts;
  const financialLiens = (fin.financialLiens || []).reduce((s, l) => s + l.reducedAmount, 0);
  const thirdPartyLoans = (fin.thirdPartyLoans || []).reduce((s, l) => s + l.finalAmount, 0);
  const medicalExpenses = (fin.medicalExpenses || []).reduce((s, e) => s + e.amountDue, 0);
  const healthInsuranceSub = (fin.healthInsuranceSubs || []).reduce((s, e) => s + e.compromisedBill, 0);
  const totalDeductions = attorneyFeesAndCosts + financialLiens + thirdPartyLoans + medicalExpenses + healthInsuranceSub;
  const balanceDueClient = grossSettlement - totalDeductions;

  return {
    grossSettlement,
    attorneyFee,
    miscCosts,
    attorneyFeesAndCosts,
    financialLiens,
    thirdPartyLoans,
    medicalExpenses,
    healthInsuranceSub,
    totalDeductions,
    balanceDueClient,
  };
}

export const DistributionSummary: React.FC<Props> = ({ fin }) => {
  const d = calcDistribution(fin);

  if (d.grossSettlement === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 bg-black">
        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Balance Due Client</h3>
      </div>
      <div className="p-6 space-y-2">
        <SummaryRow label="Gross Settlement" value={d.grossSettlement} bold underline />
        <SummaryRow label="Attorney Fees and Costs" value={-d.attorneyFeesAndCosts} />
        <SummaryRow label="Financial Liens" value={-d.financialLiens} />
        <SummaryRow label="Third Party Loans" value={-d.thirdPartyLoans} />
        <SummaryRow label="Medical Expenses" value={-d.medicalExpenses} />
        <SummaryRow label="Health Insurance Subrogation" value={-d.healthInsuranceSub} />

        <div className="border-t-2 border-stone-300 pt-3 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-base font-bold text-stone-900">BALANCE DUE CLIENT</span>
            <span className={`text-xl font-bold tabular-nums ${d.balanceDueClient >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {currency(d.balanceDueClient)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function SummaryRow({ label, value, bold, underline }: { label: string; value: number; bold?: boolean; underline?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-1 ${underline ? 'border-b border-stone-200 pb-2 mb-1' : ''}`}>
      <span className={`text-sm ${bold ? 'font-bold text-stone-800' : 'text-stone-600'}`}>{label}</span>
      <span className={`text-sm tabular-nums ${bold ? 'font-bold text-stone-900' : value < 0 ? 'text-stone-700' : 'text-stone-800'} font-medium`}>
        {currency(Math.abs(value))}
      </span>
    </div>
  );
}
