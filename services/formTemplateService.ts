import { supabase } from './supabaseClient';

export interface FormTemplate {
  id: string;
  firm_id: string;
  name: string;
  form_key: string;
  category: string;
  description: string;
  naming_pattern: string;
  is_active: boolean;
  is_system: boolean;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type FormTemplateInsert = Omit<FormTemplate, 'id' | 'created_at' | 'updated_at'>;

const SYSTEM_TEMPLATES: Omit<FormTemplateInsert, 'firm_id'>[] = [
  { name: 'LOR & Lien — 1P (Client Insurance)', form_key: 'rep_lien_1p', category: 'Intake & Representation', description: 'Letter of Representation and lien sent to the client\'s own insurance company.', naming_pattern: '{LastName}_{FirstName}_{DOL}_LOR_1P_v{Version}', is_active: true, is_system: true, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', sort_order: 0 },
  { name: 'LOR & Lien — 3P (Defendant Insurance)', form_key: 'rep_lien_3p', category: 'Intake & Representation', description: 'Letter of Representation and lien sent to the defendant\'s insurance company.', naming_pattern: '{LastName}_{FirstName}_{DOL}_LOR_3P_v{Version}', is_active: true, is_system: true, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', sort_order: 1 },
  { name: 'Client Intake Summary', form_key: 'intake_summary', category: 'Intake & Representation', description: 'Detailed form with accident, client, medical, and insurance info.', naming_pattern: '{LastName}_{FirstName}_{DOL}_IntakeSummary_v{Version}', is_active: true, is_system: true, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', sort_order: 1 },
  { name: 'Boss Intake Form', form_key: 'boss_intake_form', category: 'Intake & Representation', description: 'Auto-populated intake spreadsheet with all case data.', naming_pattern: '{LastName}_{FirstName}_{DOL}_BossIntake_v{Version}', is_active: true, is_system: true, icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', sort_order: 2 },
  { name: 'HIPAA Authorization', form_key: 'hipaa_auth', category: 'Records & Authorization', description: 'Patient authorization for release of health information.', naming_pattern: '{LastName}_{FirstName}_{DOL}_HIPAA_v{Version}', is_active: true, is_system: true, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', sort_order: 3 },
  { name: 'Medical Records & Bills Request', form_key: 'bill_request', category: 'Records & Authorization', description: 'Request for medical records and billing from a provider.', naming_pattern: '{LastName}_{FirstName}_{DOL}_BillRequest_{Source}_v{Version}', is_active: true, is_system: true, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', sort_order: 4 },
  { name: 'Records Request', form_key: 'records_request', category: 'Records & Authorization', description: 'General records request letter to a provider.', naming_pattern: '{LastName}_{FirstName}_{DOL}_RecordsReq_{Source}_v{Version}', is_active: true, is_system: true, icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', sort_order: 5 },
  { name: 'FOIA / Crash Report Request', form_key: 'foia', category: 'Records & Authorization', description: 'Freedom of information request for crash report documentation.', naming_pattern: '{LastName}_{FirstName}_{DOL}_FOIA_v{Version}', is_active: true, is_system: true, icon: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z', sort_order: 6 },
  { name: 'Preservation of Evidence', form_key: 'preservation_of_evidence', category: 'Evidence & Financials', description: 'Demand to preserve evidence related to the case.', naming_pattern: '{LastName}_{FirstName}_{DOL}_PreservationOfEvidence_v{Version}', is_active: true, is_system: true, icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', sort_order: 7 },
  { name: 'Distribution Sheet', form_key: 'distribution_sheet', category: 'Evidence & Financials', description: 'Settlement distribution breakdown for all parties.', naming_pattern: '{LastName}_{FirstName}_{DOL}_DistributionSheet_v{Version}', is_active: true, is_system: true, icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', sort_order: 8 },
  { name: 'IDOT Crash Report / UM Request', form_key: 'idot_um', category: 'Records & Authorization', description: 'Illinois DOT crash report request with UM/UIM coverage notification.', naming_pattern: '{LastName}_{FirstName}_{DOL}_IDOT_UM_v{Version}', is_active: true, is_system: true, icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', sort_order: 9 },
];

export async function getFormTemplates(firmId: string): Promise<FormTemplate[]> {
  const { data, error } = await supabase
    .from('form_templates')
    .select('*')
    .eq('firm_id', firmId)
    .order('category')
    .order('sort_order');

  if (error) {
    console.error('Error fetching form templates:', error);
    return [];
  }
  return data || [];
}

export async function seedSystemTemplates(firmId: string): Promise<FormTemplate[]> {
  const existing = await getFormTemplates(firmId);
  if (existing.length > 0) return existing;

  const rows = SYSTEM_TEMPLATES.map(t => ({ ...t, firm_id: firmId }));
  const { data, error } = await supabase
    .from('form_templates')
    .insert(rows)
    .select();

  if (error) {
    console.error('Error seeding templates:', error);
    return [];
  }
  return data || [];
}

export async function upsertFormTemplate(template: Partial<FormTemplate> & { firm_id: string; form_key: string; name: string }): Promise<{ data: FormTemplate | null; error: string | null }> {
  const now = new Date().toISOString();
  const row = {
    ...template,
    updated_at: now,
    ...(!template.id ? { created_at: now } : {}),
  };

  const { data, error } = await supabase
    .from('form_templates')
    .upsert(row, { onConflict: 'firm_id,form_key' })
    .select()
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function deleteFormTemplate(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('form_templates')
    .delete()
    .eq('id', id);

  return { error: error?.message || null };
}

export async function toggleTemplateActive(id: string, isActive: boolean): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('form_templates')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  return { error: error?.message || null };
}
