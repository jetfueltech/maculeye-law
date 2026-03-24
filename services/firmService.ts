import { supabase } from './supabaseClient';
import { Firm, FirmMember } from '../contexts/FirmContext';
import { UserProfile } from '../contexts/AuthContext';

export interface FirmMemberWithProfile extends FirmMember {
  user_profiles: UserProfile;
}

export interface FirmDetails {
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  description?: string;
  case_prefix?: string;
}

function generateCasePrefix(name: string): string {
  const words = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 'FRM';
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  const initials = words.map(w => w[0]).join('').toUpperCase();
  return initials.substring(0, 4);
}

export async function createFirm(details: FirmDetails, createdBy: string | null): Promise<{ firm: Firm | null; error: string | null }> {
  const slug = details.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const case_prefix = details.case_prefix || generateCasePrefix(details.name);
  const insertData: Record<string, unknown> = { ...details, slug, case_prefix };
  if (createdBy) insertData.created_by = createdBy;
  const { data, error } = await supabase
    .from('firms')
    .insert(insertData)
    .select()
    .maybeSingle();
  if (error) return { firm: null, error: error.message };
  return { firm: data as Firm, error: null };
}

export async function updateFirm(firmId: string, details: FirmDetails): Promise<{ error: string | null }> {
  const slug = details.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { error } = await supabase
    .from('firms')
    .update({ ...details, slug })
    .eq('id', firmId);
  return { error: error?.message || null };
}

export async function getFirmMembers(firmId: string): Promise<FirmMemberWithProfile[]> {
  const { data } = await supabase
    .from('firm_members')
    .select('*, user_profiles(*)')
    .eq('firm_id', firmId);
  return (data || []) as FirmMemberWithProfile[];
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .order('full_name');
  return (data || []) as UserProfile[];
}

export async function addFirmMember(firmId: string, userId: string, role: 'admin' | 'manager' | 'member'): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('firm_members')
    .insert({ firm_id: firmId, user_id: userId, role });
  return { error: error?.message || null };
}

export async function updateFirmMemberRole(memberId: string, role: 'admin' | 'manager' | 'member'): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('firm_members')
    .update({ role })
    .eq('id', memberId);
  return { error: error?.message || null };
}

export async function removeFirmMember(memberId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('firm_members')
    .delete()
    .eq('id', memberId);
  return { error: error?.message || null };
}

export async function updateUserSystemRole(userId: string, systemRole: 'admin' | 'manager' | 'member'): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ system_role: systemRole })
    .eq('id', userId);
  return { error: error?.message || null };
}

export async function getAllFirms(): Promise<Firm[]> {
  const { data } = await supabase
    .from('firms')
    .select('*')
    .order('name');
  return (data || []) as Firm[];
}

export interface CreateMemberParams {
  full_name: string;
  username: string;
  email: string;
  password: string;
  system_role: 'admin' | 'manager' | 'member';
  firm_id?: string;
}

export async function createMemberAccount(params: CreateMemberParams): Promise<{ user_id: string | null; error: string | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-member-account`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(params),
  });

  let json: any;
  try {
    json = await res.json();
  } catch {
    return { user_id: null, error: `Server error (${res.status})` };
  }
  if (!res.ok || json.error) return { user_id: null, error: json.error || `Failed to create account (${res.status})` };
  return { user_id: json.user_id, error: null };
}
