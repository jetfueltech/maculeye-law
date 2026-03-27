import { supabase } from './supabaseClient';

export interface DirectoryPhone {
  id: string;
  directory_type: 'provider' | 'insurance';
  directory_id: string;
  label: string;
  phone_number: string;
}

export interface DirectoryFax {
  id: string;
  directory_type: 'provider' | 'insurance';
  directory_id: string;
  label: string;
  fax_number: string;
}

export interface DirectoryAddress {
  id: string;
  directory_type: 'provider' | 'insurance';
  directory_id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export async function getPhones(directoryType: string, directoryId: string): Promise<DirectoryPhone[]> {
  const { data, error } = await supabase
    .from('directory_phones')
    .select('*')
    .eq('directory_type', directoryType)
    .eq('directory_id', directoryId)
    .order('created_at');
  if (error) { console.error('Error fetching phones:', error); return []; }
  return data || [];
}

export async function addPhone(entry: Omit<DirectoryPhone, 'id'>): Promise<DirectoryPhone | null> {
  const { data, error } = await supabase
    .from('directory_phones')
    .insert(entry)
    .select()
    .maybeSingle();
  if (error) { console.error('Error adding phone:', error); return null; }
  return data;
}

export async function updatePhone(id: string, updates: Partial<DirectoryPhone>): Promise<boolean> {
  const { error } = await supabase.from('directory_phones').update(updates).eq('id', id);
  if (error) { console.error('Error updating phone:', error); return false; }
  return true;
}

export async function deletePhone(id: string): Promise<boolean> {
  const { error } = await supabase.from('directory_phones').delete().eq('id', id);
  if (error) { console.error('Error deleting phone:', error); return false; }
  return true;
}

export async function getFaxes(directoryType: string, directoryId: string): Promise<DirectoryFax[]> {
  const { data, error } = await supabase
    .from('directory_faxes')
    .select('*')
    .eq('directory_type', directoryType)
    .eq('directory_id', directoryId)
    .order('created_at');
  if (error) { console.error('Error fetching faxes:', error); return []; }
  return data || [];
}

export async function addFax(entry: Omit<DirectoryFax, 'id'>): Promise<DirectoryFax | null> {
  const { data, error } = await supabase
    .from('directory_faxes')
    .insert(entry)
    .select()
    .maybeSingle();
  if (error) { console.error('Error adding fax:', error); return null; }
  return data;
}

export async function updateFax(id: string, updates: Partial<DirectoryFax>): Promise<boolean> {
  const { error } = await supabase.from('directory_faxes').update(updates).eq('id', id);
  if (error) { console.error('Error updating fax:', error); return false; }
  return true;
}

export async function deleteFax(id: string): Promise<boolean> {
  const { error } = await supabase.from('directory_faxes').delete().eq('id', id);
  if (error) { console.error('Error deleting fax:', error); return false; }
  return true;
}

export async function getAddresses(directoryType: string, directoryId: string): Promise<DirectoryAddress[]> {
  const { data, error } = await supabase
    .from('directory_addresses')
    .select('*')
    .eq('directory_type', directoryType)
    .eq('directory_id', directoryId)
    .order('created_at');
  if (error) { console.error('Error fetching addresses:', error); return []; }
  return data || [];
}

export async function addAddress(entry: Omit<DirectoryAddress, 'id'>): Promise<DirectoryAddress | null> {
  const { data, error } = await supabase
    .from('directory_addresses')
    .insert(entry)
    .select()
    .maybeSingle();
  if (error) { console.error('Error adding address:', error); return null; }
  return data;
}

export async function updateAddress(id: string, updates: Partial<DirectoryAddress>): Promise<boolean> {
  const { error } = await supabase.from('directory_addresses').update(updates).eq('id', id);
  if (error) { console.error('Error updating address:', error); return false; }
  return true;
}

export async function deleteAddress(id: string): Promise<boolean> {
  const { error } = await supabase.from('directory_addresses').delete().eq('id', id);
  if (error) { console.error('Error deleting address:', error); return false; }
  return true;
}

export async function deleteAllContactsForEntry(directoryType: string, directoryId: string): Promise<void> {
  await supabase.from('directory_phones').delete().eq('directory_type', directoryType).eq('directory_id', directoryId);
  await supabase.from('directory_faxes').delete().eq('directory_type', directoryType).eq('directory_id', directoryId);
  await supabase.from('directory_addresses').delete().eq('directory_type', directoryType).eq('directory_id', directoryId);
}
