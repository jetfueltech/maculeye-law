import React from 'react';
import { CaseFile } from '../types';
import { calcDistribution } from './financials/DistributionSummary';
import { currency } from './financials/helpers';

interface Props {
  caseData: CaseFile;
  firmName: string;
  firmAddress1: string;
  firmAddress2: string;
}

export const DistributionSheetRenderer: React.FC<Props> = ({ caseData, firmName, firmAddress1, firmAddress2 }) => {
  const fin = caseData.financials || {};
  const d = calcDistribution(fin);
  const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

  const nameParts = (caseData.clientName || '').split(' ');
  const firstName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : nameParts[0] || '';
  const lastName = nameParts[0] || '';
  const middleName = '';

  const accidentDate = caseData.accidentDate || '';

  const liens = fin.financialLiens || [];
  const loans = fin.thirdPartyLoans || [];
  const expenses = fin.medicalExpenses || [];
  const subs = fin.healthInsuranceSubs || [];

  const totalLiens = liens.reduce((s, l) => s + l.amount, 0);
  const totalLiensReduced = liens.reduce((s, l) => s + l.reducedAmount, 0);
  const totalLoansAmt = loans.reduce((s, l) => s + l.loanAmount, 0);
  const totalLoansFinal = loans.reduce((s, l) => s + l.finalAmount, 0);

  const expTotals = {
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

  const paperClass = "bg-white text-black font-serif px-16 py-12 mb-8 shadow-lg mx-auto max-w-[8.5in] min-h-[11in] relative leading-relaxed text-[10pt]";

  return (
    <>
      {/* Page 1: Settlement Calculation */}
      <div className={paperClass}>
        <div className="flex justify-between text-[9pt] text-stone-500 mb-4">
          <span>Date: {today}</span>
          <span>Distribution Sheet (1 of 2)</span>
        </div>

        <Letterhead firmName={firmName} address1={firmAddress1} address2={firmAddress2} />

        <ClientHeader lastName={lastName} firstName={firstName} middleName={middleName} accidentDate={accidentDate} />

        {/* Settlement */}
        <div className="mb-6">
          <p className="font-bold underline mb-2">Settlement:</p>
          <div className="ml-4 space-y-1">
            <NumberedRow num="1" label="Third Party Settlement:" value={currency(fin.thirdPartySettlement)} />
            <NumberedRow num="2" label="UM/UIM Settlement:" value={currency(fin.umUimSettlement)} />
            <NumberedRow num="3" label="Medical Payments:" value={currency(fin.medicalPayments)} />
          </div>
          <div className="mt-2 flex justify-between border-t border-black pt-1 font-bold">
            <span>GROSS SETTLEMENT:</span>
            <span className="tabular-nums">{currency(d.grossSettlement)}</span>
          </div>
        </div>

        {/* Fees, Costs, Financial Liens, and Expenses */}
        <div className="mb-4">
          <p className="font-bold underline mb-3">Fees, Costs, Financial Liens, and Expenses:</p>

          {/* 1. Attorney Fees */}
          <div className="mb-4">
            <p className="font-bold text-[10pt]">1. Attorney Fees:</p>
            <div className="ml-8 flex items-baseline gap-4 mt-1">
              <span>{fin.feePercentage || 0}% per contract:</span>
              <span className="font-bold tabular-nums">{currency(d.attorneyFee)}</span>
            </div>
          </div>

          {/* 2. Miscellaneous Costs */}
          <div className="mb-4">
            <p className="font-bold text-[10pt]">2. Miscellaneous Costs:</p>
            <div className="ml-8 space-y-1 mt-1">
              <LetterRow letter="A" label="Administration Costs:" value={currency(fin.adminCosts)} />
              <LetterRow letter="B" label="Litigation Costs:" value={currency(fin.litigationCosts)} />
              <LetterRow letter="C" label={`Other${fin.otherCostsDescription ? ` (${fin.otherCostsDescription})` : ' (Specify)'}:`} value={currency(fin.otherCosts)} />
            </div>
            <div className="ml-4 mt-1 flex justify-between font-bold border-t border-dotted border-stone-400 pt-1">
              <span>Total Miscellaneous Costs:</span>
              <span className="tabular-nums">{currency(d.miscCosts)}</span>
            </div>
          </div>

          {/* 3. Financial Liens */}
          <div className="mb-4">
            <p className="font-bold text-[10pt]">3. Financial Liens:</p>
            <table className="w-full ml-4 mt-1 text-[9pt]">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left font-bold pb-1"></th>
                  <th className="text-right font-bold pb-1 underline">Amount</th>
                  <th className="text-center font-bold pb-1 underline">Date</th>
                  <th className="text-right font-bold pb-1 underline">Reduced Amnt</th>
                  <th className="text-left font-bold pb-1 underline pl-4">Check Number</th>
                </tr>
              </thead>
              <tbody>
                {liens.length > 0 ? liens.map((lien, i) => (
                  <tr key={lien.id}>
                    <td>{String.fromCharCode(65 + i)}. {lien.description}</td>
                    <td className="text-right tabular-nums">{currency(lien.amount)}</td>
                    <td className="text-center">{lien.date || ''}</td>
                    <td className="text-right tabular-nums">{currency(lien.reducedAmount)}</td>
                    <td className="pl-4">{lien.checkNumber || ''}</td>
                  </tr>
                )) : (
                  <tr>
                    <td>A.</td>
                    <td className="text-right tabular-nums">{currency(0)}</td>
                    <td></td>
                    <td className="text-right tabular-nums">{currency(0)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="ml-8 mt-1 flex justify-between font-bold text-[9pt]">
              <span>Total Financial Liens:</span>
              <span className="tabular-nums">{currency(totalLiens)} &nbsp;&nbsp;&nbsp; {currency(totalLiensReduced)}</span>
            </div>
          </div>

          {/* 4. Third Party Loans */}
          <div className="mb-4">
            <p className="font-bold text-[10pt]">4. Third Party Loans:</p>
            <table className="w-full ml-4 mt-1 text-[9pt]">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left font-bold pb-1"></th>
                  <th className="text-right font-bold pb-1 underline">Loan Amnt</th>
                  <th className="text-center font-bold pb-1 underline">Loan Date</th>
                  <th className="text-right font-bold pb-1 underline">Final Amnt</th>
                  <th className="text-left font-bold pb-1 underline pl-4">Date Due</th>
                </tr>
              </thead>
              <tbody>
                {loans.length > 0 ? loans.map((loan, i) => (
                  <tr key={loan.id}>
                    <td>{String.fromCharCode(65 + i)}. {loan.description}</td>
                    <td className="text-right tabular-nums">{currency(loan.loanAmount)}</td>
                    <td className="text-center">{loan.loanDate || ''}</td>
                    <td className="text-right tabular-nums">{currency(loan.finalAmount)}</td>
                    <td className="pl-4">{loan.dateDue || ''}</td>
                  </tr>
                )) : (
                  <tr>
                    <td>A.</td>
                    <td className="text-right tabular-nums">{currency(0)}</td>
                    <td></td>
                    <td className="text-right tabular-nums">{currency(0)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="ml-8 mt-1 flex justify-between font-bold text-[9pt]">
              <span>Total Third Party Loans:</span>
              <span className="tabular-nums">{currency(totalLoansAmt)} &nbsp;&nbsp;&nbsp; {currency(totalLoansFinal)}</span>
            </div>
          </div>

          {/* 5. Medical Expenses */}
          <div className="mb-4">
            <p className="font-bold text-[10pt]">5. Medical Expenses:</p>
            <table className="w-full mt-1 text-[9pt]">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left font-bold pb-1"></th>
                  <th className="text-left font-bold pb-1 underline">Facility</th>
                  <th className="text-right font-bold pb-1 underline">Total Charges</th>
                  <th className="text-right font-bold pb-1 underline">Amount Due</th>
                  <th className="text-right font-bold pb-1 underline">Reduction Amt.</th>
                  <th className="text-right font-bold pb-1 underline">Client Responsible</th>
                  <th className="text-left font-bold pb-1 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, i) => (
                  <tr key={exp.id}>
                    <td className="pr-1">{String.fromCharCode(65 + i)}.</td>
                    <td>{exp.facility}</td>
                    <td className="text-right tabular-nums">{currency(exp.totalCharges)}</td>
                    <td className="text-right tabular-nums">{currency(exp.amountDue)}</td>
                    <td className="text-right tabular-nums">{currency(exp.reductionAmount)}</td>
                    <td className="text-right tabular-nums">{currency(exp.clientResponsible)}</td>
                    <td className="pl-2 text-[8pt] italic">{exp.notes || ''}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr><td colSpan={7} className="text-center italic py-2">No medical expenses</td></tr>
                )}
              </tbody>
              {expenses.length > 0 && (
                <tfoot>
                  <tr className="border-t border-black font-bold">
                    <td></td>
                    <td>Totals:</td>
                    <td className="text-right tabular-nums">{currency(expTotals.charges)}</td>
                    <td className="text-right tabular-nums">{currency(expTotals.due)}</td>
                    <td className="text-right tabular-nums">{currency(expTotals.reduction)}</td>
                    <td className="text-right tabular-nums">{currency(expTotals.clientResp)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* 6. Health Insurance Subrogation */}
          <div className="mb-6">
            <p className="font-bold text-[10pt]">6. Health Insurance Subrogation:</p>
            <table className="w-full ml-4 mt-1 text-[9pt]">
              <thead>
                <tr className="border-b border-black">
                  <th className="text-left font-bold pb-1"></th>
                  <th className="text-right font-bold pb-1 underline">Original Bill</th>
                  <th className="text-right font-bold pb-1 underline">Compromised Bill</th>
                  <th className="text-right font-bold pb-1 underline">Reduction Amt.</th>
                  <th className="text-left font-bold pb-1 pl-4"></th>
                </tr>
              </thead>
              <tbody>
                {subs.length > 0 ? subs.map((sub, i) => (
                  <tr key={sub.id}>
                    <td>{String.fromCharCode(65 + i)}. {sub.carrier}</td>
                    <td className="text-right tabular-nums">{currency(sub.originalBill)}</td>
                    <td className="text-right tabular-nums">{currency(sub.compromisedBill)}</td>
                    <td className="text-right tabular-nums">{currency(sub.reductionAmount)}</td>
                    <td className="pl-4 italic text-[8pt]">{sub.notes || ''}</td>
                  </tr>
                )) : (
                  <tr>
                    <td>A.</td>
                    <td className="text-right tabular-nums">{currency(0)}</td>
                    <td className="text-right tabular-nums">{currency(0)}</td>
                    <td className="text-right tabular-nums">{currency(0)}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
              {subs.length > 0 && (
                <tfoot>
                  <tr className="border-t border-black font-bold">
                    <td>Totals:</td>
                    <td className="text-right tabular-nums">{currency(subTotals.original)}</td>
                    <td className="text-right tabular-nums">{currency(subTotals.compromised)}</td>
                    <td className="text-right tabular-nums">{currency(subTotals.reduction)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center font-bold border-t-2 border-black pt-2 mb-12">
          <span className="uppercase">Total Fees, Costs, Financial Liens, and Expenses:</span>
          <span className="text-base tabular-nums">{currency(d.totalDeductions)}</span>
        </div>

        {/* Signature Line */}
        <div className="mt-16 flex items-end gap-8">
          <div className="flex-1">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">{caseData.clientName} (Signature)</span>
          </div>
          <div className="w-48">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">Print Name</span>
          </div>
          <div className="w-28">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">Date</span>
          </div>
        </div>
      </div>

      {/* Page 2: Balance Due Client / Distribution */}
      <div className={paperClass}>
        <div className="flex justify-between text-[9pt] text-stone-500 mb-4">
          <span>Date: {today}</span>
          <span>Distribution Sheet (Page 2 of 2)</span>
        </div>

        <Letterhead firmName={firmName} address1={firmAddress1} address2={firmAddress2} />

        <ClientHeader lastName={lastName} firstName={firstName} middleName={middleName} accidentDate={accidentDate} />

        {/* Balance Due Client */}
        <div className="mb-8">
          <p className="font-bold underline mb-4 text-[11pt]">BALANCE DUE CLIENT:</p>

          <div className="space-y-2 max-w-lg">
            <DistRow label="Gross Settlement:" value={currency(d.grossSettlement)} underlineValue />
            <DistRow label="Attorney Fees, and Costs:" value={currency(d.attorneyFeesAndCosts)} />
            <DistRow label="Financial Liens:" value={currency(d.financialLiens)} />
            <DistRow label="Third Party Loans Loans:" value={currency(d.thirdPartyLoans)} />
            <DistRow label="Medical Expenses:" value={currency(d.medicalExpenses)} />
            <DistRow label="Health Insurance Subrogation (if any):" value={currency(d.healthInsuranceSub)} />
          </div>

          <div className="flex justify-between items-baseline max-w-lg mt-4 pt-2 border-t border-black">
            <span className="font-bold text-[11pt]">BALANCE DUE CLIENT:</span>
            <span className="font-bold text-[12pt] tabular-nums">{currency(d.balanceDueClient)}</span>
          </div>
        </div>

        {/* Legal Acknowledgment */}
        <div className="mt-8 text-[10pt] leading-relaxed space-y-4">
          <p>
            I, the undersigned do hereby acknowledge and authorize the foregoing distribution of settlement proceeds
            received in connection with the above referenced personal injury claim arising from the accident of:
          </p>
          <p className="font-bold">{accidentDate}</p>

          <p>
            I also acknowledge and understand that I bear sole responsibility and agree to indemnify and hold
            {' '}{firmName} harmless for any and all outstanding expenses, loans, costs, bills,
            and /or financial obligations of any nature what-so-ever, including but not limited to medical expenses,
            that are not included in the distribution sheet and/or for which a lien has not been signed by
            {' '}{firmName} relative to the aforementioned accident.
          </p>
        </div>

        {/* Client Signature */}
        <div className="mt-16 flex items-end gap-8">
          <div className="flex-1">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">{caseData.clientName} (Signature)</span>
          </div>
          <div className="w-48">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">Print Name</span>
          </div>
          <div className="w-28">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">Date</span>
          </div>
        </div>

        {/* Witness Signature */}
        <div className="mt-12 flex items-end gap-8">
          <div className="flex-1">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">Witness Signature</span>
          </div>
          <div className="w-48">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">Print Name</span>
          </div>
          <div className="w-28">
            <div className="border-b border-black mb-1"></div>
            <span className="text-[9pt]">Date</span>
          </div>
        </div>

        {/* Prepared By */}
        <div className="mt-12 text-[10pt] space-y-1">
          <p>Prepared by: ___________________________</p>
          <p>Date Completed: ___________________________</p>
        </div>
      </div>
    </>
  );
};

function Letterhead({ firmName, address1, address2 }: { firmName: string; address1: string; address2: string }) {
  return (
    <div className="text-center mb-6">
      <h1 className="text-3xl font-bold tracking-wider uppercase mb-1" style={{ fontFamily: 'Georgia, serif' }}>{firmName}</h1>
      <p className="text-[9pt]">{address1}</p>
      <p className="text-[9pt]">{address2}</p>
    </div>
  );
}

function ClientHeader({ lastName, firstName, middleName, accidentDate }: { lastName: string; firstName: string; middleName: string; accidentDate: string }) {
  return (
    <div className="mb-6">
      <table className="text-[10pt] mb-2">
        <thead>
          <tr>
            <td></td>
            <td className="font-bold underline px-4 text-center">Last</td>
            <td className="font-bold underline px-4 text-center">First</td>
            <td className="font-bold underline px-4 text-center">Middle</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="pr-2 font-bold">Client Name:</td>
            <td className="px-4 text-center">{lastName}</td>
            <td className="px-4 text-center">{firstName}</td>
            <td className="px-4 text-center">{middleName}</td>
          </tr>
          <tr>
            <td className="pr-2 font-bold">Date of Accident:</td>
            <td className="px-4 text-center" colSpan={3}>{accidentDate}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function NumberedRow({ num, label, value }: { num: string; label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span>{num}. {label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function LetterRow({ letter, label, value }: { letter: string; label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span>{letter}. {label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function DistRow({ label, value, underlineValue }: { label: string; value: string; underlineValue?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span>{label}</span>
      <span className={`tabular-nums ${underlineValue ? 'underline' : ''}`}>{value}</span>
    </div>
  );
}
