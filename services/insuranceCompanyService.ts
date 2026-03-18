import { supabase } from './supabaseClient';

export type InsuranceCompanyType = 'auto' | 'health' | 'commercial' | 'workers_comp' | 'general';

export interface DirectoryInsuranceCompany {
  id: string;
  name: string;
  type: InsuranceCompanyType;
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
  claims_phone: string;
  website: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export async function getAllInsuranceCompanies(): Promise<DirectoryInsuranceCompany[]> {
  const { data, error } = await supabase
    .from('insurance_companies_directory')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching insurance companies:', error);
    return [];
  }
  return data || [];
}

export async function searchInsuranceCompanies(query: string): Promise<DirectoryInsuranceCompany[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('insurance_companies_directory')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name')
    .limit(10);

  if (error) {
    console.error('Error searching insurance companies:', error);
    return [];
  }
  return data || [];
}

export async function saveInsuranceCompany(company: Omit<DirectoryInsuranceCompany, 'id' | 'created_at' | 'updated_at'>): Promise<DirectoryInsuranceCompany | null> {
  const { data: existing } = await supabase
    .from('insurance_companies_directory')
    .select('id')
    .ilike('name', company.name.trim())
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('insurance_companies_directory')
      .update({
        ...company,
        name: company.name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating insurance company:', error);
      return null;
    }
    return data;
  }

  const { data, error } = await supabase
    .from('insurance_companies_directory')
    .insert({ ...company, name: company.name.trim() })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error saving insurance company:', error);
    return null;
  }
  return data;
}

export async function updateInsuranceCompany(id: string, updates: Partial<Omit<DirectoryInsuranceCompany, 'id' | 'created_at'>>): Promise<DirectoryInsuranceCompany | null> {
  const { data, error } = await supabase
    .from('insurance_companies_directory')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating insurance company:', error);
    return null;
  }
  return data;
}

export async function deleteInsuranceCompany(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('insurance_companies_directory')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting insurance company:', error);
    return false;
  }
  return true;
}
