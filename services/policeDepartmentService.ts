import { supabase } from './supabaseClient';

export type PoliceDepartmentJurisdiction = 'city' | 'county' | 'state' | 'federal' | 'university' | 'other';

export interface DirectoryPoliceDepartment {
  id: string;
  name: string;
  jurisdiction: PoliceDepartmentJurisdiction;
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
  records_phone: string;
  records_email: string;
  website: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export async function getAllPoliceDepartments(): Promise<DirectoryPoliceDepartment[]> {
  const { data, error } = await supabase
    .from('police_departments_directory')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching police departments:', error);
    return [];
  }
  return data || [];
}

export async function savePoliceDepartment(dept: Omit<DirectoryPoliceDepartment, 'id' | 'created_at' | 'updated_at'>): Promise<DirectoryPoliceDepartment | null> {
  const { data, error } = await supabase
    .from('police_departments_directory')
    .insert({ ...dept, name: dept.name.trim() })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error saving police department:', error);
    return null;
  }
  return data;
}

export async function updatePoliceDepartment(id: string, updates: Partial<Omit<DirectoryPoliceDepartment, 'id' | 'created_at'>>): Promise<DirectoryPoliceDepartment | null> {
  const { data, error } = await supabase
    .from('police_departments_directory')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating police department:', error);
    return null;
  }
  return data;
}

export async function deletePoliceDepartment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('police_departments_directory')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting police department:', error);
    return false;
  }
  return true;
}
