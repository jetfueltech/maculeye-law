import React, { useState, useEffect, useCallback } from 'react';
import { useFirm, Firm } from '../../contexts/FirmContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  createFirm,
  updateFirm,
  getAllFirms,
  getFirmMembers,
  getAllUsers,
  addFirmMember,
  updateFirmMemberRole,
  removeFirmMember,
  updateUserSystemRole,
  createMemberAccount,
  FirmMemberWithProfile,
  FirmDetails,
} from '../../services/firmService';

const ROLE_COLORS = {
  admin: 'bg-rose-50 text-rose-700 border-rose-200',
  manager: 'bg-amber-50 text-amber-700 border-amber-200',
  member: 'bg-stone-100 text-stone-600 border-stone-200',
};

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
};

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

const EMPTY_DETAILS: FirmDetails = {
  name: '',
  website: '',
  phone: '',
  email: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
  description: '',
};

function firmToDetails(firm: Firm): FirmDetails {
  return {
    name: firm.name,
    website: firm.website || '',
    phone: firm.phone || '',
    email: firm.email || '',
    address_line1: firm.address_line1 || '',
    address_line2: firm.address_line2 || '',
    city: firm.city || '',
    state: firm.state || '',
    zip: firm.zip || '',
    country: firm.country || 'US',
    description: firm.description || '',
  };
}

interface FirmFormProps {
  title: string;
  initial: FirmDetails;
  saving: boolean;
  error: string;
  submitLabel: string;
  onSubmit: (details: FirmDetails) => void;
  onCancel: () => void;
}

const FirmForm: React.FC<FirmFormProps> = ({ title, initial, saving, error, submitLabel, onSubmit, onCancel }) => {
  const [details, setDetails] = useState<FirmDetails>(initial);

  const set = (field: keyof FirmDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDetails(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4 animate-fade-in">
      <h4 className="font-bold text-stone-800 text-sm">{title}</h4>

      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Firm Name <span className="text-red-500">*</span></label>
        <input
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          placeholder="e.g. Smith & Associates Law"
          value={details.name}
          onChange={set('name')}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Description</label>
        <textarea
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white resize-none"
          placeholder="Brief description of the firm..."
          rows={2}
          value={details.description}
          onChange={set('description')}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Phone</label>
          <input
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            placeholder="(555) 000-0000"
            value={details.phone}
            onChange={set('phone')}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Email</label>
          <input
            type="email"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            placeholder="contact@firmname.com"
            value={details.email}
            onChange={set('email')}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Website</label>
        <input
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          placeholder="https://www.firmname.com"
          value={details.website}
          onChange={set('website')}
        />
      </div>

      <div className="border-t border-blue-200 pt-4">
        <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-3">Address</p>
        <div className="space-y-3">
          <input
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            placeholder="Street address"
            value={details.address_line1}
            onChange={set('address_line1')}
          />
          <input
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            placeholder="Suite, floor, etc. (optional)"
            value={details.address_line2}
            onChange={set('address_line2')}
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                placeholder="City"
                value={details.city}
                onChange={set('city')}
              />
            </div>
            <div>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                placeholder="State"
                value={details.state}
                onChange={set('state')}
              />
            </div>
            <div>
              <input
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                placeholder="ZIP"
                value={details.zip}
                onChange={set('zip')}
              />
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSubmit(details)}
          disabled={!details.name.trim() || saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving...' : submitLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export const FirmManagement: React.FC = () => {
  const { refreshFirms, switchFirm } = useFirm();
  const { user } = useAuth();

  const [allFirms, setAllFirms] = useState<Firm[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedFirmId, setSelectedFirmId] = useState<string | null>(null);
  const [firmMembers, setFirmMembers] = useState<FirmMemberWithProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [showAddFirm, setShowAddFirm] = useState(false);
  const [editingFirmId, setEditingFirmId] = useState<string | null>(null);
  const [savingFirm, setSavingFirm] = useState(false);
  const [firmError, setFirmError] = useState('');

  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState('');
  const [addMemberRole, setAddMemberRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [savingMember, setSavingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ full_name: '', username: '', email: '', password: '', system_role: 'member' as 'admin' | 'manager' | 'member' });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createAccountError, setCreateAccountError] = useState('');
  const [createAccountSuccess, setCreateAccountSuccess] = useState('');

  const loadData = useCallback(async () => {
    const [firms, users] = await Promise.all([getAllFirms(), getAllUsers()]);
    setAllFirms(firms);
    setAllUsers(users);
    if (firms.length > 0 && !selectedFirmId) {
      setSelectedFirmId(firms[0].id);
    }
  }, [selectedFirmId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedFirmId) return;
    setLoadingMembers(true);
    getFirmMembers(selectedFirmId).then(members => {
      setFirmMembers(members);
      setLoadingMembers(false);
    });
  }, [selectedFirmId]);

  const handleCreateFirm = async (details: FirmDetails) => {
    setSavingFirm(true);
    setFirmError('');
    const { firm, error } = await createFirm(details, user?.id ?? null);
    if (error) { setFirmError(error); setSavingFirm(false); return; }
    setShowAddFirm(false);
    setSavingFirm(false);
    await loadData();
    await refreshFirms();
    if (firm) { setSelectedFirmId(firm.id); switchFirm(firm.id); }
  };

  const handleUpdateFirm = async (details: FirmDetails) => {
    if (!editingFirmId) return;
    setSavingFirm(true);
    setFirmError('');
    const { error } = await updateFirm(editingFirmId, details);
    if (error) { setFirmError(error); setSavingFirm(false); return; }
    setEditingFirmId(null);
    setSavingFirm(false);
    await loadData();
    await refreshFirms();
  };

  const handleAddMember = async () => {
    if (!selectedFirmId || !addMemberUserId) return;
    setSavingMember(true);
    setMemberError('');
    const { error } = await addFirmMember(selectedFirmId, addMemberUserId, addMemberRole);
    if (error) { setMemberError(error); setSavingMember(false); return; }
    setShowAddMember(false);
    setAddMemberUserId('');
    setAddMemberRole('member');
    setSavingMember(false);
    const members = await getFirmMembers(selectedFirmId);
    setFirmMembers(members);
  };

  const handleRoleChange = async (memberId: string, role: 'admin' | 'manager' | 'member') => {
    await updateFirmMemberRole(memberId, role);
    if (selectedFirmId) setFirmMembers(await getFirmMembers(selectedFirmId));
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!window.confirm('Remove this member from the firm?')) return;
    await removeFirmMember(memberId);
    if (selectedFirmId) setFirmMembers(await getFirmMembers(selectedFirmId));
  };

  const handleSystemRoleChange = async (userId: string, role: 'admin' | 'manager' | 'member') => {
    await updateUserSystemRole(userId, role);
    setAllUsers(await getAllUsers());
  };

  const handleCreateAccount = async () => {
    if (!newAccount.username || !newAccount.email || !newAccount.password) return;
    setCreatingAccount(true);
    setCreateAccountError('');
    setCreateAccountSuccess('');
    const { error } = await createMemberAccount({ ...newAccount, firm_id: selectedFirmId });
    setCreatingAccount(false);
    if (error) {
      setCreateAccountError(error);
    } else {
      setCreateAccountSuccess(`Account created for ${newAccount.full_name || newAccount.username}.`);
      setNewAccount({ full_name: '', username: '', email: '', password: '', system_role: 'member' });
      setShowCreateAccount(false);
      await loadData();
    }
  };

  const selectedFirm = allFirms.find(f => f.id === selectedFirmId);
  const editingFirm = allFirms.find(f => f.id === editingFirmId);
  const availableUsersToAdd = allUsers.filter(u => !firmMembers.some(m => m.user_id === u.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-stone-800 text-lg">Firm Management</h3>
          <p className="text-sm text-stone-500 mt-0.5">Create and manage law firm organizations. Assign users to firms with specific roles.</p>
        </div>
        <button
          onClick={() => { setShowAddFirm(true); setFirmError(''); setEditingFirmId(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Firm
        </button>
      </div>

      {showAddFirm && (
        <FirmForm
          title="New Firm"
          initial={EMPTY_DETAILS}
          saving={savingFirm}
          error={firmError}
          submitLabel="Create Firm"
          onSubmit={handleCreateFirm}
          onCancel={() => setShowAddFirm(false)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className={`space-y-2 transition-all ${editingFirmId ? 'md:col-span-1' : 'md:col-span-1'}`}>
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Firms</h4>
          {allFirms.length === 0 ? (
            <div className="text-center py-8 text-sm text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              No firms yet
            </div>
          ) : (
            allFirms.map(firm => (
              <div key={firm.id}>
                <div
                  className={`group relative rounded-xl border p-4 cursor-pointer transition-all ${
                    selectedFirmId === firm.id
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                  }`}
                  onClick={() => setSelectedFirmId(firm.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        selectedFirmId === firm.id ? 'bg-blue-600 text-white' : 'bg-stone-200 text-stone-700'
                      }`}>
                        {firm.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-900 truncate">{firm.name}</p>
                        {firm.city || firm.state ? (
                          <p className="text-[11px] text-stone-400 truncate">{[firm.city, firm.state].filter(Boolean).join(', ')}</p>
                        ) : (
                          <p className="text-[11px] text-stone-400">{firm.slug}</p>
                        )}
                        {firm.phone && <p className="text-[11px] text-stone-400 truncate">{firm.phone}</p>}
                      </div>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setEditingFirmId(firm.id);
                        setFirmError('');
                        setShowAddFirm(false);
                      }}
                      className="text-stone-300 hover:text-stone-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {editingFirmId && editingFirm && (
          <div className="md:col-span-2 space-y-4">
            <FirmForm
              title={`Edit ${editingFirm.name}`}
              initial={firmToDetails(editingFirm)}
              saving={savingFirm}
              error={firmError}
              submitLabel="Save Changes"
              onSubmit={handleUpdateFirm}
              onCancel={() => setEditingFirmId(null)}
            />
          </div>
        )}

        <div className={`space-y-4 ${editingFirmId ? 'md:col-span-1' : 'md:col-span-3'}`}>
          {selectedFirm ? (
            <>
              {(selectedFirm.website || selectedFirm.phone || selectedFirm.email || selectedFirm.address_line1 || selectedFirm.description) && (
                <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Firm Details</h4>
                  {selectedFirm.description && (
                    <p className="text-sm text-stone-600">{selectedFirm.description}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {selectedFirm.phone && (
                      <div className="flex items-center gap-2 text-stone-600">
                        <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {selectedFirm.phone}
                      </div>
                    )}
                    {selectedFirm.email && (
                      <div className="flex items-center gap-2 text-stone-600">
                        <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {selectedFirm.email}
                      </div>
                    )}
                    {selectedFirm.website && (
                      <div className="flex items-center gap-2 text-stone-600 col-span-full">
                        <svg className="w-4 h-4 text-stone-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <a href={selectedFirm.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate" onClick={e => e.stopPropagation()}>
                          {selectedFirm.website}
                        </a>
                      </div>
                    )}
                    {selectedFirm.address_line1 && (
                      <div className="flex items-start gap-2 text-stone-600 col-span-full">
                        <svg className="w-4 h-4 text-stone-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>
                          {selectedFirm.address_line1}
                          {selectedFirm.address_line2 && <>, {selectedFirm.address_line2}</>}
                          {(selectedFirm.city || selectedFirm.state || selectedFirm.zip) && (
                            <>, {[selectedFirm.city, selectedFirm.state, selectedFirm.zip].filter(Boolean).join(' ')}</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                  Members of {selectedFirm.name}
                </h4>
                <button
                  onClick={() => { setShowAddMember(true); setMemberError(''); setAddMemberUserId(''); setAddMemberRole('member'); }}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Member
                </button>
              </div>

              {showAddMember && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 animate-fade-in">
                  <h5 className="font-bold text-stone-800 text-sm">Add Member to {selectedFirm.name}</h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-1">User</label>
                      <select
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={addMemberUserId}
                        onChange={e => setAddMemberUserId(e.target.value)}
                      >
                        <option value="">Select user...</option>
                        {availableUsersToAdd.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Firm Role</label>
                      <select
                        className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={addMemberRole}
                        onChange={e => setAddMemberRole(e.target.value as 'admin' | 'manager' | 'member')}
                      >
                        <option value="member">Member</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>
                  {memberError && <p className="text-xs text-red-600">{memberError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddMember}
                      disabled={!addMemberUserId || savingMember}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      {savingMember ? 'Adding...' : 'Add Member'}
                    </button>
                    <button
                      onClick={() => setShowAddMember(false)}
                      className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {loadingMembers ? (
                <div className="py-8 text-center text-sm text-stone-400">Loading members...</div>
              ) : firmMembers.length === 0 ? (
                <div className="py-8 text-center text-sm text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                  No members yet. Add members to this firm.
                </div>
              ) : (
                <div className="space-y-2">
                  {firmMembers.map(member => {
                    const u = member.user_profiles;
                    if (!u) return null;
                    return (
                      <div key={member.id} className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl group hover:border-stone-300 transition-colors">
                        <div className="flex items-center gap-3">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={u.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                          ) : (
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {u.avatar_initials || getInitials(u.full_name || u.email)}
                          </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-stone-900">{u.full_name || 'Unknown'}</p>
                            <p className="text-xs text-stone-500">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-stone-400 uppercase">System:</span>
                            <select
                              className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              value={u.system_role}
                              onChange={e => handleSystemRoleChange(u.id, e.target.value as 'admin' | 'manager' | 'member')}
                            >
                              <option value="member">Member</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-stone-400 uppercase">Firm:</span>
                            <select
                              className={`text-xs border rounded-lg px-2 py-1 font-bold focus:ring-2 focus:ring-blue-500 outline-none ${ROLE_COLORS[member.role]}`}
                              value={member.role}
                              onChange={e => handleRoleChange(member.id, e.target.value as 'admin' | 'manager' | 'member')}
                            >
                              <option value="member">Member</option>
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-stone-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="py-12 text-center text-sm text-stone-400 bg-stone-50 rounded-xl border border-dashed border-stone-200">
              Select a firm to manage members
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">All Users</h4>
          <button
            onClick={() => { setShowCreateAccount(true); setCreateAccountError(''); setCreateAccountSuccess(''); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Create Account
          </button>
        </div>

        {createAccountSuccess && (
          <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
            {createAccountSuccess}
          </div>
        )}

        {showCreateAccount && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-stone-800 text-sm">Create Member Account</h5>
              <button onClick={() => setShowCreateAccount(false)} className="text-stone-400 hover:text-stone-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Full Name</label>
                <input
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Jane Smith"
                  value={newAccount.full_name}
                  onChange={e => setNewAccount(a => ({ ...a, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Username <span className="text-red-500">*</span></label>
                <input
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="janesmith"
                  value={newAccount.username}
                  onChange={e => setNewAccount(a => ({ ...a, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="jane@firmname.com"
                  value={newAccount.email}
                  onChange={e => setNewAccount(a => ({ ...a, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Min 6 characters"
                  value={newAccount.password}
                  onChange={e => setNewAccount(a => ({ ...a, password: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1">System Role</label>
                <select
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newAccount.system_role}
                  onChange={e => setNewAccount(a => ({ ...a, system_role: e.target.value as 'admin' | 'manager' | 'member' }))}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {createAccountError && <p className="text-xs text-red-600">{createAccountError}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreateAccount}
                disabled={!newAccount.username || !newAccount.email || !newAccount.password || creatingAccount}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                {creatingAccount ? 'Creating...' : 'Create Account'}
              </button>
              <button
                onClick={() => setShowCreateAccount(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {allUsers.map(u => (
            <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-stone-200 rounded-xl hover:border-stone-300 transition-colors">
              <div className="flex items-center gap-3">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-stone-400 to-stone-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {u.avatar_initials || getInitials(u.full_name || u.email)}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-stone-900">{u.full_name || u.email}</p>
                  <p className="text-xs text-stone-500">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full border ${ROLE_COLORS[u.system_role]}`}>
                  {ROLE_LABELS[u.system_role]}
                </span>
                <select
                  className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={u.system_role}
                  onChange={e => handleSystemRoleChange(u.id, e.target.value as 'admin' | 'manager' | 'member')}
                >
                  <option value="member">Member</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
