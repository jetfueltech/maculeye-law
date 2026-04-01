import React, { useState, useRef, useEffect } from 'react';
import { Assignee } from '../types';
import { useFirm } from '../contexts/FirmContext';

interface MemberPickerProps {
  value: Assignee | null | undefined;
  onChange: (member: Assignee | null) => void;
  compact?: boolean;
  placeholder?: string;
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
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

export const MemberPicker: React.FC<MemberPickerProps> = ({ value, onChange, compact, placeholder }) => {
  const { firmMembers } = useFirm();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const members = firmMembers.map(m => ({
    id: m.user_id,
    name: m.user_profiles?.full_name || m.user_profiles?.email || 'Unknown',
    initials: m.user_profiles?.avatar_initials || getInitials(m.user_profiles?.full_name || '??'),
    role: m.role,
  }));

  const filtered = search
    ? members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : members;

  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="flex items-center gap-1 group"
          title={value ? value.name : (placeholder || 'Assign')}
        >
          {value ? (
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${colorForId(value.id)} ring-2 ring-white`}>
              {value.initials}
            </span>
          ) : (
            <span className="w-6 h-6 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-400 group-hover:border-blue-400 group-hover:text-blue-500 transition-colors">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </span>
          )}
        </button>

        {open && (
          <div className="absolute top-8 left-0 z-50 bg-white border border-stone-200 shadow-xl rounded-xl w-56 py-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2">
              <input
                type="text"
                placeholder="Search members..."
                className="w-full text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {value && (
                <button
                  onClick={() => { onChange(null); setOpen(false); setSearch(''); }}
                  className="w-full text-left px-3 py-2 text-xs text-stone-500 hover:bg-stone-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Unassign
                </button>
              )}
              {filtered.length === 0 && (
                <div className="px-3 py-4 text-xs text-stone-400 text-center">No members found</div>
              )}
              {filtered.map(m => (
                <button
                  key={m.id}
                  onClick={() => { onChange({ id: m.id, name: m.name, initials: m.initials }); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 flex items-center gap-2 ${value?.id === m.id ? 'bg-blue-50 text-blue-700' : 'text-stone-700'}`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorForId(m.id)}`}>
                    {m.initials}
                  </span>
                  <span className="truncate font-medium">{m.name}</span>
                  <span className="text-[10px] text-stone-400 ml-auto flex-shrink-0">{m.role}</span>
                  {value?.id === m.id && (
                    <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-lg hover:border-blue-300 transition-colors text-sm group w-full"
      >
        {value ? (
          <>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${colorForId(value.id)}`}>
              {value.initials}
            </span>
            <span className="text-stone-800 font-medium truncate">{value.name}</span>
          </>
        ) : (
          <>
            <span className="w-6 h-6 rounded-full border-2 border-dashed border-stone-300 flex items-center justify-center text-stone-400 group-hover:border-blue-400 group-hover:text-blue-500 transition-colors flex-shrink-0">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </span>
            <span className="text-stone-400 text-xs">{placeholder || 'Assign member'}</span>
          </>
        )}
        <svg className="w-3 h-3 ml-auto text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-50 bg-white border border-stone-200 shadow-xl rounded-xl w-64 py-1 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="px-3 py-2">
            <input
              type="text"
              placeholder="Search members..."
              className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {value && (
              <button
                onClick={() => { onChange(null); setOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 flex items-center gap-2 border-b border-stone-100"
              >
                <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Unassign
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-3 py-6 text-sm text-stone-400 text-center">No members found</div>
            )}
            {filtered.map(m => (
              <button
                key={m.id}
                onClick={() => { onChange({ id: m.id, name: m.name, initials: m.initials }); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2.5 text-sm hover:bg-stone-50 flex items-center gap-2.5 ${value?.id === m.id ? 'bg-blue-50 text-blue-700' : 'text-stone-700'}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${colorForId(m.id)}`}>
                  {m.initials}
                </span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.name}</div>
                  <div className="text-[10px] text-stone-400 capitalize">{m.role}</div>
                </div>
                {value?.id === m.id && (
                  <svg className="w-4 h-4 text-blue-600 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
