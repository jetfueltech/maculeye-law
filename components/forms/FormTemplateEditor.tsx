import React, { useState } from 'react';
import { FormTemplate } from '../../services/formTemplateService';

interface FormTemplateEditorProps {
  template: FormTemplate | null;
  existingKeys: string[];
  onSave: (data: Partial<FormTemplate> & { form_key: string; name: string }) => void;
  onCancel: () => void;
}

const CATEGORIES = [
  'Intake & Representation',
  'Records & Authorization',
  'Evidence & Financials',
  'Custom',
];

const NAMING_TOKENS = [
  { token: '{LastName}', desc: 'Client last name' },
  { token: '{FirstName}', desc: 'Client first name' },
  { token: '{DOL}', desc: 'Date of loss (YYYYMMDD)' },
  { token: '{FormType}', desc: 'Form type label' },
  { token: '{Source}', desc: 'Provider or source name' },
  { token: '{Version}', desc: 'Version number' },
  { token: '{Date}', desc: 'Current date (YYYYMMDD)' },
  { token: '{CaseNumber}', desc: 'Case number' },
];

export const FormTemplateEditor: React.FC<FormTemplateEditorProps> = ({
  template,
  existingKeys,
  onSave,
  onCancel,
}) => {
  const isEditing = !!template;
  const [name, setName] = useState(template?.name || '');
  const [formKey, setFormKey] = useState(template?.form_key || '');
  const [category, setCategory] = useState(template?.category || 'Custom');
  const [customCategory, setCustomCategory] = useState('');
  const [description, setDescription] = useState(template?.description || '');
  const [namingPattern, setNamingPattern] = useState(
    template?.naming_pattern || '{LastName}_{FirstName}_{DOL}_{FormType}_v{Version}'
  );
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(template?.sort_order ?? 0);

  const autoKey = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40);

  const effectiveKey = formKey || autoKey;
  const effectiveCategory = category === '__custom__' ? customCategory : category;

  const keyConflict = existingKeys.filter(k => !(isEditing && k === template?.form_key)).includes(effectiveKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !effectiveKey.trim()) return;
    if (keyConflict) return;

    onSave({
      name: name.trim(),
      form_key: effectiveKey.trim(),
      category: effectiveCategory || 'Custom',
      description: description.trim(),
      naming_pattern: namingPattern.trim(),
      is_active: isActive,
      sort_order: sortOrder,
      is_system: template?.is_system || false,
    });
  };

  const insertToken = (token: string) => {
    setNamingPattern(prev => prev + token);
  };

  const previewName = namingPattern
    .replace('{LastName}', 'Smith')
    .replace('{FirstName}', 'John')
    .replace('{DOL}', '20260115')
    .replace('{FormType}', effectiveKey.replace(/_/g, ''))
    .replace('{Source}', 'RushHospital')
    .replace('{Version}', '1')
    .replace('{Date}', '20260404')
    .replace('{CaseNumber}', 'SAP-2026-001');

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            {isEditing ? 'Edit Template' : 'New Form Template'}
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {isEditing ? `Editing "${template.name}"` : 'Create a new form template for document generation'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-5">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Basic Info</h3>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., IDOT Crash Report / UM Request"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Form Key
              {!isEditing && <span className="text-stone-400 font-normal ml-1">(auto-generated from name)</span>}
            </label>
            <input
              type="text"
              value={effectiveKey}
              onChange={e => setFormKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="e.g., idot_um"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-1 ${
                keyConflict
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                  : 'border-stone-200 focus:border-stone-400 focus:ring-stone-200'
              }`}
            />
            {keyConflict && (
              <p className="text-xs text-red-500 mt-1">This key already exists. Choose a different one.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
                <option value="__custom__">Custom Category...</option>
              </select>
              {category === '__custom__' && (
                <input
                  type="text"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                  placeholder="Category name"
                  className="w-full mt-2 px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Sort Order</label>
              <input
                type="number"
                value={sortOrder}
                onChange={e => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of what this form is for..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200 resize-none"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-stone-700">Active</p>
              <p className="text-xs text-stone-400">Make this template available for document generation</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isActive ? 'bg-emerald-500' : 'bg-stone-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  isActive ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">Naming Convention</h3>
          <p className="text-xs text-stone-500">
            Define how generated documents for this template will be named. Use tokens below to insert dynamic values.
          </p>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">Pattern</label>
            <input
              type="text"
              value={namingPattern}
              onChange={e => setNamingPattern(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm font-mono focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {NAMING_TOKENS.map(({ token, desc }) => (
              <button
                key={token}
                type="button"
                onClick={() => insertToken(token)}
                title={desc}
                className="text-xs font-mono bg-stone-50 text-stone-600 px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 hover:border-stone-300 transition-colors"
              >
                {token}
              </button>
            ))}
          </div>

          <div className="bg-stone-50 rounded-xl border border-stone-200 p-4">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Preview</p>
            <p className="text-sm font-mono text-stone-700 break-all">{previewName}.pdf</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!name.trim() || !effectiveKey.trim() || keyConflict}
            className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Save Changes' : 'Create Template'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-stone-600 rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
