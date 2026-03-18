import React, { useState } from 'react';
import { DirectoryProviders } from './DirectoryProviders';
import { DirectoryInsurance } from './DirectoryInsurance';
import { DirectoryPolice } from './DirectoryPolice';

type DirectoryTab = 'providers' | 'insurance' | 'police';

export const Directory: React.FC = () => {
  const [tab, setTab] = useState<DirectoryTab>('providers');

  const tabs: { id: DirectoryTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'providers',
      label: 'Medical Providers',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      id: 'insurance',
      label: 'Insurance Companies',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'police',
      label: 'Police Departments',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Directory</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your shared medical provider, insurance company, and police department records.</p>
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pb-3 text-sm font-medium transition-colors relative whitespace-nowrap ${
                tab === t.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {t.icon}
                {t.label}
              </div>
              {tab === t.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      {tab === 'providers' && <DirectoryProviders />}
      {tab === 'insurance' && <DirectoryInsurance />}
      {tab === 'police' && <DirectoryPolice />}
    </div>
  );
};
