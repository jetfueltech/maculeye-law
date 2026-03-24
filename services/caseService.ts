import { supabase } from './supabaseClient';
import { CaseFile, DocumentAttachment } from '../types';

function stripLargeFields(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (obj.length > 50000) return null;
    return obj;
  }
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripLargeFields);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === 'fileData') {
      result[key] = null;
      continue;
    }
    result[key] = stripLargeFields(value);
  }
  return result;
}

function prepareCaseData(caseFile: CaseFile, firmId: string): Record<string, unknown> {
  const raw = { ...caseFile, firm_id: firmId };
  return stripLargeFields(raw) as Record<string, unknown>;
}

export async function getCasesByFirm(firmId: string): Promise<CaseFile[]> {
  const { data, error } = await supabase
    .from('cases')
    .select('data, firm_id, case_number')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cases:', error);
    return [];
  }

  return (data || []).map(row => ({
    ...row.data,
    firm_id: row.firm_id,
    caseNumber: row.case_number || row.data?.caseNumber,
  } as CaseFile));
}

export async function generateCaseNumber(firmId: string): Promise<string | null> {
  const { data, error } = await supabase
    .rpc('generate_next_case_number', { firm_uuid: firmId });

  if (error) {
    console.error('Error generating case number:', error);
    return null;
  }
  return data as string | null;
}

export async function upsertCase(caseFile: CaseFile, firmId: string): Promise<{ error: string | null }> {
  try {
    const sanitizedData = prepareCaseData(caseFile, firmId);
    JSON.stringify(sanitizedData);

    const { error } = await supabase
      .from('cases')
      .upsert({
        id: caseFile.id,
        firm_id: firmId,
        data: sanitizedData,
        client_name: caseFile.clientName || '',
        status: caseFile.status || 'NEW',
        case_number: caseFile.caseNumber || null,
        created_at: caseFile.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error upserting case:', error);
      return { error: error.message };
    }
    return { error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error saving case';
    console.error('Exception in upsertCase:', err);
    return { error: msg };
  }
}

export async function deleteCase(caseId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('cases')
    .delete()
    .eq('id', caseId);

  if (error) {
    console.error('Error deleting case:', error);
    return { error: error.message };
  }
  return { error: null };
}
