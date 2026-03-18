import React, { useState, useRef } from 'react';
import { FirmManagement } from './settings/FirmManagement';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

type SettingsTab = 'profile' | 'firms' | 'integrations' | 'notifications';

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const ProfileSettings: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingAvatar(true);
    setSaveError('');

    const ext = file.name.split('.').pop();
    const path = `${profile.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setSaveError('Failed to upload image. Please try again.');
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const publicUrl = urlData.publicUrl + `?t=${Date.now()}`;

    const { error } = await updateProfile({ avatar_url: publicUrl });
    if (error) setSaveError(error);

    setUploadingAvatar(false);
    e.target.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    const initials = getInitials(fullName || profile?.email || '');
    const { error } = await updateProfile({ full_name: fullName, avatar_initials: initials });
    setSaving(false);
    if (error) {
      setSaveError(error);
    } else {
      setSaveMsg('Profile saved.');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  };

  const initials = getInitials(profile?.full_name || profile?.email || '');
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-8 py-6 border-b border-slate-100">
        <h3 className="font-bold text-slate-800">User Profile</h3>
        <p className="text-sm text-slate-500 mt-0.5">Update your name and profile photo.</p>
      </div>
      <div className="p-8 space-y-8">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <button
              type="button"
              onClick={handleAvatarClick}
              className="relative w-24 h-24 rounded-full overflow-hidden focus:outline-none focus:ring-4 focus:ring-blue-400 focus:ring-offset-2"
              title="Change profile photo"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {uploadingAvatar ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-lg">{profile?.full_name || profile?.username || 'User'}</p>
            <p className="text-sm text-slate-500 capitalize">{profile?.system_role}</p>
            <p className="text-xs text-slate-400 mt-1">Click the photo to upload a new image (max 5MB)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Username</label>
            <input
              type="text"
              className="w-full bg-slate-50 text-slate-500 border border-slate-200 rounded-lg px-4 py-2.5 text-sm cursor-not-allowed"
              value={profile?.username || ''}
              readOnly
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Address</label>
            <input
              type="email"
              className="w-full bg-slate-50 text-slate-500 border border-slate-200 rounded-lg px-4 py-2.5 text-sm cursor-not-allowed"
              value={profile?.email || ''}
              readOnly
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Name</label>
            <input
              type="text"
              className="w-full bg-white text-slate-900 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </div>
        </div>

        {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
        {saveMsg && <p className="text-sm text-emerald-600">{saveMsg}</p>}

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-sm"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Settings: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const isAdmin = profile?.system_role === 'admin' || profile?.system_role === 'manager';

  const tabs = [
    { id: 'profile' as SettingsTab, label: 'Profile' },
    { id: 'firms' as SettingsTab, label: 'Firms & Users' },
    { id: 'integrations' as SettingsTab, label: 'Integrations' },
    { id: 'notifications' as SettingsTab, label: 'Notifications' },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Settings</h1>
        <p className="text-slate-500 mt-2 text-lg">Configure user profile, integrations, and system preferences.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-lg transition-colors -mb-px border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileSettings />}

      {activeTab === 'firms' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8">
          <FirmManagement />
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Integrations</h3>
          </div>
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl bg-slate-50">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Smart Advocate CMS</h4>
                  <p className="text-xs text-slate-500">Sync cases and documents automatically.</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">Connected</span>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="2" width="9" height="9" fill="#F25022"/>
                    <rect x="13" y="2" width="9" height="9" fill="#7FBA00"/>
                    <rect x="2" y="13" width="9" height="9" fill="#00A4EF"/>
                    <rect x="13" y="13" width="9" height="9" fill="#FFB900"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Microsoft Outlook</h4>
                  <p className="text-xs text-slate-500">Sync emails, calendar events, and contacts.</p>
                </div>
              </div>
              <button className="text-sm font-medium text-slate-600 hover:text-blue-600">Connect</button>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm text-orange-500">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.5 14H15v-2.5h-1.5V16h-3v-1.5H8v-3h2.5V10H8V8.5h2.5V6h1.5v2.5h3V6h1.5v2.5h2.5v1.5h-2.5v3h2.5v1.5h-2.5V16z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">RingCentral</h4>
                  <p className="text-xs text-slate-500">Log calls, SMS, and link voicemails to cases.</p>
                </div>
              </div>
              <button className="text-sm font-medium text-slate-600 hover:text-blue-600">Connect</button>
            </div>

            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200 shadow-sm">
                  <svg className="w-6 h-6 text-sky-500" fill="currentColor" viewBox="0 0 24 24"><path d="M15.999 8.058h2.366v2.965h-2.366V24h-4.015V11.023h-2.35v-2.965h2.35v-2.616c0-3.322 1.41-4.887 4.962-4.887 1.486 0 2.443.109 2.443.109v2.951h-1.503c-1.391 0-1.888.932-1.888 2.052v2.39z" /></svg>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">Facebook Leads</h4>
                  <p className="text-xs text-slate-500">Import leads directly from FB Ads.</p>
                </div>
              </div>
              <button className="text-sm font-medium text-slate-600 hover:text-blue-600">Connect</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Google Gemini API Key</label>
              <div className="flex space-x-2">
                <input type="password" value="********************************" readOnly className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm bg-slate-50 text-slate-500" />
                <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Regenerate</button>
              </div>
              <p className="text-xs text-slate-400 mt-2">Used for AI analysis and document processing.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800">Notifications</h3>
          </div>
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">New Case Alerts</h4>
                <p className="text-xs text-slate-500">Receive email when a new intake is submitted.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-slate-900">Daily Digest</h4>
                <p className="text-xs text-slate-500">Summary of daily activities and KPIs.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
