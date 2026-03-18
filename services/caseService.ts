import { supabase } from './supabaseClient';
import { CaseFile } from '../types';

export async function getCasesByFirm(firmId: string): Promise<CaseFile[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('data, firm_id')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cases:', error);
    return [];
  }

  return (data || []).map(row => ({ ...row.data, firm_id: row.firm_id } as CaseFile));
}

export async function upsertCase(caseFile: CaseFile, firmId: string): Promise<void> {
  const { error } = await supabase
    .from('cases')
    .upsert({
      id: caseFile.id,
      firm_id: firmId,
      data: { ...caseFile, firm_id: firmId },
      client_name: caseFile.clientName,
      status: caseFile.status,
      created_at: caseFile.createdAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    console.error('Error upserting case:', error);
  }
}

export async function deleteCase(caseId: string): Promise<void> {
  const { error } = await supabase
    .from('cases')
    .delete()
    .eq('id', caseId);

  if (error) {
    console.error('Error deleting case:', error);
  }
}
