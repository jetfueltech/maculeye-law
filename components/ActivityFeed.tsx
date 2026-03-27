import React, { useState, useMemo } from 'react';
import { CaseFile, ActivityLog } from '../types';

interface ActivityFeedProps {
  cases: CaseFile[];
  onSelectCase: (c: CaseFile) => void;
}

interface FeedEntry {
  log: ActivityLog;
  caseId: string;
  caseNumber?: string;
  clientName: string;
}

type FilterType = 'all' | 'system' | 'user' | 'note';
type TimeRange = 'today' | '7days' | '30days' | 'all';

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function groupByDate(entries: FeedEntry[]): Record<string, FeedEntry[]> {
  const groups: Record<string, FeedEntry[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const entry of entries) {
    const d = new Date(entry.log.timestamp);
    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }
  return groups;
}

const TYPE_CONFIG: Record<string, { dot: string; bg: string; label: string }> = {
  system: { dot: 'bg-blue-400', bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'System' },
  user: { dot: 'bg-emerald-400', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'User' },
  note: { dot: 'bg-amber-400', bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Note' },
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ cases, onSelectCase }) => {
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('7days');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCaseFilter, setSelectedCaseFilter] = useState<string>('all');

  const allEntries = useMemo(() => {
    const entries: FeedEntry[] = [];
    for (const c of cases) {
      if (!c.activityLog) continue;
      for (const log of c.activityLog) {
        entries.push({
          log,
          caseId: c.id,
          caseNumber: c.caseNumber,
          clientName: c.clientName,
        });
      }
    }
    entries.sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime());
    return entries;
  }, [cases]);

  const filteredEntries = useMemo(() => {
    let result = allEntries;

    if (filterType !== 'all') {
      result = result.filter(e => e.log.type === filterType);
    }

    if (selectedCaseFilter !== 'all') {
      result = result.filter(e => e.caseId === selectedCaseFilter);
    }

    if (timeRange !== 'all') {
      const now = Date.now();
      const cutoff = timeRange === 'today' ? 86400000 : timeRange === '7days' ? 604800000 : 2592000000;
      result = result.filter(e => now - new Date(e.log.timestamp).getTime() < cutoff);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.log.message.toLowerCase().includes(q) ||
        e.clientName.toLowerCase().includes(q) ||
        (e.log.author || '').toLowerCase().includes(q) ||
        (e.caseNumber || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [allEntries, filterType, timeRange, searchQuery, selectedCaseFilter]);

  const grouped = useMemo(() => groupByDate(filteredEntries), [filteredEntries]);

  const stats = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    const todayEntries = allEntries.filter(e => now - new Date(e.log.timestamp).getTime() < day);
    const weekEntries = allEntries.filter(e => now - new Date(e.log.timestamp).getTime() < 7 * day);
    const activeCases = new Set(todayEntries.map(e => e.caseId)).size;
    return {
      today: todayEntries.length,
      week: weekEntries.length,
      activeCases,
      total: allEntries.length,
    };
  }, [allEntries]);

  const casesWithActivity = useMemo(() => {
    const map = new Map<string, { id: string; label: string; count: number }>();
    for (const e of allEntries) {
      const existing = map.get(e.caseId);
      if (existing) {
        existing.count++;
      } else {
        map.set(e.caseId, {
          id: e.caseId,
          label: e.caseNumber ? `${e.caseNumber} - ${e.clientName}` : e.clientName,
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allEntries]);

  const caseForEntry = (caseId: string) => cases.find(c => c.id === caseId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Feed</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time overview of all case activity across your firm</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.today}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Activities Today</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.week}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">This Week</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.activeCases}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Active Cases Today</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          <div className="text-xs font-medium text-slate-500 mt-1">Total Activities</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search activities..."
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {([['all', 'All'], ['system', 'System'], ['user', 'User'], ['note', 'Notes']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterType(val)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  filterType === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <select
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as TimeRange)}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>

          <select
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px] truncate"
            value={selectedCaseFilter}
            onChange={e => setSelectedCaseFilter(e.target.value)}
          >
            <option value="all">All Cases</option>
            {casesWithActivity.map(c => (
              <option key={c.id} value={c.id}>{c.label} ({c.count})</option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-12 h-12 text-slate-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-medium text-slate-400">No activities match your filters</p>
              <p className="text-xs text-slate-300 mt-1">Try adjusting the time range or search query</p>
            </div>
          ) : (
            Object.entries(grouped).map(([dateLabel, entries]) => (
              <div key={dateLabel}>
                <div className="px-5 py-2 bg-slate-50/70 sticky top-0 z-10">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{dateLabel}</span>
                  <span className="text-[11px] text-slate-300 ml-2">({entries.length})</span>
                </div>
                {entries.map((entry, idx) => {
                  const config = TYPE_CONFIG[entry.log.type] || TYPE_CONFIG.system;
                  const caseRef = caseForEntry(entry.caseId);
                  return (
                    <div
                      key={`${entry.caseId}-${entry.log.id}-${idx}`}
                      className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/50 transition-colors group"
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${config.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">{entry.log.message}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <button
                            onClick={() => caseRef && onSelectCase(caseRef)}
                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline truncate max-w-[200px]"
                          >
                            {entry.caseNumber || entry.clientName}
                          </button>
                          {entry.caseNumber && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[150px]">{entry.clientName}</span>
                          )}
                          <span className="text-[11px] text-slate-300">|</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${config.bg}`}>{config.label}</span>
                          <span className="text-[11px] text-slate-400">{entry.log.author || 'System'}</span>
                          <span className="text-[11px] text-slate-300 ml-auto flex-shrink-0">{getRelativeTime(entry.log.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {filteredEntries.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400 text-center">
            Showing {filteredEntries.length} of {allEntries.length} activities
          </div>
        )}
      </div>
    </div>
  );
};
