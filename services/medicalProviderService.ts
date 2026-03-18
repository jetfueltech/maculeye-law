import { supabase } from './supabaseClient';
import { MedicalProviderType } from '../types';

export interface DirectoryProvider {
  id: string;
  name: string;
  type: MedicalProviderType;
  address: string;
  city: string;
  state: string;
  zip: string;
  mailing_address: string;
  mailing_city: string;
  mailing_state: string;
  mailing_zip: string;
  phone: string;
  fax: string;
  contact_person: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export async function searchProviders(query: string): Promise<DirectoryProvider[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('medical_providers_directory')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(10);

  if (error) {
    console.error('Error searching providers:', error);
    return [];
  }

  return data || [];
}

export async function getAllProviders(): Promise<DirectoryProvider[]> {
  const { data, error } = await supabase
    .from('medical_providers_directory')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching providers:', error);
    return [];
  }

  return data || [];
}

export async function saveProviderToDirectory(provider: {
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  fax?: string;
  contact_person?: string;
  notes?: string;
}): Promise<DirectoryProvider | null> {
  const { data: existing } = await supabase
    .from('medical_providers_directory')
    .select('id')
    .ilike('name', provider.name.trim())
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('medical_providers_directory')
      .update({
        type: provider.type,
        address: provider.address || '',
        city: provider.city || '',
        state: provider.state || '',
        zip: provider.zip || '',
        phone: provider.phone || '',
        fax: provider.fax || '',
        contact_person: provider.contact_person || '',
        notes: provider.notes || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating provider:', error);
      return null;
    }
    return data;
  }

  const { data, error } = await supabase
    .from('medical_providers_directory')
    .insert({
      name: provider.name.trim(),
      type: provider.type,
      address: provider.address || '',
      city: provider.city || '',
      state: provider.state || '',
      zip: provider.zip || '',
      phone: provider.phone || '',
      fax: provider.fax || '',
      contact_person: provider.contact_person || '',
      notes: provider.notes || '',
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error saving provider:', error);
    return null;
  }
  return data;
}

export async function updateProviderInDirectory(id: string, updates: Partial<Omit<DirectoryProvider, 'id' | 'created_at'>>): Promise<DirectoryProvider | null> {
  const { data, error } = await supabase
    .from('medical_providers_directory')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating provider:', error);
    return null;
  }
  return data;
}

export async function deleteProviderFromDirectory(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('medical_providers_directory')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting provider:', error);
    return false;
  }
  return true;
}
