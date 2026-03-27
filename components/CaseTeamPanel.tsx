import React, { useState, useRef, useEffect } from 'react';
import { CaseTeamMember, CaseTeamRole, CASE_TEAM_ROLE_LABELS } from '../types';
import { useFirm } from '../contexts/FirmContext';

interface CaseTeamPanelProps {
  team: CaseTeamMember[];
  onChange: (team: CaseTeamMember[]) => void;
  compact?: boolean;
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-slate-100 text-slate-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const ROLES: CaseTeamRole[] = ['primary_attorney', 'paralegal', 'legal_assistant', 'staff'];

export const CaseTeamPanel: React.FC<CaseTeamPanelProps> = ({ team, onChange, compact }) => {
  const { firmMembers } = useFirm();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<CaseTeamRole>('staff');
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const addRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addRef.current && !addRef.current.contains(e.target as Node)) {
        setShowAdd(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const availableMembers = firmMembers
    .map(m => ({
      userId: m.user_id,
      name: m.user_profiles?.full_name || m.user_profiles?.email || 'Unknown',
      initials: m.user_profiles?.avatar_initials || getInitials(m.user_profiles?.full_name || '??'),
      firmRole: m.role,
    }))
    .filter(m => !team.some(t => t.userId === m.userId));

  const filteredMembers = search
    ? availableMembers.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : availableMembers;

  const handleAdd = (member: typeof availableMembers[0]) => {
    const newMember: CaseTeamMember = {
      id: crypto.randomUUID(),
      userId: member.userId,
      name: member.name,
      initials: member.initials,
      role: selectedRole,
    };
    onChange([...team, newMember]);
    setShowAdd(false);
    setSearch('');
    setSelectedRole('staff');
  };

  const handleRemove = (memberId: string) => {
    onChange(team.filter(m => m.id !== memberId));
  };

  const handleRoleChange = (memberId: string, newRole: CaseTeamRole) => {
    onChange(team.map(m => m.id === memberId ? { ...m, role: newRole } : m));
    setEditingMemberId(null);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {team.map(m => (
          <span
            key={m.id}
            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white cursor-default ${colorForId(m.userId)}`}
            title={`${m.name} - ${CASE_TEAM_ROLE_LABELS[m.role]}`}
          >
            {m.initials}
          </span>
        ))}
        {team.length === 0 && (
          <span className="text-[10px] text-slate-400 italic">No team</span>
        )}
      </div>
    );
  }

  const grouped = ROLES.reduce<Record<CaseTeamRole, CaseTeamMember[]>>((acc, role) => {
    acc[role] = team.filter(m => m.role === role);
    return acc;
  }, { primary_attorney: [], paralegal: [], legal_assistant: [], staff: [] });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Case Team</h3>
        <div className="relative" ref={addRef}>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Member
          </button>

          {showAdd && (
            <div className="absolute right-0 top-8 z-50 bg-white border border-slate-200 shadow-xl rounded-xl w-72 py-1 animate-fade-in">
              <div className="px-3 py-2 space-y-2 border-b border-slate-100">
                <input
                  type="text"
                  placeholder="Search members..."
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <select
                  className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as CaseTeamRole)}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>{CASE_TEAM_ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredMembers.length === 0 && (
                  <div className="px-3 py-4 text-xs text-slate-400 text-center">
                    {availableMembers.length === 0 ? 'All members assigned' : 'No matches'}
                  </div>
                )}
                {filteredMembers.map(m => (
                  <button
                    key={m.userId}
                    onClick={() => handleAdd(m)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorForId(m.userId)}`}>
                      {m.initials}
                    </span>
                    <span className="truncate font-medium">{m.name}</span>
                    <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0 capitalize">{m.firmRole}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {team.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
          <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <p className="text-xs text-slate-400">No team members assigned</p>
          <p className="text-[10px] text-slate-300 mt-1">Click "Add Member" to build the case team</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ROLES.map(role => {
            const members = grouped[role];
            if (members.length === 0) return null;
            return (
              <div key={role}>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-1">
                  {CASE_TEAM_ROLE_LABELS[role]}
                </div>
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 group transition-colors">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${colorForId(m.userId)}`}>
                      {m.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-800 truncate">{m.name}</div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setEditingMemberId(editingMemberId === m.id ? null : m.id)}
                        className="text-[10px] text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {CASE_TEAM_ROLE_LABELS[m.role]}
                        <svg className="w-2.5 h-2.5 inline ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {editingMemberId === m.id && (
                        <div className="absolute right-0 top-6 z-50 bg-white border border-slate-200 shadow-lg rounded-lg w-40 py-1 animate-fade-in">
                          {ROLES.map(r => (
                            <button
                              key={r}
                              onClick={() => handleRoleChange(m.id, r)}
                              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 ${m.role === r ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-slate-700'}`}
                            >
                              {CASE_TEAM_ROLE_LABELS[r]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove from team"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
