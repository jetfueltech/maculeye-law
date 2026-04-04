import React, { useState } from 'react';
import { useFirm } from '../contexts/FirmContext';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  caseCount: number;
  taskCount?: number;
  unreadEmailCount?: number;
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  caseCount,
  taskCount = 0,
  unreadEmailCount = 0,
  isCollapsed,
  toggleSidebar,
}) => {
  const { firms, activeFirm, switchFirm, activeFirmRole } = useFirm();
  const { profile, signOut } = useAuth();
  const [showFirmMenu, setShowFirmMenu] = useState(false);

  const isMember = profile?.system_role === 'member';

  const navItems = [
    ...(isMember ? [{ id: 'workspace', label: 'Workspace', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' }] : []),
    { id: 'dashboard', label: 'Dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'tasks', label: 'Tasks', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
    { id: 'inbox', label: 'Inbox', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'forms', label: 'Forms', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'directory', label: 'Directory', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { id: 'analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'activity', label: 'Activity', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  const userInitials = profile?.avatar_initials || profile?.full_name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AD';
  const systemRoleLabel = ROLE_LABELS[profile?.system_role || ''] || 'Member';

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-stone-100 text-stone-800 h-screen flex flex-col fixed left-0 top-0 border-r border-stone-200 shadow-sm z-20 transition-all duration-300`}>
      <div className={`p-4 border-b border-stone-200 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight text-stone-900">LegalFlow</span>
          </div>
        )}
        <button onClick={toggleSidebar} className="text-stone-400 hover:text-stone-700 transition-colors">
          {isCollapsed ? (
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>
      </div>

      {firms.length > 0 && (
        <div className={`px-4 py-3 border-b border-stone-200 relative ${isCollapsed ? 'flex justify-center' : ''}`}>
          {isCollapsed ? (
            <div
              className="w-8 h-8 rounded-lg bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-600 cursor-pointer hover:bg-stone-300 transition-colors"
              title={activeFirm?.name || 'Select Firm'}
            >
              {activeFirm?.name.slice(0, 2).toUpperCase() || '--'}
            </div>
          ) : (
            <>
              <button
                onClick={() => setShowFirmMenu(!showFirmMenu)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white border border-stone-200 hover:bg-stone-50 transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-black flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                    {activeFirm?.name.slice(0, 2).toUpperCase() || '--'}
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-stone-900 truncate">{activeFirm?.name || 'Select Firm'}</p>
                    {activeFirmRole && (
                      <p className="text-[10px] text-stone-500">{ROLE_LABELS[activeFirmRole] || activeFirmRole}</p>
                    )}
                  </div>
                </div>
                {firms.length > 1 && (
                  <svg className={`w-4 h-4 text-stone-400 flex-shrink-0 transition-transform ${showFirmMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {showFirmMenu && firms.length > 1 && (
                <div className="absolute left-4 right-4 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-30 overflow-hidden animate-fade-in">
                  <div className="px-3 py-2 border-b border-stone-100">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Switch Firm</p>
                  </div>
                  {firms.map(firm => (
                    <button
                      key={firm.id}
                      onClick={() => { switchFirm(firm.id); setShowFirmMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-stone-50 transition-colors text-left ${activeFirm?.id === firm.id ? 'bg-stone-50' : ''}`}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${activeFirm?.id === firm.id ? 'bg-black text-white' : 'bg-stone-200 text-stone-600'}`}>
                        {firm.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-stone-700 truncate">{firm.name}</span>
                      {activeFirm?.id === firm.id && (
                        <svg className="w-4 h-4 text-stone-800 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto" onClick={() => setShowFirmMenu(false)}>
        {!isCollapsed && <div className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 pl-2">Menu</div>}
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} px-4 py-3 rounded-lg transition-all duration-200 ${
              currentView === item.id
                ? 'bg-black text-white shadow-sm'
                : 'text-stone-500 hover:bg-stone-200 hover:text-stone-800'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
            </svg>
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
            {item.id === 'dashboard' && caseCount > 0 && !isCollapsed && (
              <span className="ml-auto bg-stone-600 text-xs font-bold px-2 py-0.5 rounded-full text-white">
                {caseCount}
              </span>
            )}
            {item.id === 'tasks' && taskCount > 0 && !isCollapsed && (
              <span className="ml-auto bg-rose-500 text-xs font-bold px-2 py-0.5 rounded-full text-white">
                {taskCount}
              </span>
            )}
            {item.id === 'inbox' && unreadEmailCount > 0 && !isCollapsed && (
              <span className="ml-auto bg-red-500 text-xs font-bold px-2 py-0.5 rounded-full text-white">{unreadEmailCount}</span>
            )}
            {item.id === 'dashboard' && caseCount > 0 && isCollapsed && (
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-stone-600" />
            )}
            {item.id === 'tasks' && taskCount > 0 && isCollapsed && (
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
            {item.id === 'inbox' && unreadEmailCount > 0 && isCollapsed && (
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-stone-200">
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'gap-3'}`}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-stone-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {userInitials}
            </div>
          )}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-stone-900 truncate">{profile?.full_name || profile?.username || profile?.email || '...'}</p>
              <p className="text-xs text-stone-400">{systemRoleLabel}</p>
            </div>
          )}
          <button
            onClick={signOut}
            title="Sign out"
            className="text-stone-400 hover:text-rose-500 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
