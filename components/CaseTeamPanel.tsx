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
  'bg-stone-100 text-stone-700',
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
          <span className="text-[10px] text-stone-400 italic">No team</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-stone-700">Case Team</h3>
        <div className="relative" ref={addRef}>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Member
          </button>

          {showAdd && (
            <div className="absolute right-0 top-8 z-50 bg-white border border-stone-200 shadow-xl rounded-xl w-72 py-1 animate-fade-in">
              <div className="px-3 py-2 space-y-2 border-b border-stone-100">
                <input
                  type="text"
                  placeholder="Search members..."
                  className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                <select
                  className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
                  <div className="px-3 py-4 text-xs text-stone-400 text-center">
                    {availableMembers.length === 0 ? 'All members assigned' : 'No matches'}
                  </div>
                )}
                {filteredMembers.map(m => (
                  <button
                    key={m.userId}
                    onClick={() => handleAdd(m)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 text-stone-700"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorForId(m.userId)}`}>
                      {m.initials}
                    </span>
                    <span className="truncate font-medium">{m.name}</span>
                    <span className="text-[10px] text-stone-400 ml-auto flex-shrink-0 capitalize">{m.firmRole}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {team.length === 0 ? (
        <div className="flex items-center gap-2 py-1">
          <span className="w-6 h-6 rounded-full border-2 border-dashed border-stone-200 flex items-center justify-center text-stone-300">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </span>
          <span className="text-xs text-stone-400">No team members</span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {team.map(m => (
            <div key={m.id} className="flex items-center gap-1.5 group py-0.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorForId(m.userId)}`}>
                {m.initials}
              </span>
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-xs font-medium text-stone-800 truncate">{m.name}</span>
                <div className="relative">
                  <button
                    onClick={() => setEditingMemberId(editingMemberId === m.id ? null : m.id)}
                    className="text-[10px] text-stone-400 hover:text-stone-600 whitespace-nowrap"
                  >
                    ({CASE_TEAM_ROLE_LABELS[m.role]})
                  </button>
                  {editingMemberId === m.id && (
                    <div className="absolute left-0 top-5 z-50 bg-white border border-stone-200 shadow-lg rounded-lg w-40 py-1 animate-fade-in">
                      {ROLES.map(r => (
                        <button
                          key={r}
                          onClick={() => handleRoleChange(m.id, r)}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-stone-50 ${m.role === r ? 'text-blue-600 bg-blue-50 font-semibold' : 'text-stone-700'}`}
                        >
                          {CASE_TEAM_ROLE_LABELS[r]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemove(m.id)}
                className="p-0.5 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                title="Remove"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
