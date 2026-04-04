import React, { useState } from 'react';
import { FormTemplate } from '../../services/formTemplateService';

interface FormNamingConfigProps {
  templates: FormTemplate[];
  onSavePattern: (template: FormTemplate, pattern: string) => void;
}

const NAMING_TOKENS = [
  { token: '{LastName}', desc: 'Client last name', example: 'Smith' },
  { token: '{FirstName}', desc: 'Client first name', example: 'John' },
  { token: '{DOL}', desc: 'Date of loss (YYYYMMDD)', example: '20260115' },
  { token: '{FormType}', desc: 'Form type label', example: 'LOR' },
  { token: '{Source}', desc: 'Provider or source name', example: 'RushHospital' },
  { token: '{Version}', desc: 'Version number', example: '1' },
  { token: '{Date}', desc: 'Current date (YYYYMMDD)', example: '20260404' },
  { token: '{CaseNumber}', desc: 'Case number', example: 'SAP-2026-001' },
];

function resolvePreview(pattern: string, formKey: string): string {
  return pattern
    .replace('{LastName}', 'Smith')
    .replace('{FirstName}', 'John')
    .replace('{DOL}', '20260115')
    .replace('{FormType}', formKey.replace(/_/g, ''))
    .replace('{Source}', 'RushHospital')
    .replace('{Version}', '1')
    .replace('{Date}', '20260404')
    .replace('{CaseNumber}', 'SAP-2026-001');
}

export const FormNamingConfig: React.FC<FormNamingConfigProps> = ({
  templates,
  onSavePattern,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (template: FormTemplate) => {
    setEditingId(template.id);
    setEditValue(template.naming_pattern);
  };

  const saveEdit = (template: FormTemplate) => {
    onSavePattern(template, editValue);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">Available Tokens</h3>
        <p className="text-xs text-stone-500 mb-4">
          Use these tokens in your naming patterns. They will be replaced with actual values when a document is generated.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {NAMING_TOKENS.map(({ token, desc, example }) => (
            <div key={token} className="bg-stone-50 rounded-xl border border-stone-200 p-3">
              <p className="text-xs font-mono font-bold text-stone-700 mb-0.5">{token}</p>
              <p className="text-[10px] text-stone-400">{desc}</p>
              <p className="text-[10px] text-stone-500 mt-1 font-mono">e.g. {example}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-200">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Template Naming Patterns</h3>
        </div>
        <div className="divide-y divide-stone-100">
          {templates.map(template => (
            <div key={template.id} className="px-6 py-4 hover:bg-stone-50 transition-colors group">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className="text-sm font-bold text-stone-800">{template.name}</h4>
                    {!template.is_active && (
                      <span className="text-[10px] font-bold bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded-full">
                        Disabled
                      </span>
                    )}
                  </div>

                  {editingId === template.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-sm font-mono focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-400">Preview:</span>
                        <span className="text-xs font-mono text-stone-600">
                          {resolvePreview(editValue, template.form_key)}.pdf
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveEdit(template)}
                          className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold hover:bg-stone-800 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-stone-500 rounded-lg text-xs font-medium hover:bg-stone-100 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-mono text-stone-500 mb-1 break-all">{template.naming_pattern}</p>
                      <p className="text-[10px] text-stone-400">
                        Preview: <span className="font-mono">{resolvePreview(template.naming_pattern, template.form_key)}.pdf</span>
                      </p>
                    </>
                  )}
                </div>

                {editingId !== template.id && (
                  <button
                    onClick={() => startEdit(template)}
                    className="px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700 bg-stone-50 hover:bg-stone-100 rounded-lg border border-stone-200 hover:border-stone-300 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
