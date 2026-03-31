
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CaseFile, CaseStatus, CaseTask, ActivityLog, TeamNote, ChatMessage } from '../types';
import { NeedsAttentionPanel } from './NeedsAttentionPanel';
import { CaseTeamPanel } from './CaseTeamPanel';
import { useFirm } from '../contexts/FirmContext';

interface DashboardProps {
  cases: CaseFile[];
  onSelectCase: (c: CaseFile) => void;
  onOpenNewIntake: () => void;
  onUpdateCase: (c: CaseFile) => void;
  onDeleteCase: (caseId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ cases, onSelectCase, onOpenNewIntake, onUpdateCase, onDeleteCase }) => {
  const { firmMembers } = useFirm();
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Kanban Drag State
  const [draggedCaseId, setDraggedCaseId] = useState<string | null>(null);

  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [statusMenuPos, setStatusMenuPos] = useState<{ top: number; left: number; direction: 'below' | 'above' }>({ top: 0, left: 0, direction: 'below' });
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const statusButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; caseNumber?: string } | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
              setEditingStatusId(null);
          }
      };
      const handleScroll = (event: Event) => {
          if (statusMenuRef.current && statusMenuRef.current.contains(event.target as Node)) return;
          setEditingStatusId(null);
      };
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true);
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
          window.removeEventListener('scroll', handleScroll, true);
      };
  }, []);

  // Filter Logic
  const filteredCases = cases.filter(c => {
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      let matchTeam = true;
      if (teamFilter !== 'ALL') {
        if (teamFilter === 'Unassigned') {
          matchTeam = (!c.caseTeam || c.caseTeam.length === 0) && !c.assignedTo && !c.assignedTeam;
        } else if (teamFilter.startsWith('member:')) {
          const memberId = teamFilter.replace('member:', '');
          matchTeam = c.caseTeam?.some(m => m.userId === memberId) || c.assignedTo?.id === memberId || false;
        } else {
          matchTeam = c.assignedTeam === teamFilter;
        }
      }
      return matchStatus && matchTeam;
  });

  // Sorting Logic
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedCases = useMemo(() => {
    let sortableItems = [...filteredCases];
    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key === 'accidentDate') {
                const dateA = new Date(a.accidentDate).getTime();
                const dateB = new Date(b.accidentDate).getTime();
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            return 0;
        });
    }
    return sortableItems;
  }, [filteredCases, sortConfig]);

  const getStatusStyle = (status: CaseStatus) => {
    switch (status) {
      case CaseStatus.NEW: return 'bg-blue-100 text-blue-700 border-blue-200';
      case CaseStatus.REVIEW_NEEDED: return 'bg-amber-100 text-amber-700 border-amber-200';
      case CaseStatus.ACCEPTED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case CaseStatus.REJECTED: return 'bg-slate-100 text-slate-600 border-slate-200';
      case CaseStatus.LOST_CONTACT: return 'bg-stone-100 text-stone-600 border-stone-200';
      case CaseStatus.INTAKE_PROCESSING: return 'bg-sky-100 text-sky-700 border-sky-200';
      case CaseStatus.INTAKE_PAUSED: return 'bg-orange-100 text-orange-700 border-orange-200';
      case CaseStatus.INTAKE_COMPLETE: return 'bg-teal-100 text-teal-700 border-teal-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getInsuranceSummary = (c: CaseFile) => {
      const defIns = c.insurance?.find(i => i.type === 'Defendant');
      if (defIns) return `${defIns.provider} ${defIns.coverageLimits ? `(${defIns.coverageLimits})` : ''}`;
      const clientIns = c.insurance?.find(i => i.type === 'Client');
      if (clientIns) return `${clientIns.provider} (First Party)`;
      return 'Pending';
  };

  const getCaseAlerts = (c: CaseFile) => {
      const alerts: { label: string; color: string }[] = [];
      const defIns = (c.insurance || []).find(i => i.type === 'Defendant');
      if (defIns?.coverageStatus === 'pending') alerts.push({ label: 'Cov', color: 'bg-amber-100 text-amber-700 border-amber-200' });
      if (defIns?.liabilityStatus === 'pending' || defIns?.liabilityStatus === 'disputed') alerts.push({ label: 'Liab', color: 'bg-rose-100 text-rose-700 border-rose-200' });
      const overdueTasks = (c.tasks || []).filter(t => t.status !== 'completed' && new Date(t.dueDate) < new Date()).length;
      if (overdueTasks > 0) alerts.push({ label: `${overdueTasks} Task${overdueTasks > 1 ? 's' : ''}`, color: 'bg-red-100 text-red-700 border-red-200' });
      const overdueER = (c.erVisits || []).flatMap(v => v.bills).filter(b => b.status === 'requested' && b.requestDate && (Date.now() - new Date(b.requestDate).getTime()) > 30 * 24 * 60 * 60 * 1000).length;
      if (overdueER > 0) alerts.push({ label: `ER ${overdueER}`, color: 'bg-orange-100 text-orange-700 border-orange-200' });
      return alerts;
  };

  const kanbanColumns = [
      { title: 'New / Analyzing', statuses: [CaseStatus.NEW, CaseStatus.ANALYZING], color: 'border-blue-500' },
      { title: 'Review Needed', statuses: [CaseStatus.REVIEW_NEEDED], color: 'border-amber-500' },
      { title: 'Active / Processing', statuses: [CaseStatus.ACCEPTED, CaseStatus.INTAKE_PROCESSING], color: 'border-sky-500' },
      { title: 'On Hold', statuses: [CaseStatus.INTAKE_PAUSED, CaseStatus.LOST_CONTACT], color: 'border-orange-500' },
      { title: 'Closed', statuses: [CaseStatus.INTAKE_COMPLETE, CaseStatus.REJECTED], color: 'border-slate-500' },
  ];

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, caseId: string) => {
      setDraggedCaseId(caseId);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatuses: CaseStatus[]) => {
      e.preventDefault();
      if (!draggedCaseId) return;

      const caseToMove = cases.find(c => c.id === draggedCaseId);
      // If we found the case and it's not already in one of the target statuses
      if (caseToMove && !targetStatuses.includes(caseToMove.status)) {
          // Default to the first status in the list (e.g. drop in "New / Analyzing" -> become "NEW")
          const newStatus = targetStatuses[0];
          
          let updatedCase = { ...caseToMove, status: newStatus };
          
          // Add Activity Log
          const newLog = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'system' as const,
            message: `Status updated to ${newStatus} via board move.`,
            timestamp: new Date().toISOString()
          };
          updatedCase.activityLog = [newLog, ...(updatedCase.activityLog || [])];

          onUpdateCase(updatedCase);
      }
      setDraggedCaseId(null);
  };

  const handleStatusUpdate = (c: CaseFile, newStatus: CaseStatus) => {
      let updatedCase = { ...c, status: newStatus };
      const newLog = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'system' as const,
        message: `Status manually updated to ${newStatus}.`,
        timestamp: new Date().toISOString()
      };
      updatedCase.activityLog = [newLog, ...(updatedCase.activityLog || [])];
      onUpdateCase(updatedCase);
      setEditingStatusId(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Intake Dashboard</h1>
          <p className="text-slate-500 mt-2 text-lg">Manage incoming agency referrals and case status.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="bg-white border border-slate-200 p-1 rounded-lg flex items-center">
                <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Table View"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </button>
                <button 
                    onClick={() => setViewMode('kanban')}
                    className={`p-2 rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    title="Kanban View"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                </button>
            </div>
            <button
              onClick={onOpenNewIntake}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all flex items-center justify-center group"
            >
              <div className="bg-blue-500 p-1 rounded-lg mr-3 group-hover:bg-blue-600 transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </div>
              New Client Intake
            </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-2 rounded-xl border border-slate-200 w-fit">
            <div className="px-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filters:</span>
            </div>
            <select 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
            >
                <option value="ALL">All Statuses</option>
                <option value={CaseStatus.NEW}>New</option>
                <option value={CaseStatus.REVIEW_NEEDED}>Review Needed</option>
                <option value={CaseStatus.ACCEPTED}>Accepted</option>
                <option value={CaseStatus.REJECTED}>Rejected</option>
                <option value={CaseStatus.LOST_CONTACT}>Lost Contact</option>
                <option value={CaseStatus.INTAKE_PROCESSING}>Processing</option>
                <option value={CaseStatus.INTAKE_COMPLETE}>Complete</option>
            </select>

            <select
                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
            >
                <option value="ALL">All Assignees</option>
                <option value="Unassigned">Unassigned</option>
                {firmMembers.map(m => (
                  <option key={m.user_id} value={`member:${m.user_id}`}>
                    {m.user_profiles?.full_name || m.user_profiles?.email || 'Unknown'}
                  </option>
                ))}
            </select>
            
            {(statusFilter !== 'ALL' || teamFilter !== 'ALL') && (
                <button 
                    onClick={() => { setStatusFilter('ALL'); setTeamFilter('ALL'); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2"
                >
                    Reset
                </button>
            )}
      </div>

      <NeedsAttentionPanel
        cases={cases}
        onSelectCase={(caseId) => {
          const c = cases.find(x => x.id === caseId);
          if (c) onSelectCase(c);
        }}
      />

      {viewMode === 'table' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[200px] overflow-hidden">
             <div className="overflow-x-auto w-full relative">
                <table className="w-full min-w-[900px]">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Case ID</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Status</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Client Name</th>
                            <th
                                className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer group hover:text-blue-600 transition-colors select-none bg-slate-50"
                                onClick={() => handleSort('accidentDate')}
                            >
                                <span className="flex items-center">
                                    DOL
                                    <span className="ml-1 flex flex-col">
                                        <svg className={`w-2 h-2 ${sortConfig?.key === 'accidentDate' && sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-8 8h16l-8-8z" /></svg>
                                        <svg className={`w-2 h-2 -mt-0.5 ${sortConfig?.key === 'accidentDate' && sortConfig.direction === 'desc' ? 'text-blue-600' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l8-8H4l8 8z" /></svg>
                                    </span>
                                </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">
                                <span className="flex items-center">
                                    SOL Deadline
                                    <svg className="w-3 h-3 ml-1 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                </span>
                            </th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Description</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Impact</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Team</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Insurance</th>
                            <th className="px-3 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Alerts</th>
                            <th className="px-3 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                    {cases.length === 0 ? (
                        <tr>
                            <td colSpan={11} className="p-16 text-center text-slate-400 bg-slate-50/50">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                                </div>
                                <p className="text-xl font-medium text-slate-600">No active intakes</p>
                                <p className="text-slate-500 mt-2">Click "New Client Intake" to start.</p>
                            </td>
                        </tr>
                    ) : sortedCases.length === 0 ? (
                        <tr>
                            <td colSpan={11} className="p-16 text-center text-slate-400">
                                <p className="text-lg font-medium text-slate-500">No cases match your filters.</p>
                                <button onClick={() => { setStatusFilter('ALL'); setTeamFilter('ALL'); }} className="text-blue-600 font-bold mt-2 hover:underline">Clear Filters</button>
                            </td>
                        </tr>
                    ) : (
                        sortedCases.map((c) => (
                            <tr key={c.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onSelectCase(c)}>
                                <td className="px-3 py-3 align-middle">
                                    <span className="text-[11px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                                        {c.caseNumber || c.id.substring(0, 8)}
                                    </span>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <div className="relative">
                                        <button
                                            ref={(el) => { if (el) statusButtonRefs.current.set(c.id, el); }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (editingStatusId === c.id) {
                                                  setEditingStatusId(null);
                                                } else {
                                                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                                  const spaceBelow = window.innerHeight - rect.bottom;
                                                  const goAbove = spaceBelow < 320;
                                                  setStatusMenuPos({
                                                    top: goAbove ? rect.top : rect.bottom + 4,
                                                    left: rect.left,
                                                    direction: goAbove ? 'above' : 'below',
                                                  });
                                                  setEditingStatusId(c.id);
                                                }
                                            }}
                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border shadow-sm hover:opacity-80 transition-opacity ${getStatusStyle(c.status)}`}
                                        >
                                            <span className="truncate">{c.status === CaseStatus.INTAKE_PROCESSING ? 'Processing' : c.status.replace(/_/g, ' ')}</span>
                                            <svg className="w-3 h-3 ml-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {editingStatusId === c.id && (
                                            <div
                                              ref={statusMenuRef}
                                              className="fixed z-[100] bg-white border border-slate-200 shadow-xl rounded-xl w-48 py-1 animate-fade-in"
                                              style={{
                                                top: statusMenuPos.direction === 'above' ? undefined : statusMenuPos.top,
                                                bottom: statusMenuPos.direction === 'above' ? window.innerHeight - statusMenuPos.top + 4 : undefined,
                                                left: statusMenuPos.left,
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 bg-slate-50 rounded-t-xl">Update Status</div>
                                                <div className="max-h-60 overflow-y-auto">
                                                    {Object.values(CaseStatus).map((status) => (
                                                        <button
                                                            key={status}
                                                            onClick={() => handleStatusUpdate(c, status)}
                                                            className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-slate-50 flex items-center ${c.status === status ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}
                                                        >
                                                            <span className={`w-2 h-2 rounded-full mr-2 ${getStatusStyle(status).split(' ')[0]}`}></span>
                                                            {status.replace(/_/g, ' ')}
                                                            {c.status === status && <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <div className="relative group/name">
                                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors text-sm truncate">{c.clientName}</div>
                                        <div className="absolute left-0 bottom-full mb-1 z-50 hidden group-hover/name:block pointer-events-none">
                                            <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap max-w-xs">{c.clientName}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <div className="text-xs text-slate-500 font-medium whitespace-nowrap">{new Date(c.accidentDate).toLocaleDateString()}</div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    {c.statuteOfLimitationsDate ? (() => {
                                        const solDate = new Date(c.statuteOfLimitationsDate);
                                        const today = new Date();
                                        const daysRemaining = Math.floor((solDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                        const isCritical = daysRemaining < 30;
                                        const isUrgent = daysRemaining < 90;
                                        return (
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`text-[11px] font-bold whitespace-nowrap ${
                                                    isCritical ? 'text-rose-600' : isUrgent ? 'text-amber-600' : 'text-slate-600'
                                                }`}>
                                                    {solDate.toLocaleDateString()}
                                                </span>
                                                <span className={`text-[10px] font-medium ${
                                                    isCritical ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-slate-400'
                                                }`}>
                                                    {daysRemaining > 0 ? `${daysRemaining}d left` : 'EXPIRED'}
                                                </span>
                                            </div>
                                        );
                                    })() : (
                                        <span className="text-[10px] text-rose-500 font-bold">NOT SET</span>
                                    )}
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <div className="relative group/desc">
                                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{c.description}</p>
                                        <div className="absolute left-0 bottom-full mb-1 z-50 hidden group-hover/desc:block pointer-events-none">
                                            <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg max-w-sm whitespace-normal leading-relaxed">{c.description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <div className="relative group/impact">
                                        {c.impact ? (
                                            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200 inline-block truncate max-w-full">
                                                {c.impact}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic">--</span>
                                        )}
                                        {c.impact && (
                                            <div className="absolute left-0 bottom-full mb-1 z-50 hidden group-hover/impact:block pointer-events-none">
                                                <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap max-w-xs">{c.impact}</div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <CaseTeamPanel
                                      compact
                                      team={c.caseTeam || []}
                                      onChange={(newTeam) => {
                                        onUpdateCase({ ...c, caseTeam: newTeam });
                                      }}
                                    />
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <div className="relative group/ins">
                                        <span className="text-xs font-medium text-slate-700 block truncate">
                                            {getInsuranceSummary(c)}
                                        </span>
                                        <div className="absolute left-0 bottom-full mb-1 z-50 hidden group-hover/ins:block pointer-events-none">
                                            <div className="bg-slate-800 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap max-w-xs">{getInsuranceSummary(c)}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <div className="flex flex-wrap gap-1">
                                        {getCaseAlerts(c).map((alert, idx) => (
                                            <span key={idx} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${alert.color}`}>{alert.label}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-3 py-3 align-middle">
                                    <div className="flex items-center justify-center gap-1">
                                        <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View Case">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirm({ id: c.id, name: c.clientName, caseNumber: c.caseNumber });
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="Delete Case"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
             </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-6 min-h-[500px]">
            {kanbanColumns.map((col) => {
                const colCases = sortedCases.filter(c => col.statuses.includes(c.status));
                const isDragTarget = draggedCaseId && !colCases.some(c => c.id === draggedCaseId);
                
                return (
                    <div 
                        key={col.title} 
                        className={`flex-shrink-0 w-80 flex flex-col transition-colors rounded-xl p-2 -m-2 ${isDragTarget ? 'bg-slate-100' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, col.statuses)}
                    >
                        <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${col.color} mx-2 mt-2`}>
                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{col.title}</h3>
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{colCases.length}</span>
                        </div>
                        <div className="flex-1 space-y-3 px-2 pb-2">
                            {colCases.map(c => {
                                const isExpanded = expandedCardId === c.id;
                                return (
                                <div
                                    key={c.id}
                                    draggable={!isExpanded}
                                    onDragStart={(e) => handleDragStart(e, c.id)}
                                    className={`bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group active:cursor-grabbing ${draggedCaseId === c.id ? 'opacity-50 border-dashed border-slate-400' : ''}`}
                                >
                                    <div className="p-4" onClick={() => onSelectCase(c)}>
                                        <div className="flex justify-between items-start mb-1 pointer-events-none">
                                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors truncate mr-2">{c.clientName}</h4>
                                            <span className="text-[10px] font-medium text-slate-400 flex-shrink-0">{new Date(c.accidentDate).toLocaleDateString(undefined, { month:'numeric', day:'numeric'})}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mb-2 pointer-events-none">
                                            <p className="text-xs text-slate-500 line-clamp-1 flex-1 min-w-0">{c.description}</p>
                                            {c.statuteOfLimitationsDate ? (() => {
                                                const solDate = new Date(c.statuteOfLimitationsDate);
                                                const today = new Date();
                                                const daysRemaining = Math.floor((solDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                                const isCritical = daysRemaining < 30;
                                                const isUrgent = daysRemaining < 90;
                                                return (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap ${
                                                        isCritical ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                                        isUrgent ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                        'bg-slate-50 text-slate-500 border border-slate-200'
                                                    }`}>
                                                        {daysRemaining > 0 ? `${daysRemaining}d` : 'EXP'}
                                                    </span>
                                                );
                                            })() : (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 flex-shrink-0">
                                                    SOL?
                                                </span>
                                            )}
                                        </div>

                                        {getCaseAlerts(c).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-2 pointer-events-none">
                                                {getCaseAlerts(c).map((alert, idx) => (
                                                    <span key={idx} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${alert.color}`}>{alert.label}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 pointer-events-none">
                                                <CaseTeamPanel
                                                  compact
                                                  team={c.caseTeam || []}
                                                  onChange={() => {}}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 pointer-events-none">
                                                {c.impact && (
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                                        {c.impact}
                                                    </span>
                                                )}
                                                {c.aiAnalysis && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.aiAnalysis.caseScore >= 8 ? 'bg-green-100 text-green-700' : c.aiAnalysis.caseScore >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                                        AI: {c.aiAnalysis.caseScore}/10
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-4 pb-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedCardId(isExpanded ? null : c.id);
                                            }}
                                            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] font-medium text-slate-400 hover:text-blue-600 transition-colors rounded-md hover:bg-slate-50"
                                        >
                                            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                            {isExpanded ? 'Collapse' : 'Details'}
                                        </button>
                                    </div>
                                    {isExpanded && (
                                        <KanbanCardDetails caseData={c} onSelectCase={() => onSelectCase(c)} />
                                    )}
                                </div>
                                );
                            })}
                            {colCases.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
                                    <p className="text-xs text-slate-400">Drop here</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center">Delete Case</h3>
              <p className="text-sm text-slate-500 text-center mt-2">
                Are you sure you want to permanently delete the case for <span className="font-semibold text-slate-700">{deleteConfirm.name}</span>
                {deleteConfirm.caseNumber && <> (<span className="font-mono text-blue-600">{deleteConfirm.caseNumber}</span>)</>}
                ? This action cannot be undone.
              </p>
            </div>
            <div className="flex border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteCase(deleteConfirm.id);
                  setDeleteConfirm(null);
                }}
                className="flex-1 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors border-l border-slate-100"
              >
                Delete Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const KanbanCardDetails: React.FC<{ caseData: CaseFile; onSelectCase: () => void }> = ({ caseData, onSelectCase }) => {
  const [tab, setTab] = useState<'tasks' | 'activity' | 'notes' | 'chats'>('tasks');

  const recentTasks = (caseData.tasks || [])
    .sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (a.status !== 'open' && b.status === 'open') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, 5);

  const recentActivity = (caseData.activityLog || []).slice(0, 5);
  const recentNotes = (caseData.teamNotes || []).slice(0, 5);
  const recentChats = (caseData.chatHistory || []).slice(0, 5);

  const tabs = [
    { id: 'tasks' as const, label: 'Tasks', count: recentTasks.length },
    { id: 'activity' as const, label: 'Activity', count: recentActivity.length },
    { id: 'notes' as const, label: 'Notes', count: recentNotes.length },
    { id: 'chats' as const, label: 'Chats', count: recentChats.length },
  ].filter(t => t.count > 0);

  const resolvedTab = tabs.find(t => t.id === tab) ? tab : (tabs[0]?.id || 'tasks');
  const hasAny = tabs.length > 0;

  return (
    <div className="border-t border-slate-100 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
      {!hasAny ? (
        <p className="text-[10px] text-slate-400 text-center py-3 italic">No recent activity</p>
      ) : (
        <>
          <div className="flex gap-0.5 my-2 bg-slate-50 rounded-lg p-0.5">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 text-[10px] font-semibold py-1.5 px-1 rounded-md transition-all ${
                  resolvedTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.label}
                <span className={`ml-0.5 text-[8px] ${resolvedTab === t.id ? 'text-blue-600' : 'text-slate-300'}`}>{t.count}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {resolvedTab === 'tasks' && recentTasks.map(task => (
              <div
                key={task.id}
                onClick={onSelectCase}
                className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-slate-50/70 border border-slate-100 cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition-colors"
              >
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  task.status === 'completed' ? 'bg-emerald-500' : task.status === 'overdue' ? 'bg-rose-500' : 'border-2 border-slate-300'
                }`}>
                  {task.status === 'completed' && (
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {task.status === 'overdue' && (
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4m0 4h.01" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium leading-tight ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.priority === 'high' && (
                      <span className="text-[8px] font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded">HIGH</span>
                    )}
                    <span className="text-[9px] text-slate-400">
                      {task.status === 'completed' && task.completedDate
                        ? `Done ${formatTimeAgo(task.completedDate)}`
                        : `Due ${task.dueDate}`}
                    </span>
                    {task.assignedTo && (
                      <span className="text-[9px] font-medium text-slate-500 flex items-center gap-1 ml-auto">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[7px] font-bold flex-shrink-0">
                          {task.assignedTo.initials}
                        </span>
                        {task.assignedTo.name.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {resolvedTab === 'activity' && recentActivity.map(a => (
              <div key={a.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-slate-50/70 border border-slate-100">
                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  a.type === 'system' ? 'bg-blue-100' : a.type === 'note' ? 'bg-amber-100' : 'bg-slate-100'
                }`}>
                  {a.type === 'system' ? (
                    <svg className="w-2 h-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ) : (
                    <svg className="w-2 h-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-600 leading-tight">{a.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {a.author && <span className="text-[9px] font-medium text-slate-500">{a.author}</span>}
                    <span className="text-[9px] text-slate-400">{formatTimeAgo(a.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}

            {resolvedTab === 'notes' && recentNotes.map(note => (
              <div key={note.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-amber-50/50 border border-amber-100">
                <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[7px] font-bold text-amber-800">{note.authorInitials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-700 leading-tight">{note.content}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-medium text-amber-700">{note.authorName}</span>
                    <span className="text-[9px] text-slate-400">{formatTimeAgo(note.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))}

            {resolvedTab === 'chats' && recentChats.map(chat => (
              <div key={chat.id} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg border ${
                chat.isCurrentUser ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50/70 border-slate-100'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  chat.isCurrentUser ? 'bg-blue-200' : 'bg-slate-200'
                }`}>
                  <span className={`text-[7px] font-bold ${chat.isCurrentUser ? 'text-blue-800' : 'text-slate-600'}`}>
                    {chat.senderInitials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-700 leading-tight">{chat.message}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] font-medium text-slate-500">{chat.sender}</span>
                    <span className="text-[9px] text-slate-400">{formatTimeAgo(chat.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
