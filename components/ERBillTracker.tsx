import React, { useState } from 'react';
import { CaseFile, ERVisit, ERBillLine, ERBillStatus, ActivityLog } from '../types';

interface ERBillTrackerProps {
  caseData: CaseFile;
  onUpdateCase: (c: CaseFile) => void;
}

const BILL_STATUS_LABELS: Record<ERBillStatus, string> = {
  not_requested: 'Not Requested',
  requested: 'Requested',
  received: 'Received',
  na: 'N/A',
};

const BILL_STATUS_COLORS: Record<ERBillStatus, string> = {
  not_requested: 'bg-slate-100 text-slate-600 border-slate-200',
  requested: 'bg-blue-50 text-blue-700 border-blue-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  na: 'bg-slate-50 text-slate-400 border-slate-200',
};

const BILL_TYPE_LABELS: Record<string, string> = {
  facility: 'ER Facility',
  physician: 'ER Physician',
  radiology: 'ER Radiology',
};

function addActivity(c: CaseFile, message: string): CaseFile {
  const log: ActivityLog = {
    id: Math.random().toString(36).substr(2, 9),
    type: 'system',
    message,
    timestamp: new Date().toISOString(),
  };
  return { ...c, activityLog: [log, ...(c.activityLog || [])] };
}

function createEmptyERVisit(): ERVisit {
  return {
    id: `er-${Date.now()}`,
    facilityName: '',
    visitDate: '',
    bills: [
      { type: 'facility', status: 'not_requested' },
      { type: 'physician', status: 'not_requested' },
      { type: 'radiology', status: 'not_requested' },
    ],
    recordStatus: 'not_requested',
  };
}

function getDaysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export const ERBillTracker: React.FC<ERBillTrackerProps> = ({ caseData, onUpdateCase }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVisit, setNewVisit] = useState<ERVisit>(createEmptyERVisit());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const erVisits = caseData.erVisits || [];
  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";

  const isAllReceived = (visit: ERVisit) => {
    const billsOk = visit.bills.every(b => b.status === 'received' || b.status === 'na');
    const recordOk = visit.recordStatus === 'received' || visit.recordStatus === 'na';
    return billsOk && recordOk;
  };

  const hasOverdueItems = (visit: ERVisit) => {
    for (const bill of visit.bills) {
      if (bill.status === 'requested' && bill.requestDate) {
        const days = getDaysSince(bill.requestDate);
        if (days !== null && days > 30) return true;
      }
    }
    if (visit.recordStatus === 'requested' && visit.recordRequestDate) {
      const days = getDaysSince(visit.recordRequestDate);
      if (days !== null && days > 30) return true;
    }
    return false;
  };

  const handleAddVisit = () => {
    if (!newVisit.facilityName.trim()) return;
    const visits = [...erVisits, newVisit];
    let updated = { ...caseData, erVisits: visits };
    updated = addActivity(updated, `ER visit added: ${newVisit.facilityName}`);
    onUpdateCase(updated);
    setNewVisit(createEmptyERVisit());
    setShowAddForm(false);
    setExpandedId(newVisit.id);
  };

  const handleDeleteVisit = (id: string) => {
    if (!window.confirm('Remove this ER visit?')) return;
    const visits = erVisits.filter(v => v.id !== id);
    let updated = { ...caseData, erVisits: visits };
    updated = addActivity(updated, `ER visit removed`);
    onUpdateCase(updated);
    if (expandedId === id) setExpandedId(null);
  };

  const updateVisit = (id: string, updates: Partial<ERVisit>) => {
    const visits = erVisits.map(v => v.id === id ? { ...v, ...updates } : v);
    onUpdateCase({ ...caseData, erVisits: visits });
  };

  const updateBill = (visitId: string, billType: string, updates: Partial<ERBillLine>) => {
    const visits = erVisits.map(v => {
      if (v.id !== visitId) return v;
      const bills = v.bills.map(b => b.type === billType ? { ...b, ...updates } : b);
      return { ...v, bills };
    });
    let updated = { ...caseData, erVisits: visits };
    if (updates.status) {
      const visit = erVisits.find(v => v.id === visitId);
      updated = addActivity(updated, `ER ${BILL_TYPE_LABELS[billType]} bill status updated to "${BILL_STATUS_LABELS[updates.status]}" for ${visit?.facilityName || 'Unknown'}`);
    }
    onUpdateCase(updated);
  };

  const totalOverdue = erVisits.filter(hasOverdueItems).length;
  const totalComplete = erVisits.filter(isAllReceived).length;

  return (
    <div className="space-y-6">
      {totalOverdue > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z"/></svg>
          <div>
            <p className="text-sm font-bold text-rose-800">{totalOverdue} ER visit(s) with overdue records or bills</p>
            <p className="text-xs text-rose-600 mt-0.5">Requests older than 30 days need weekly follow-up. Demand cannot be sent until all ER components are received.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ER Visits</div>
          <div className="text-2xl font-bold text-slate-900">{erVisits.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-rose-200 p-5">
          <div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Overdue (30+ Days)</div>
          <div className="text-2xl font-bold text-rose-600">{totalOverdue}</div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-5">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Complete</div>
          <div className="text-2xl font-bold text-emerald-600">{totalComplete} / {erVisits.length}</div>
        </div>
      </div>

      {showAddForm ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-slate-800">Add ER Visit</h4>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">ER Facility Name</label>
              <input className={inputClass} value={newVisit.facilityName} onChange={e => setNewVisit({ ...newVisit, facilityName: e.target.value })} placeholder="e.g. Northwestern Memorial ER" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Visit Date</label>
              <input type="date" className={inputClass} value={newVisit.visitDate} onChange={e => setNewVisit({ ...newVisit, visitDate: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-slate-500">Three bill lines (Facility, Physician, Radiology) will be auto-created for tracking.</p>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button onClick={handleAddVisit} disabled={!newVisit.facilityName.trim()} className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">Add ER Visit</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddForm(true)} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
          + Add ER Visit
        </button>
      )}

      <div className="space-y-4">
        {erVisits.map(visit => {
          const isExpanded = expandedId === visit.id;
          const allDone = isAllReceived(visit);
          const overdue = hasOverdueItems(visit);

          return (
            <div key={visit.id} className={`bg-white rounded-2xl border overflow-hidden transition-all ${overdue ? 'border-rose-200' : allDone ? 'border-emerald-200' : 'border-slate-200'}`}>
              <div
                className="px-6 py-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : visit.id)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                    allDone ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                    overdue ? 'bg-rose-50 text-rose-600 border-rose-200' :
                    'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900">{visit.facilityName}</h4>
                      {allDone && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Complete</span>}
                      {overdue && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">Overdue</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                      {visit.visitDate && <span>Visit: {new Date(visit.visitDate).toLocaleDateString()}</span>}
                      <span>{visit.bills.filter(b => b.status === 'received').length}/3 bills received</span>
                      <span>Record: {BILL_STATUS_LABELS[visit.recordStatus]}</span>
                    </div>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 p-6 space-y-6">
                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Medical Record</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                        <select
                          className={inputClass}
                          value={visit.recordStatus}
                          onChange={e => {
                            const updates: Partial<ERVisit> = { recordStatus: e.target.value as ERBillStatus };
                            if (e.target.value === 'requested' && !visit.recordRequestDate) updates.recordRequestDate = new Date().toISOString().split('T')[0];
                            if (e.target.value === 'received') updates.recordReceivedDate = new Date().toISOString().split('T')[0];
                            updateVisit(visit.id, updates);
                          }}
                        >
                          {Object.entries(BILL_STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Request Date</label>
                        <input type="date" className={inputClass} value={visit.recordRequestDate || ''} onChange={e => updateVisit(visit.id, { recordRequestDate: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Follow-up Date</label>
                        <input type="date" className={inputClass} value={visit.recordFollowUpDate || ''} onChange={e => updateVisit(visit.id, { recordFollowUpDate: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-1 border-b border-slate-100">Bills (3-Bill Rule)</h5>
                    <div className="space-y-4">
                      {visit.bills.map(bill => {
                        const daysSinceRequest = getDaysSince(bill.requestDate);
                        const billOverdue = bill.status === 'requested' && daysSinceRequest !== null && daysSinceRequest > 30;

                        return (
                          <div key={bill.type} className={`rounded-xl border p-4 ${billOverdue ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">{BILL_TYPE_LABELS[bill.type]}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${BILL_STATUS_COLORS[bill.status]}`}>
                                  {BILL_STATUS_LABELS[bill.status]}
                                </span>
                                {billOverdue && (
                                  <span className="text-[10px] font-bold text-rose-600">{daysSinceRequest}d since request</span>
                                )}
                              </div>
                              {bill.amount !== undefined && (
                                <span className="text-sm font-bold text-slate-900">
                                  ${bill.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                                <select
                                  className={inputClass}
                                  value={bill.status}
                                  onChange={e => {
                                    const updates: Partial<ERBillLine> = { status: e.target.value as ERBillStatus };
                                    if (e.target.value === 'requested' && !bill.requestDate) updates.requestDate = new Date().toISOString().split('T')[0];
                                    if (e.target.value === 'received') updates.receivedDate = new Date().toISOString().split('T')[0];
                                    updateBill(visit.id, bill.type, updates);
                                  }}
                                >
                                  {Object.entries(BILL_STATUS_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Request Date</label>
                                <input type="date" className={inputClass} value={bill.requestDate || ''} onChange={e => updateBill(visit.id, bill.type, { requestDate: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Follow-up Date</label>
                                <input type="date" className={inputClass} value={bill.followUpDate || ''} onChange={e => updateBill(visit.id, bill.type, { followUpDate: e.target.value })} />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount ($)</label>
                                <input type="number" step="0.01" className={inputClass} value={bill.amount ?? ''} onChange={e => updateBill(visit.id, bill.type, { amount: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="0.00" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteVisit(visit.id)}
                      className="px-4 py-2 text-sm font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      Remove ER Visit
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
