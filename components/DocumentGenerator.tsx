
import React, { useState, useEffect } from 'react';
import { CaseFile, ExtendedIntakeData, MedicalProvider, ERVisit } from '../types';
import { DistributionSheetRenderer } from './DistributionSheetRenderer';

export type DocumentFormType =
  | 'rep_lien'
  | 'foia'
  | 'intake_summary'
  | 'boss_intake_form'
  | 'bill_request'
  | 'records_request'
  | 'hipaa_auth'
  | 'er_bill_request'
  | 'er_records_request'
  | 'distribution_sheet'
  | 'preservation_of_evidence'
  | 'medical_bill_request';

export interface EvidenceRecipient {
  businessName: string;
  contactName?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface DocumentContext {
  provider?: MedicalProvider;
  erVisit?: ERVisit;
  insuranceType?: 'Defendant' | 'Client';
  evidenceRecipient?: EvidenceRecipient;
}

interface DocumentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: CaseFile;
  formType: DocumentFormType | null;
  context?: DocumentContext;
  onSaveToDocuments?: (docName: string, formType: DocumentFormType) => void;
}

export const DocumentGenerator: React.FC<DocumentGeneratorProps> = ({ isOpen, onClose, caseData, formType, context, onSaveToDocuments }) => {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [formType]);

  if (!isOpen || !formType) return null;

  const intake = caseData.extendedIntake || {};
  const clientName = caseData.clientName;
  const dol = caseData.accidentDate;
  
  // Data extraction with fallbacks
  const defName = intake.defendant?.name || caseData.parties?.find(p => p.role === 'Defendant')?.name || '[DEFENDANT NAME]';
  const defInsurer = intake.defendant?.insurance?.company || caseData.insurance?.find(i => i.type === 'Defendant')?.provider || '[INSURANCE CO]';
  const claimNo = intake.defendant?.insurance?.claim_number || caseData.insurance?.find(i => i.type === 'Defendant')?.claimNumber || '[CLAIM #]';
  const crashReportNo = intake.accident?.crash_report_number || '[CRASH REPORT #]';
  
  // Static Attorney Info (Simulated "SAP LAW")
  const attorneyName = "Steve Pisman, Esq.";
  const attorneyFirm = "SAP LAW";
  const attorneyAddress = "205 N. Michigan Ave., Suite 810";
  const attorneyCity = "Chicago, IL 60601";
  const attorneyPhone = "(312) 224-4200";
  const attorneyFax = "(713) 583-5119";
  const attorneyEmail = "steve@saplaw.com";

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Styles for the "Paper" view
  const paperClass = "bg-white text-black font-serif p-12 mb-8 shadow-lg mx-auto max-w-[8.5in] min-h-[11in] relative leading-relaxed text-[11pt]";
  const letterheadClass = "text-center border-b-2 border-black pb-4 mb-8";
  const lhTitle = "text-4xl font-bold tracking-widest font-serif mb-2 uppercase";
  
  const renderRepAndLien = () => (
    <>
        {/* Page 1: Letter of Representation */}
        <div className={paperClass}>
            <div className={letterheadClass}>
                <h1 className={lhTitle}>SAP LAW</h1>
                <p className="text-sm font-sans font-bold">{attorneyAddress}, {attorneyCity}</p>
                <p className="text-sm font-sans">Phone: {attorneyPhone} Fax: {attorneyFax}</p>
            </div>

            <div className="text-center font-bold mb-6 underline">{today}</div>

            <div className="mb-6">
                <p className="font-bold">Via Facsimile/Email</p>
                <p className="font-bold">{defInsurer}</p>
                <p>Claims Department</p>
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-y-1 mb-6 font-bold">
                <div>RE:</div>
                <div className="grid grid-cols-[100px_1fr] gap-y-1">
                    <span>Our Client:</span>
                    <span className="bg-yellow-100 px-1">{clientName}</span>
                    
                    <span>Your Insured:</span>
                    <span className="bg-yellow-100 px-1">{defName}</span>
                    
                    <span>Date of Loss:</span>
                    <span className="bg-yellow-100 px-1">{dol}</span>
                    
                    <span>Claim No.:</span>
                    <span className="bg-yellow-100 px-1">{claimNo}</span>
                </div>
            </div>

            <p className="mb-4">To Whom It May Concern:</p>

            <p className="mb-4 text-justify">
                Please be advised our office represents <span className="bg-yellow-100 font-bold">{clientName}</span> in a claim for personal injuries arising from the above-referenced accident. 
                SAP Law has an attorney’s lien on our client’s claim and any recovery. This lien is attached hereto. 
                Please include SAP Law as payee on all settlement drafts, unless notified in writing, that our office no longer represents said client.
            </p>

            <p className="mb-4 text-justify">
                Please forward your insurance company policy limits upon receipt of this letter. If there is medical payment coverage available, 
                checks should be made out to our client and SAP Law only. <span className="font-bold">No medical payments should be made to medical providers directly.</span>
            </p>

            <p className="mb-4 text-justify">
                Please forward copies of any property damage photos (including color copies if available), estimates, monies paid for vehicular damage 
                and any recorded statements, written or other, that may exist. Please preserve all accident-related evidence in this case. 
                <i>See Boyd v. Travelers Ins. Co. 625 N.E.2d 267 (Ill. 1995).</i>
            </p>

            <p className="mb-6">
                Please refrain from direct or indirect contact with our client, their family and treating physicians.
                We look forward to working with you to resolve this matter.
            </p>

            <div className="mt-12">
                <p>Sincerely,</p>
                <div className="h-12 w-48 my-2 bg-contain bg-no-repeat" style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png")', backgroundPosition: 'left' }}></div>
                <p className="font-bold">{attorneyName}</p>
                <p className="font-bold">{attorneyFirm}</p>
            </div>
        </div>

        {/* Page 2: Lien Notice */}
        <div className={paperClass}>
            <div className="text-center font-bold uppercase mb-8 mt-4">
                <h2 className="text-lg underline">Notice of Attorney's Lien</h2>
                <p className="text-sm">(Under the Law of 1909, as Amended)</p>
            </div>

            <div className="mb-8">
                <p>STATE OF ILLINOIS &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</p>
                <p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) SS</p>
                <p>COOK COUNTY &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</p>
            </div>

            <div className="mb-6 font-bold">
                <p className="underline mb-2">Via Facsimile/Email</p>
                <p>{defInsurer}</p>
                <p>Claims Department</p>
            </div>

            <div className="grid grid-cols-[80px_1fr] gap-y-1 mb-8 font-bold">
                <div>RE:</div>
                <div className="grid grid-cols-[100px_1fr] gap-y-1">
                    <span>Our Client:</span>
                    <span className="bg-yellow-100 px-1">{clientName}</span>
                    
                    <span>Your Insured:</span>
                    <span className="bg-yellow-100 px-1">{defName}</span>
                    
                    <span>Date of Loss:</span>
                    <span className="bg-yellow-100 px-1">{dol}</span>
                    
                    <span>Claim No.:</span>
                    <span className="bg-yellow-100 px-1">{claimNo}</span>
                </div>
            </div>

            <p className="mb-6 text-justify leading-loose">
                Please take notice that SAP Law has been retained by the above mentioned claimant(s) to prosecute or settle his/her claim 
                for personal injuries and/or property damage sustained in relation the above-captioned accident. Pursuant to the Illinois 
                Attorney Lien Act, you are hereby placed on notice that <span className="bg-yellow-100 font-bold">{clientName}</span> has 
                agreed to pay SAP Law for services as a fee, a sum no less than one-third (33%) of whatever amount may be recovered from suit or settlement, 
                and that we claim a <span className="font-bold underline">lien</span> upon said claim, demand or cause of action.
            </p>

            <div className="mt-16 mb-12">
                <div className="border-t border-black w-64 mb-1"></div>
                <p className="font-bold">{attorneyName}</p>
                <p>{attorneyFirm}</p>
            </div>

            <div className="mb-8 italic text-sm">
                <p>Being first duly sworn, DEPOSES AND SAYS, that (s)he served the above Notice by faxing a copy of the same to the above-named party on <span className="bg-yellow-100 not-italic font-bold">{today}</span>.</p>
            </div>
             <div className="mt-8">
                <div className="border-t border-black w-64 mb-1"></div>
                <p className="font-bold">{attorneyName}</p>
                <p>{attorneyFirm}</p>
            </div>
        </div>
    </>
  );

  const renderFOIA = () => (
      <>
        {/* Page 1: Request Letter */}
        <div className={paperClass}>
            <div className={letterheadClass}>
                <h1 className={lhTitle}>SAP LAW</h1>
                <p className="text-sm font-sans font-bold">{attorneyAddress}, {attorneyCity}</p>
                <p className="text-sm font-sans">Phone: {attorneyPhone} Fax: {attorneyFax}</p>
            </div>

            <div className="text-center font-bold mb-6 bg-yellow-100 inline-block w-full">{today}</div>

            <div className="mb-6 font-bold">
                <p className="italic text-blue-800 underline mb-1">Via email: foia@chicagopolice.org</p>
                <p>Chicago Police Department</p>
                <p>Attn: Freedom of Information Officer</p>
                <p>Freedom of Information Section, Unit 114</p>
                <p>3510 S. Michigan Ave.</p>
                <p>Chicago, IL 60653</p>
            </div>

            <div className="grid grid-cols-[60px_1fr] gap-y-1 mb-8">
                <div className="font-bold">RE:</div>
                <div className="grid grid-cols-[130px_1fr] gap-y-1 font-bold">
                    <span>Our Client(s):</span>
                    <span className="bg-yellow-100 px-1">{clientName}</span>
                    
                    <span>Date of Loss:</span>
                    <span className="bg-yellow-100 px-1">{dol}</span>
                    
                    <span>Crash Report No.:</span>
                    <span className="bg-yellow-100 px-1">{crashReportNo}</span>
                </div>
            </div>

            <p className="mb-6">To Whom It May Concern,</p>

            <p className="mb-6 text-justify leading-7">
                Please be advised that we represent <span className="bg-yellow-100 font-bold">{clientName}</span> in their personal injury claim as a result of an auto collision that 
                occurred on <span className="bg-yellow-100 font-bold">{dol}</span>. Attached please find a copy of our FOIA Request and the corresponding Crash Report. 
                Please forward the requested information, via email if possible, at your earliest opportunity.
            </p>

            <p className="mb-8">
                If you have any questions, please contact me at {attorneyPhone}. Your prompt attention to this matter is appreciated.
            </p>

            <div className="mt-8">
                <p>Sincerely,</p>
                <div className="h-16 w-48 my-2 bg-contain bg-no-repeat" style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png")', backgroundPosition: 'left' }}></div>
                <p className="font-bold">Rosa M. Hernandez, Esq.</p>
                <p className="font-bold">{attorneyFirm}</p>
                <a href="#" className="text-blue-600 underline">rosa@SAPLaw.com</a>
            </div>
        </div>

        {/* Page 2: FOIA Form */}
        <div className={paperClass}>
            <div className="border-2 border-black p-1">
                <div className="border border-black p-4">
                    <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
                        <h2 className="text-2xl font-bold uppercase">Freedom of Information Request</h2>
                        <div className="text-right text-xs">
                            <p>OFFICE USE ONLY</p>
                            <p>DATE RECEIVED: ___________</p>
                        </div>
                    </div>

                    <div className="text-xs mb-4">
                        <p className="font-bold">INSTRUCTIONS:</p>
                        <p>PLEASE PRINT OR TYPE. SUBMIT ONE FORM FOR EACH RECORD REQUESTED.</p>
                    </div>

                    <div className="bg-black text-white font-bold text-center py-1 mb-1 text-sm">REQUESTER</div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 border border-black p-2">
                        <div className="border-r border-black pr-2">
                            <label className="block text-xs font-bold">PRINT NAME (LAST - FIRST - M.I.)</label>
                            <div className="font-serif text-lg">{attorneyName} (Attorney)</div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold">SIGNATURE</label>
                            <div className="font-script text-xl italic">Steve Pisman</div>
                        </div>
                        <div className="col-span-2 border-t border-black pt-2 mt-2">
                            <div className="grid grid-cols-[1fr_100px_80px_100px] gap-2">
                                <div>
                                    <label className="block text-xs font-bold">STREET ADDRESS</label>
                                    <div>{attorneyAddress}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold">CITY</label>
                                    <div>Chicago</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold">STATE</label>
                                    <div>IL</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold">ZIP</label>
                                    <div>60601</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2 border-t border-black pt-2">
                             <label className="block text-xs font-bold">TELEPHONE NO.</label>
                             <div>{attorneyPhone}</div>
                        </div>
                    </div>

                    <div className="bg-gray-200 font-bold px-2 py-1 text-sm border border-black mb-1">DESCRIBE RECORD SOUGHT</div>
                    <div className="border border-black p-2 min-h-[150px] mb-4 text-sm font-serif">
                        <p className="mb-2">We represent the aforementioned client in an automobile collision. See attached report. Demand is hereby made for the production and disclosure of all evidence of the alleged incident, scene, and/or physical objects; including but not limited to photographs, videos, body cam, nearby pod camera footage, 911 call logs, and/or witness statements.</p>
                        <p className="font-bold bg-yellow-100 inline-block">CRASH REPORT #: {crashReportNo}</p>
                        <p className="mt-1">Date of Occurrence: {dol}</p>
                        <p>Location: {caseData.location || 'Unknown'}</p>
                    </div>

                    <div className="bg-black text-white font-bold text-center py-1 mb-1 text-sm">FREEDOM OF INFORMATION SECTION</div>
                    <div className="border border-black p-8 text-center text-gray-400 text-sm">
                        [OFFICIAL USE ONLY - DO NOT WRITE IN THIS SPACE]
                    </div>
                </div>
            </div>
        </div>

        {/* Page 3: Attachment Placeholder */}
        <div className={paperClass + " flex flex-col items-center justify-center border-4 border-dashed border-gray-300 bg-gray-50"}>
            <div className="text-center opacity-50">
                <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <h3 className="text-2xl font-bold text-gray-500 uppercase">Attachment: Crash Report</h3>
                <p className="text-lg text-gray-400">{crashReportNo}</p>
                <p className="mt-4 text-sm">(This page simulates the attached crash report from the case file)</p>
            </div>
        </div>
      </>
  );

  const renderIntakeSummary = () => (
      <div className={paperClass}>
          {/* Header */}
          <div className="text-center mb-6">
              <h1 className="text-4xl font-bold text-red-800 font-serif tracking-wide mb-1">SAP LAW</h1>
              <p className="text-sm font-sans">{attorneyAddress}, {attorneyCity}</p>
              <p className="text-sm font-sans font-bold">Phone: {attorneyPhone} <span className="font-normal ml-2">www.SAPLaw.com</span></p>
          </div>

          {/* Admin Row */}
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>Total # of Clients: <span className="border-b border-black px-2">{intake.intake_admin?.total_clients || 1}</span></div>
              <div>Client Primary Language: <span className="border-b border-black px-2">{intake.intake_admin?.primary_language || 'English'}</span></div>
          </div>

          <div className="grid grid-cols-1 gap-2 mb-6 text-sm">
              <div>
                  Referral Source: <span className="border-b border-black px-2">{intake.intake_admin?.referral_source || 'Unknown'}</span>
                  {intake.intake_admin?.referral_source === 'Other' && <span className="ml-2">({intake.intake_admin?.referral_source_other})</span>}
              </div>
              <div>
                  Interview Date: <span className="border-b border-black px-2">{intake.intake_admin?.interview?.date || '___________'}</span>
                  &nbsp; Office <span className="inline-block w-4 h-4 border border-black align-middle text-center">{intake.intake_admin?.interview?.location === 'Office' ? 'x' : ''}</span>
                  &nbsp; Field <span className="inline-block w-4 h-4 border border-black align-middle text-center">{intake.intake_admin?.interview?.location === 'Field' ? 'x' : ''}</span>
                  &nbsp; Time: <span className="border-b border-black px-2">{intake.intake_admin?.interview?.time || '____'}</span>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2 text-sm border-b border-black pb-4">
              <div>Crash Report #: <span className="border-b border-black px-2">{intake.accident?.crash_report_number}</span></div>
              <div>Agency: <span className="border-b border-black px-2">{intake.accident?.agency}</span></div>
              <div>City: <span className="border-b border-black px-2">{intake.accident?.city}</span></div>
              <div>County: <span className="border-b border-black px-2">{intake.accident?.county}</span></div>
              <div className="col-span-2">Plaintiff: {intake.accident?.plaintiff_role || 'Driver'}</div>
          </div>

          {/* Accident Info Section */}
          <div className="mb-6 border border-black">
              <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Accident Information</div>
              <div className="p-2 text-sm space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                      <div>D.O.L: <span className="border-b border-black font-bold bg-yellow-100">{intake.accident?.date_of_loss}</span></div>
                      <div>Day of Week: <span className="border-b border-black">{intake.accident?.day_of_week}</span></div>
                      <div>Time: <span className="border-b border-black">{intake.accident?.time_of_accident}</span></div>
                  </div>
                  <div>Weather: <span className="border-b border-black">{intake.accident?.weather_conditions}</span></div>
                  <div>Traffic Controls: <span className="border-b border-black">{intake.accident?.traffic_controls?.join(', ')}</span></div>
                  <div className="grid grid-cols-2 gap-2">
                      <div>Main Intersections: <span className="border-b border-black">{intake.accident?.main_intersections || intake.accident?.accident_location}</span></div>
                      <div>City: <span className="border-b border-black">{intake.accident?.city}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <div>Plaintiff Direction: <span className="border-b border-black">{intake.accident?.plaintiff_direction}</span></div>
                      <div>Defendant Direction: <span className="border-b border-black">{intake.accident?.defendant_direction}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <div>Nature of Trip: <span className="border-b border-black">{intake.accident?.nature_of_trip}</span></div>
                      <div>Speed Limit: <span className="border-b border-black">{intake.accident?.speed_limit}</span></div>
                  </div>
                  <div className="mt-2">
                      <div className="font-bold">State Accident Facts:</div>
                      <div className="border-b border-black min-h-[3rem] italic">{intake.accident?.accident_facts}</div>
                  </div>
              </div>
          </div>

          {/* Client Info Section */}
          <div className="mb-6 border border-black">
              <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Client Information</div>
              <div className="p-2 text-sm space-y-2">
                  <div className="grid grid-cols-[1fr_150px] gap-2">
                      <div>Name: <span className="border-b border-black font-bold bg-yellow-100">{intake.client?.full_name}</span></div>
                      <div>D.O.B: <span className="border-b border-black">{intake.client?.date_of_birth}</span></div>
                  </div>
                  <div>Address: <span className="border-b border-black">{intake.client?.address?.street}, {intake.client?.address?.city}, {intake.client?.address?.state} {intake.client?.address?.zip}</span></div>
                  <div className="grid grid-cols-3 gap-2">
                      <div>SSN: <span className="border-b border-black">{intake.client?.ssn}</span></div>
                      <div>DL #: <span className="border-b border-black">{intake.client?.drivers_license?.number}</span></div>
                      <div>State: <span className="border-b border-black">{intake.client?.drivers_license?.state_issued}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <div>Home Phone: <span className="border-b border-black">{intake.client?.phones?.home}</span></div>
                      <div>Cell Phone: <span className="border-b border-black font-bold">{intake.client?.phones?.cell}</span></div>
                  </div>
                  <div>Email: <span className="border-b border-black">{intake.client?.email}</span></div>
                  <div>Emergency Contact: <span className="border-b border-black">{intake.client?.emergency_contact?.name} ({intake.client?.emergency_contact?.phone})</span></div>
              </div>
          </div>

          {/* Insurance Sections */}
          <div className="mb-6 border border-black">
              <div className="bg-gray-100 text-center font-bold border-b border-black py-1">First Party Insurance Company</div>
              <div className="p-2 text-sm space-y-2">
                  <div>Company: <span className="border-b border-black font-bold">{intake.first_party_insurance?.company}</span></div>
                  <div className="grid grid-cols-2 gap-2">
                      <div>Claim #: <span className="border-b border-black">{intake.first_party_insurance?.claim_number}</span></div>
                      <div>Policy #: <span className="border-b border-black">{intake.first_party_insurance?.policy_number}</span></div>
                  </div>
                  <div>Limits: <span className="border-b border-black">{intake.first_party_insurance?.coverage_limits}</span></div>
              </div>
          </div>

          <div className="mb-6 border border-black">
              <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Private Medical / Health Insurance</div>
              <div className="p-2 text-sm space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                      <div>Company: <span className="border-b border-black">{intake.health_insurance?.company}</span></div>
                      <div>Member ID: <span className="border-b border-black">{intake.health_insurance?.member_number}</span></div>
                  </div>
                  <div>Group #: <span className="border-b border-black">{intake.health_insurance?.group_number}</span></div>
              </div>
          </div>

          {/* Medical */}
          <div className="mb-6 border border-black">
              <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Bodily Injuries / Medical Providers</div>
              <div className="p-2 text-sm space-y-2">
                  <div>Injuries: <div className="border-b border-black italic min-h-[2rem]">{intake.medical?.injuries_detail}</div></div>
                  <div className="grid grid-cols-2 gap-2">
                      <div>Ambulance: {intake.medical?.ambulance ? 'Yes' : 'No'}</div>
                      <div>X-rays: {intake.medical?.xrays_taken ? 'Yes' : 'No'}</div>
                  </div>
                  <div>Hospital: <span className="border-b border-black">{intake.medical?.hospital?.name}</span></div>
                  <div>Pre-existing: <span className="border-b border-black">{intake.medical?.pre_existing_conditions}</span></div>
                  <div className="mt-2">
                      <div className="font-bold border-b border-black mb-1">Providers Table</div>
                      <table className="w-full border border-black text-xs">
                          <thead><tr className="bg-gray-50"><th className="border border-black">Name</th><th className="border border-black">Address</th><th className="border border-black">Phone</th></tr></thead>
                          <tbody>
                              {intake.medical?.providers?.map((p, i) => (
                                  <tr key={i}>
                                      <td className="border border-black p-1">{p.name}</td>
                                      <td className="border border-black p-1">{p.address}</td>
                                      <td className="border border-black p-1">{p.phone}</td>
                                  </tr>
                              ))}
                              {(!intake.medical?.providers || intake.medical.providers.length === 0) && <tr><td colSpan={3} className="p-1 text-center italic">None listed</td></tr>}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>

          {/* Defendant */}
          <div className="mb-6 border border-black">
              <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Defendant Information</div>
              <div className="p-2 text-sm space-y-2">
                  <div className="grid grid-cols-[1fr_150px] gap-2">
                      <div>Name: <span className="border-b border-black font-bold bg-yellow-100">{intake.defendant?.name}</span></div>
                      <div>Phone: <span className="border-b border-black">{intake.defendant?.phone}</span></div>
                  </div>
                  <div>Address: <span className="border-b border-black">{intake.defendant?.address?.street}, {intake.defendant?.address?.city}</span></div>
                  <div>Vehicle: <span className="border-b border-black">{intake.defendant?.vehicle?.year} {intake.defendant?.vehicle?.make} {intake.defendant?.vehicle?.model}</span></div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-dotted border-gray-300">
                      <div>Insurance Co: <span className="border-b border-black font-bold">{intake.defendant?.insurance?.company}</span></div>
                      <div>Policy #: <span className="border-b border-black">{intake.defendant?.insurance?.policy_number}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <div>Claim #: <span className="border-b border-black font-bold bg-yellow-100">{intake.defendant?.insurance?.claim_number}</span></div>
                      <div>Adjuster: <span className="border-b border-black">{intake.defendant?.insurance?.claims_adjuster?.name}</span></div>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderBossIntakeForm = () => {
    const clientIns = caseData.insurance?.find(i => i.type === 'Client');
    const defIns = caseData.insurance?.find(i => i.type === 'Defendant');
    const providers = caseData.medicalProviders || [];
    const erVisits = caseData.erVisits || [];
    return (
      <div className={paperClass}>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-red-800 font-serif tracking-wide mb-1">SAP LAW</h1>
          <h2 className="text-lg font-bold uppercase border-b-2 border-black pb-2">CLIENT INTAKE FORM</h2>
        </div>

        <div className="mb-6 border border-black">
          <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Client Information</div>
          <div className="p-3 text-sm space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>Client Name: <span className="border-b border-black font-bold px-1 bg-yellow-100">{caseData.clientName}</span></div>
              <div>DOB: <span className="border-b border-black px-1">{caseData.clientDob || intake.client?.date_of_birth || '___________'}</span></div>
            </div>
            <div>Phone: <span className="border-b border-black px-1">{caseData.clientPhone}</span></div>
            <div>Email: <span className="border-b border-black px-1">{caseData.clientEmail}</span></div>
            <div>Address: <span className="border-b border-black px-1">{caseData.clientAddress || [intake.client?.address?.street, intake.client?.address?.city, intake.client?.address?.state, intake.client?.address?.zip].filter(Boolean).join(', ') || '___________'}</span></div>
          </div>
        </div>

        <div className="mb-6 border border-black">
          <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Accident Information</div>
          <div className="p-3 text-sm space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>Date of Loss: <span className="border-b border-black font-bold px-1 bg-yellow-100">{caseData.accidentDate}</span></div>
              <div>Location: <span className="border-b border-black px-1">{caseData.location || intake.accident?.accident_location || '___________'}</span></div>
            </div>
            <div>Crash Report #: <span className="border-b border-black px-1">{intake.accident?.crash_report_number || '___________'}</span></div>
            <div>Facts: <span className="border-b border-black px-1">{caseData.description || intake.accident?.accident_facts || '___________'}</span></div>
            <div>Impact: <span className="border-b border-black px-1">{caseData.impact || '___________'}</span></div>
          </div>
        </div>

        <div className="mb-6 border border-black">
          <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Insurance Information</div>
          <div className="p-3 text-sm space-y-2">
            <div className="font-bold border-b border-dotted border-gray-400 pb-1 mb-2">Client Insurance</div>
            <div className="grid grid-cols-2 gap-4">
              <div>Company: <span className="border-b border-black px-1">{clientIns?.provider || intake.auto_insurance?.driver_or_passenger_insurance_company || '___________'}</span></div>
              <div>Policy #: <span className="border-b border-black px-1">{clientIns?.policyNumber || '___________'}</span></div>
            </div>
            <div className="font-bold border-b border-dotted border-gray-400 pb-1 mb-2 mt-3">Defendant Insurance</div>
            <div className="grid grid-cols-2 gap-4">
              <div>Company: <span className="border-b border-black font-bold px-1">{defIns?.provider || defInsurer}</span></div>
              <div>Claim #: <span className="border-b border-black px-1">{defIns?.claimNumber || claimNo}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>Adjuster: <span className="border-b border-black px-1">{defIns?.adjuster || '___________'}</span></div>
              <div>Coverage Limits: <span className="border-b border-black px-1">{defIns?.policyLimitsAmount || defIns?.coverageLimits || '___________'}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>Coverage: <span className="border-b border-black px-1">{defIns?.coverageStatus || 'Pending'}</span></div>
              <div>Liability: <span className="border-b border-black px-1">{defIns?.liabilityStatus || 'Pending'}</span></div>
            </div>
          </div>
        </div>

        <div className="mb-6 border border-black">
          <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Defendant Information</div>
          <div className="p-3 text-sm space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>Name: <span className="border-b border-black font-bold px-1">{defName}</span></div>
              <div>Phone: <span className="border-b border-black px-1">{intake.defendant?.phone || '___________'}</span></div>
            </div>
            <div>Vehicle: <span className="border-b border-black px-1">{intake.defendant?.vehicle ? `${intake.defendant.vehicle.year} ${intake.defendant.vehicle.make} ${intake.defendant.vehicle.model}` : '___________'}</span></div>
          </div>
        </div>

        <div className="mb-6 border border-black">
          <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Medical Treatment</div>
          <div className="p-3 text-sm space-y-2">
            <div>Treatment Status: <span className="border-b border-black px-1">{caseData.treatmentStatus || 'Active'}</span></div>
            <div>MRI Completed: <span className="border-b border-black px-1">{caseData.mriCompleted ? `Yes (${caseData.mriCompletedDate || ''})` : 'No'}</span></div>
            <table className="w-full border border-black text-xs mt-2">
              <thead><tr className="bg-gray-50"><th className="border border-black p-1">Provider</th><th className="border border-black p-1">Type</th><th className="border border-black p-1">Phone</th><th className="border border-black p-1">Cost</th></tr></thead>
              <tbody>
                {providers.map((p, i) => (
                  <tr key={i}>
                    <td className="border border-black p-1 font-bold">{p.name}</td>
                    <td className="border border-black p-1">{p.type}</td>
                    <td className="border border-black p-1">{p.phone || '--'}</td>
                    <td className="border border-black p-1">{p.totalCost ? `$${p.totalCost.toLocaleString()}` : '--'}</td>
                  </tr>
                ))}
                {providers.length === 0 && <tr><td colSpan={4} className="p-1 text-center italic">None listed</td></tr>}
              </tbody>
            </table>
            {erVisits.length > 0 && (
              <div className="mt-2">
                <div className="font-bold text-xs">ER Visits:</div>
                {erVisits.map((v, i) => (
                  <div key={i} className="text-xs ml-2">- {v.facilityName} ({v.visitDate}) | Bills: {v.bills.filter(b => b.status === 'received').length}/3 received</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6 border border-black">
          <div className="bg-gray-100 text-center font-bold border-b border-black py-1">Referral & Notes</div>
          <div className="p-3 text-sm space-y-2">
            <div>Referral Source: <span className="border-b border-black px-1">{caseData.referralSource}</span></div>
            <div>SOL Date: <span className="border-b border-black px-1 font-bold text-red-800">{caseData.statuteOfLimitationsDate || '___________'}</span></div>
            <div>Notes: <span className="border-b border-black px-1">{caseData.notes || '___________'}</span></div>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center mt-8">Generated {today} | {attorneyFirm} | Auto-populated from case data</div>
      </div>
    );
  };

  const provider = context?.provider;
  const erVisit = context?.erVisit;

  const providerName = provider?.name || erVisit?.facilityName || '[PROVIDER NAME]';
  const providerAddress = provider
    ? [provider.address, provider.city, provider.state, provider.zip].filter(Boolean).join(', ')
    : '[PROVIDER ADDRESS]';
  const providerFax = provider?.fax || '[FAX NUMBER]';

  const renderBillRequest = () => (
    <div className={paperClass}>
      <div className={letterheadClass}>
        <h1 className={lhTitle}>SAP LAW</h1>
        <p className="text-sm font-sans font-bold">{attorneyAddress}, {attorneyCity}</p>
        <p className="text-sm font-sans">Phone: {attorneyPhone} &nbsp;&nbsp; Fax: {attorneyFax}</p>
      </div>

      <div className="text-right mb-6">{today}</div>

      <div className="mb-6">
        <p className="font-bold">Via Facsimile</p>
        <p className="font-bold bg-yellow-100 inline-block px-1">{providerName}</p>
        {providerAddress && providerAddress !== '[PROVIDER ADDRESS]' && <p>{providerAddress}</p>}
        {providerFax && providerFax !== '[FAX NUMBER]' && <p>Fax: {providerFax}</p>}
      </div>

      <div className="grid grid-cols-[80px_1fr] gap-y-1 mb-8 font-bold">
        <div>RE:</div>
        <div className="grid grid-cols-[120px_1fr] gap-y-1">
          <span>Our Client:</span>
          <span className="bg-yellow-100 px-1">{clientName}</span>
          <span>Date of Loss:</span>
          <span className="bg-yellow-100 px-1">{dol}</span>
          <span>Claim No.:</span>
          <span className="bg-yellow-100 px-1">{claimNo}</span>
        </div>
      </div>

      <p className="mb-4">To Whom It May Concern:</p>

      <p className="mb-4 text-justify">
        Please be advised that this office represents <span className="bg-yellow-100 font-bold">{clientName}</span> in a personal injury matter arising
        from the accident that occurred on <span className="bg-yellow-100 font-bold">{dol}</span>.
      </p>

      <p className="mb-4 text-justify">
        We are requesting an <strong>itemized bill / statement of account</strong> reflecting all charges for services rendered to our client.
        Please forward the requested documentation to our office at your earliest convenience via fax at {attorneyFax} or email at {attorneyEmail}.
      </p>

      <p className="mb-4 text-justify">
        Please note that our office holds an attorney's lien on any recovery in connection with this matter.
        Accordingly, please do <strong>not</strong> release any billing information to any third party without our written consent.
      </p>

      <p className="mb-4">
        Your prompt attention to this request is appreciated. Please do not hesitate to contact our office if you need any additional information.
      </p>

      <div className="mt-12">
        <p>Sincerely,</p>
        <div className="h-12 w-48 my-2 bg-contain bg-no-repeat" style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png")', backgroundPosition: 'left' }}></div>
        <p className="font-bold">{attorneyName}</p>
        <p className="font-bold">{attorneyFirm}</p>
      </div>
    </div>
  );

  const renderRecordsRequest = () => (
    <div className={paperClass}>
      <div className={letterheadClass}>
        <h1 className={lhTitle}>SAP LAW</h1>
        <p className="text-sm font-sans font-bold">{attorneyAddress}, {attorneyCity}</p>
        <p className="text-sm font-sans">Phone: {attorneyPhone} &nbsp;&nbsp; Fax: {attorneyFax}</p>
      </div>

      <div className="text-right mb-6">{today}</div>

      <div className="mb-6">
        <p className="font-bold">Via Facsimile / Certified Mail</p>
        <p className="font-bold bg-yellow-100 inline-block px-1">{providerName}</p>
        <p>Medical Records Department</p>
        {providerAddress && providerAddress !== '[PROVIDER ADDRESS]' && <p>{providerAddress}</p>}
        {providerFax && providerFax !== '[FAX NUMBER]' && <p>Fax: {providerFax}</p>}
      </div>

      <div className="grid grid-cols-[80px_1fr] gap-y-1 mb-8 font-bold">
        <div>RE:</div>
        <div className="grid grid-cols-[120px_1fr] gap-y-1">
          <span>Patient:</span>
          <span className="bg-yellow-100 px-1">{clientName}</span>
          <span>Date of Loss:</span>
          <span className="bg-yellow-100 px-1">{dol}</span>
          <span>Date of Birth:</span>
          <span className="bg-yellow-100 px-1">{caseData.clientDob || '[DOB]'}</span>
        </div>
      </div>

      <p className="mb-4">To Whom It May Concern:</p>

      <p className="mb-4 text-justify">
        This office represents <span className="bg-yellow-100 font-bold">{clientName}</span> in connection with injuries sustained in an accident
        on <span className="bg-yellow-100 font-bold">{dol}</span>. Enclosed please find a signed HIPAA authorization permitting the release of
        our client's medical records to our office.
      </p>

      <p className="mb-4 text-justify">
        Pursuant to the enclosed authorization, please forward <strong>complete certified copies of all medical records, reports, test results,
        imaging studies, treatment notes, and any other documentation</strong> related to treatment of <span className="font-bold">{clientName}</span> from
        the date of the above-referenced accident to the present.
      </p>

      <p className="mb-4">
        Please forward the requested records to our office at your earliest convenience. You may fax records to {attorneyFax} or
        email to {attorneyEmail}. If there is a charge for copying, please forward the bill to our office and it will be promptly paid.
      </p>

      <p className="mb-6">
        Thank you for your prompt attention to this matter. Please do not hesitate to contact us with any questions.
      </p>

      <div className="mt-12">
        <p>Sincerely,</p>
        <div className="h-12 w-48 my-2 bg-contain bg-no-repeat" style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png")', backgroundPosition: 'left' }}></div>
        <p className="font-bold">{attorneyName}</p>
        <p className="font-bold">{attorneyFirm}</p>
      </div>

      <div className="mt-8 border-t border-dashed border-black pt-4 text-xs text-center text-gray-500">
        Enclosure: Signed HIPAA Authorization
      </div>
    </div>
  );

  const renderHIPAAAuth = () => (
    <div className={paperClass}>
      <div className={letterheadClass}>
        <h1 className={lhTitle}>SAP LAW</h1>
        <p className="text-sm font-sans font-bold">{attorneyAddress}, {attorneyCity}</p>
        <p className="text-sm font-sans">Phone: {attorneyPhone}</p>
      </div>

      <h2 className="text-center font-bold text-lg underline mb-6 uppercase">
        Authorization for Release of Medical Records and Health Information
      </h2>
      <p className="text-center text-xs mb-6">(Pursuant to 45 CFR §164.508 — HIPAA)</p>

      <div className="border border-black p-4 mb-6">
        <p className="font-bold mb-3 underline">1. Patient Information</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold">Patient Name:</p>
            <p className="bg-yellow-100 px-1 border-b border-black">{clientName}</p>
          </div>
          <div>
            <p className="text-xs font-bold">Date of Birth:</p>
            <p className="bg-yellow-100 px-1 border-b border-black">{caseData.clientDob || '________________'}</p>
          </div>
          <div>
            <p className="text-xs font-bold">Address:</p>
            <p className="bg-yellow-100 px-1 border-b border-black">{caseData.clientAddress || '________________'}</p>
          </div>
          <div>
            <p className="text-xs font-bold">Phone:</p>
            <p className="bg-yellow-100 px-1 border-b border-black">{caseData.clientPhone || '________________'}</p>
          </div>
        </div>
      </div>

      <div className="border border-black p-4 mb-6">
        <p className="font-bold mb-3 underline">2. I Authorize the Following to Release My Records:</p>
        <p className="font-bold bg-yellow-100 px-1 mb-1">{providerName !== '[PROVIDER NAME]' ? providerName : '[ All Treating Providers ]'}</p>
        <p className="text-xs">Address: <span className="bg-yellow-100 px-1">{providerAddress !== '[PROVIDER ADDRESS]' ? providerAddress : '________________'}</span></p>
      </div>

      <div className="border border-black p-4 mb-6">
        <p className="font-bold mb-3 underline">3. Release Records To:</p>
        <p className="font-bold">{attorneyFirm} — {attorneyName}</p>
        <p>{attorneyAddress}, {attorneyCity}</p>
        <p>Fax: {attorneyFax} &nbsp;&nbsp; Email: {attorneyEmail}</p>
      </div>

      <div className="border border-black p-4 mb-6">
        <p className="font-bold mb-3 underline">4. Description of Information to Be Released:</p>
        <p>☑ All medical records, treatment notes, reports, test results, and imaging studies</p>
        <p>☑ Records related to injuries from accident on: <span className="bg-yellow-100 px-1 font-bold">{dol}</span></p>
        <p>☑ All dates of service from accident date to present</p>
      </div>

      <div className="border border-black p-4 mb-6">
        <p className="font-bold mb-3 underline">5. Purpose of Disclosure:</p>
        <p>Legal representation and personal injury claim</p>
      </div>

      <div className="border border-black p-4 mb-6">
        <p className="font-bold mb-3 underline">6. Expiration:</p>
        <p>This authorization expires one (1) year from the date signed, or upon resolution of the above-referenced legal matter, whichever occurs first.</p>
      </div>

      <p className="text-xs mb-6 text-justify">
        I understand that I have the right to revoke this authorization at any time by sending written notice to {attorneyFirm}.
        I understand that once this information is disclosed, it may no longer be protected by federal privacy regulations.
      </p>

      <div className="grid grid-cols-2 gap-12 mt-10">
        <div>
          <div className="border-b border-black h-10 mb-1"></div>
          <p className="text-xs font-bold">Patient Signature</p>
        </div>
        <div>
          <div className="border-b border-black h-10 mb-1 bg-yellow-50 flex items-end pb-1 px-1">
            <span className="text-slate-400 text-xs">{today}</span>
          </div>
          <p className="text-xs font-bold">Date</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="border-b border-black h-10 mb-1"></div>
        <p className="text-xs font-bold">Printed Name</p>
      </div>
    </div>
  );

  const evidenceRecipient = context?.evidenceRecipient;

  const renderPreservationOfEvidence = () => {
    const recipientBusiness = evidenceRecipient?.businessName || '[BUSINESS NAME]';
    const recipientContact = evidenceRecipient?.contactName || '';
    const recipientAddr = evidenceRecipient?.address || '[ADDRESS]';
    const recipientCityStateZip = evidenceRecipient
      ? `${evidenceRecipient.city}, ${evidenceRecipient.state} ${evidenceRecipient.zip}`
      : '[CITY, STATE ZIP]';
    const accidentLocation = caseData.location || intake.accident?.accident_location || '[ACCIDENT LOCATION]';
    const accidentTime = intake.accident?.time_of_accident || '[TIME]';
    const accidentDateFormatted = dol
      ? new Date(dol).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '[DATE]';
    const clientGender = intake.client?.gender;
    const honorific = clientGender === 'Female' ? 'Ms.' : clientGender === 'Male' ? 'Mr.' : 'Mr./Ms.';
    const lastName = clientName.split(' ').pop() || clientName;

    const policeReport = caseData.documents.find(d => d.type === 'crash_report' || d.category === 'investigation');
    const policeReportUrl = policeReport?.storageUrl || policeReport?.fileData || null;

    return (
      <>
        <div className={paperClass}>
          <div className={letterheadClass}>
            <h1 className={lhTitle}>SAP LAW</h1>
            <p className="text-sm font-sans font-bold">{attorneyAddress}, {attorneyCity}</p>
            <p className="text-sm font-sans">Phone: {attorneyPhone} Fax: {attorneyFax}</p>
          </div>

          <div className="flex justify-between items-start mb-8">
            <div className="text-sm">{today}</div>
            <div className="text-right font-bold text-base uppercase">Preservation of Evidence</div>
          </div>

          <div className="mb-6">
            {recipientContact && <p className="font-bold">{recipientContact}</p>}
            <p className="font-bold">{recipientBusiness}</p>
            <p>{recipientAddr}</p>
            <p>{recipientCityStateZip}</p>
          </div>

          <div className="grid grid-cols-[40px_1fr] gap-y-1 mb-6">
            <div className="font-bold">RE:</div>
            <div>
              <span>Our Client(s): <span className="bg-yellow-100 px-1 font-bold">{clientName}</span></span>
              <br />
              <span>Date of Loss: <span className="bg-yellow-100 px-1">{dol}</span></span>
            </div>
          </div>

          <p className="mb-6">To Whom It May Concern,</p>

          <p className="mb-6 text-justify leading-7">
            Please be advised that we represent {honorific} {lastName} in{' '}
            {clientGender === 'Female' ? 'her' : clientGender === 'Male' ? 'his' : 'his/her'}{' '}
            personal injury claim as a result of an auto accident that occurred on{' '}
            <span className="font-bold">{accidentDateFormatted}</span> at or about{' '}
            <span className="font-bold">{accidentTime}</span>, at or near intersection of{' '}
            <span className="font-bold">{accidentLocation}</span>. See attached copy of the
            corresponding Crash Report. Kindly accept this correspondence as a{' '}
            <span className="font-bold">formal demand for preservation of evidence</span>.
          </p>

          <p className="mb-6 text-justify leading-7">
            We have been informed that your security/surveillance camera(s) may have secured video footage
            of the aforementioned collision.{' '}
            <span className="font-bold underline">
              Demand is hereby made for the preservation of all evidence of the alleged incident, scene,
              and physical objects; including but not limited to photographs and/or videos.
            </span>
          </p>

          <p className="mb-6 text-justify leading-7">
            Please contact me to make arrangements for our office to secure a copy of the evidence in your
            possession.
          </p>

          <p className="mb-8">Your cooperation will be appreciated.</p>

          <div className="mt-8">
            <p>Sincerely,</p>
            <div className="h-16 w-48 my-2 bg-contain bg-no-repeat" style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png")', backgroundPosition: 'left' }}></div>
            <p className="font-bold">Rosa M. Hernandez, Esq.</p>
            <p className="font-bold">{attorneyFirm}</p>
            <a href="#" className="text-blue-600 underline">rosa@SAPLaw.com</a>
          </div>
        </div>

        {policeReportUrl ? (
          <div className={paperClass}>
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-slate-700 uppercase tracking-wide">Attachment: Police / Crash Report</h3>
              <p className="text-xs text-slate-500 mt-1">Crash Report #{crashReportNo}</p>
            </div>
            <div className="border border-slate-300 rounded-lg overflow-hidden bg-white min-h-[800px]">
              {policeReport?.mimeType?.startsWith('image/') || policeReportUrl.match(/\.(jpg|jpeg|png|gif|webp)/i) ? (
                <img src={policeReportUrl} alt="Police Report" className="w-full h-auto" />
              ) : (
                <iframe
                  src={policeReportUrl}
                  className="w-full h-[900px]"
                  title="Police Report"
                />
              )}
            </div>
          </div>
        ) : (
          <div className={paperClass + " flex flex-col items-center justify-center border-4 border-dashed border-gray-300 bg-gray-50"}>
            <div className="text-center opacity-50">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <h3 className="text-2xl font-bold text-gray-500 uppercase">Attachment: Crash Report</h3>
              <p className="text-lg text-gray-400">{crashReportNo}</p>
              <p className="mt-4 text-sm text-gray-400">(Police report will be attached from case documents when available)</p>
            </div>
          </div>
        )}
      </>
    );
  };

  const renderMedicalBillRequest = () => {
    const provAddr = provider
      ? [provider.address, provider.city ? `${provider.city}, ${provider.state || 'IL'} ${provider.zip || ''}` : ''].filter(Boolean)
      : [];
    const clientDob = caseData.clientDob || intake.client?.date_of_birth || '[DOB]';
    const clientAddress = caseData.clientAddress || [intake.client?.address?.street, intake.client?.address?.city, intake.client?.address?.state, intake.client?.address?.zip].filter(Boolean).join(', ') || '[ADDRESS]';
    const clientCity = intake.client?.address?.city || 'Chicago';
    const clientState = intake.client?.address?.state || 'IL';
    const clientZip = intake.client?.address?.zip || '[ZIP]';
    const clientPhone = caseData.clientPhone || intake.client?.phones?.cell || '';

    return (
      <>
        <div className={paperClass}>
          <div className="border-t-4 border-black mb-4"></div>
          <div className={letterheadClass}>
            <h1 className={lhTitle}>SAP LAW</h1>
          </div>

          <div className="text-center font-bold mb-2">
            <p className="underline text-sm">RUSH</p>
            <p className="-mt-1">-MEDICAL RECORDS & ITEMIZED</p>
          </div>
          <div className="text-center font-bold mb-8 text-lg">BILLS REQUEST</div>

          <div className="mb-6">
            <p className="font-bold underline bg-yellow-100 inline-block px-1">{providerName}</p>
            {provAddr.map((line, i) => (
              <p key={i} className="font-bold">{line}</p>
            ))}
          </div>

          <div className="grid grid-cols-[120px_1fr] gap-y-2 mb-8 ml-16">
            <span className="font-bold underline bg-yellow-100 px-1">Date of Birth:</span>
            <span className="bg-yellow-100 px-1">{clientDob}</span>
            <span className="font-bold underline bg-yellow-100 px-1">Date of Loss:</span>
            <span className="bg-yellow-100 px-1">{dol}</span>
            <span className="font-bold">RE: &nbsp;&nbsp;Our Client(s):</span>
            <span className="bg-yellow-100 px-1 font-bold">{clientName}</span>
          </div>

          <p className="mb-4">Dear Record & Bill Custodian:</p>

          <p className="mb-4 text-justify leading-7">
            Please be advised that we represent the above-named patient in a personal injury claim. Our
            office is requesting copies of <strong>ALL MEDICAL RECORDS AND ITEMIZED BILLS</strong> you
            have for this patient <strong>for <span className="bg-yellow-100">{dol}</span> to present</strong>.
            Enclosed please find an authorization form signed by our client. If you have any questions
            or need additional information, please call our office. Your cooperation will be appreciated.
          </p>

          <div className="mt-12 text-center">
            <p>Very truly yours,</p>
            <div className="h-16 w-48 mx-auto my-2 bg-contain bg-no-repeat" style={{ backgroundImage: 'url("https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Signature_sample.svg/1200px-Signature_sample.svg.png")', backgroundPosition: 'center' }}></div>
            <p className="mt-4">.............................................</p>
            <p className="font-bold">Alexandria Delaola-Rodriguez</p>
            <p>Paralegal</p>
          </div>

          <div className="mt-8 text-center">
            <p className="font-bold italic">
              <span className="underline">Preferred Method of Delivery (email):</span> alexandria@saplaw.com
            </p>
            <p className="font-bold italic">Thank you!</p>
          </div>

          <div className="mt-6 text-sm">
            <p>Encl.</p>
            <p className="ml-4">- <em>Executed Medical Authorization</em></p>
          </div>

          <div className="absolute bottom-8 left-0 right-0 text-center font-bold text-sm">
            <p>{attorneyAddress.replace('Suite 810', 'Suite 810,')}{' '}{attorneyCity}</p>
            <p>Phone: {attorneyPhone} Fax: {attorneyFax}</p>
          </div>
        </div>

        <div className={paperClass}>
          <h2 className="text-center font-bold text-lg mb-6">Authorization for Release of Protected Health Information</h2>

          <table className="w-full border-2 border-black text-sm mb-4">
            <tbody>
              <tr>
                <td className="border border-black p-2 w-1/3">
                  <div className="text-xs font-bold">Patient Name:</div>
                  <div className="bg-yellow-100 px-1">{clientName}</div>
                </td>
                <td className="border border-black p-2 w-1/3">
                  <div className="text-xs font-bold">Birth Date:</div>
                  <div className="bg-yellow-100 px-1">{clientDob}</div>
                </td>
                <td className="border border-black p-2 w-1/3">
                  <div className="text-xs font-bold">Social Security No:</div>
                  <div>{intake.client?.ssn || ''}</div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2">
                  <div className="text-xs font-bold">Home Telephone Number:</div>
                  <div>{clientPhone}</div>
                </td>
                <td className="border border-black p-2" colSpan={2}>
                  <div className="text-xs font-bold">Patient's Address:</div>
                  <div className="bg-yellow-100 px-1">{clientAddress}</div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2">
                  <div className="text-xs font-bold">Provider's Name/Address:</div>
                  <div className="text-xs bg-yellow-100 px-1">{providerName}</div>
                  {provAddr.map((line, i) => (
                    <div key={i} className="text-xs">{line}</div>
                  ))}
                </td>
                <td className="border border-black p-2">
                  <div className="text-xs font-bold">City:</div>
                  <div className="bg-yellow-100 px-1">{clientCity}</div>
                </td>
                <td className="border border-black p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs font-bold">State:</div>
                      <div className="bg-yellow-100 px-1">{clientState}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold">Zip code:</div>
                      <div className="bg-yellow-100 px-1">{clientZip}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-bold mb-4">This consent will automatically expire two years from the date signed.</p>

          <div className="mb-4">
            <p className="text-base">
              <strong className="text-lg">THE UNDERSIGNED</strong> hereby authorizes and requests that the above named provider to provide records
            </p>
            <p className="mt-1">To: <strong>{attorneyFirm}</strong></p>
            <p className="ml-6">{attorneyAddress},</p>
            <p className="ml-6">Suite 810</p>
            <p className="ml-6">{attorneyCity}</p>
          </div>

          <h3 className="text-center font-bold text-sm border-t border-b border-black py-2 mb-4">Description of information to be used or disclosed</h3>

          <table className="w-full border border-black text-xs mb-4">
            <thead>
              <tr>
                <th className="border border-black p-1 text-left font-bold">Description:</th>
                <th className="border border-black p-1 font-bold">Date:</th>
                <th className="border border-black p-1 text-left font-bold">Description:</th>
                <th className="border border-black p-1 font-bold">Date:</th>
                <th className="border border-black p-1 text-left font-bold">Description:</th>
                <th className="border border-black p-1 font-bold">Date:</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1">_All PHI in medical record<br />_Admission form<br />_Dictation report<br />_Physician orders<br />_Intake/outtake<br />_Clinical test<br />_medication sheets</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1">_Operative information<br />_Cath lab<br />_Special test/therapy<br />_Rhythm strips<br />_Nursing information<br />_Transfer forms<br />_ER information</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1">_Labor/delivery sum<br />_OB nursing assess<br />_Postpartum flow sheet<br />_Itemized bill<br /><span className="font-bold">X</span>Entire record and all bills</td>
                <td className="border border-black p-1 font-bold bg-yellow-100">{dol} to present</td>
              </tr>
            </tbody>
          </table>

          <p className="text-xs font-bold mb-4">
            I acknowledge, and hereby consent to such, that the released information may contain alcohol, drug abuse,
            psychiatric, HIV testing, HIV results or AIDS information. __________ (Initial)
          </p>

          <div className="text-[10px] space-y-1 mb-4 leading-relaxed">
            <p>I understand:</p>
            <p>I may refuse to sign this authorization and that it is strictly voluntary.</p>
            <p>My treatment, payment, enrollment or eligibility for benefits may not be conditioned on signing this authorization.</p>
            <p>I may revoke this authorization at any time in writing, to the healthcare provider listed above, but if I do, it will not have any effect on any actions taken prior to receiving the revocation.</p>
            <p>If the requestor or receiver is not a health plan or health care provider, the released information may no longer be protected by federal privacy regulations and may be redisclosed.</p>
            <p>I understand that I may see and obtain a copy of the information described on this form, for a reasonable fee, if I ask for it.</p>
            <p>The purpose of this request for information is for litigation purposes.</p>
          </div>

          <p className="text-xs font-bold mb-4">I have read the above and authorize the disclosure of the protected health information as stated.</p>

          <table className="w-full border border-black text-sm">
            <tbody>
              <tr>
                <td className="border border-black p-3">
                  <div className="text-xs font-bold">Signature of Patient/Plan Member/Guardian:</div>
                  <div className="h-8 font-script italic text-lg bg-yellow-50">{clientName}</div>
                  <div className="text-[9px] bg-yellow-100 inline-block px-1">{clientName} {today}</div>
                  <div className="text-xs font-bold mt-1">Print Name of Patient/Plan Member/Guardian:</div>
                  <div className="bg-yellow-100 px-1">{clientName}</div>
                </td>
                <td className="border border-black p-3 w-1/3">
                  <div className="text-xs font-bold">Date:</div>
                  <div className="bg-yellow-100 px-1">{today}</div>
                  <div className="text-xs font-bold mt-4">Relationship to Patient:</div>
                  <div className="bg-yellow-100 px-1">Self</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const FORM_TITLES: Record<DocumentFormType, string> = {
    rep_lien: 'Letter of Representation & Lien',
    foia: 'FOIA / Crash Report Request',
    intake_summary: 'Intake Summary',
    boss_intake_form: 'Boss Intake Form',
    bill_request: `Bill Request — ${providerName}`,
    records_request: `Records Request — ${providerName}`,
    hipaa_auth: 'HIPAA Authorization',
    er_bill_request: `ER Bill Request — ${providerName}`,
    er_records_request: `ER Records Request — ${providerName}`,
    distribution_sheet: 'Distribution Sheet',
    preservation_of_evidence: `Preservation of Evidence${evidenceRecipient ? ` — ${evidenceRecipient.businessName}` : ''}`,
    medical_bill_request: `Medical Records & Bills Request — ${providerName}`,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-slate-200 w-full max-w-6xl h-[95vh] rounded-xl flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-slate-800 text-white px-6 py-4 flex justify-between items-center shadow-md z-10">
                <div>
                    <h3 className="text-lg font-bold flex items-center">
                        <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        {FORM_TITLES[formType]}
                    </h3>
                    <p className="text-xs text-slate-400">Generated on {today}</p>
                </div>
                <div className="flex items-center space-x-3">
                    {saved && (
                      <div className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium animate-fade-in mr-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                        Saved to case
                      </div>
                    )}
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                    {onSaveToDocuments && !saved && (
                      <button
                        onClick={() => {
                          onSaveToDocuments(FORM_TITLES[formType], formType);
                          setSaved(true);
                          setTimeout(() => setSaved(false), 3000);
                        }}
                        className="px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-lg flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                        Save to Case
                      </button>
                    )}
                    <button onClick={() => window.print()} className="px-5 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500 shadow-lg flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Print / Save PDF
                    </button>
                </div>
            </div>

            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-200">
                {formType === 'rep_lien' && renderRepAndLien()}
                {formType === 'foia' && renderFOIA()}
                {formType === 'intake_summary' && renderIntakeSummary()}
                {formType === 'boss_intake_form' && renderBossIntakeForm()}
                {formType === 'bill_request' && renderBillRequest()}
                {formType === 'records_request' && renderRecordsRequest()}
                {formType === 'hipaa_auth' && renderHIPAAAuth()}
                {formType === 'er_bill_request' && renderBillRequest()}
                {formType === 'er_records_request' && renderRecordsRequest()}
                {formType === 'preservation_of_evidence' && renderPreservationOfEvidence()}
                {formType === 'medical_bill_request' && renderMedicalBillRequest()}
                {formType === 'distribution_sheet' && (
                  <DistributionSheetRenderer
                    caseData={caseData}
                    firmName={attorneyFirm}
                    firmAddress1={attorneyAddress}
                    firmAddress2={attorneyCity}
                  />
                )}
            </div>
        </div>
    </div>
  );
};
