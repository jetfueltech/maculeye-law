import React, { useState, useEffect, useRef } from 'react';
import { CaseFile } from '../types';
import { useFirm } from '../contexts/FirmContext';
import {
  FormTemplate,
  getFormTemplates,
  seedSystemTemplates,
  upsertFormTemplate,
  deleteFormTemplate,
  toggleTemplateActive,
} from '../services/formTemplateService';
import { FormTemplateEditor } from './forms/FormTemplateEditor';
import { FormTemplateCard } from './forms/FormTemplateCard';
import { FormNamingConfig } from './forms/FormNamingConfig';

interface FormsPanelProps {
  cases: CaseFile[];
  onUpdateCase: (updatedCase: CaseFile) => void;
}

type ManagerTab = 'templates' | 'naming';

export const FormsPanel: React.FC<FormsPanelProps> = ({ cases, onUpdateCase }) => {
  const { activeFirm } = useFirm();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ManagerTab>('templates');
  const [editingTemplate, setEditingTemplate] = useState<FormTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const seededRef = useRef(false);

  useEffect(() => {
    if (!activeFirm?.id) return;
    loadTemplates(activeFirm.id);
  }, [activeFirm?.id]);

  const loadTemplates = async (firmId: string) => {
    setLoading(true);
    let data = await getFormTemplates(firmId);
    if (data.length === 0 && !seededRef.current) {
      seededRef.current = true;
      data = await seedSystemTemplates(firmId);
    }
    setTemplates(data);
    setLoading(false);
  };

  const handleToggleActive = async (template: FormTemplate) => {
    const newState = !template.is_active;
    setTemplates(prev => prev.map(t => t.id === template.id ? { ...t, is_active: newState } : t));
    await toggleTemplateActive(template.id, newState);
  };

  const handleSaveTemplate = async (data: Partial<FormTemplate> & { form_key: string; name: string }) => {
    if (!activeFirm?.id) return;
    const payload = {
      ...data,
      firm_id: activeFirm.id,
      ...(editingTemplate ? { id: editingTemplate.id } : {}),
    };
    const { data: saved, error } = await upsertFormTemplate(payload);
    if (error) {
      alert(`Failed to save: ${error}`);
      return;
    }
    if (saved) {
      setTemplates(prev => {
        const existing = prev.find(t => t.id === saved.id);
        if (existing) return prev.map(t => t.id === saved.id ? saved : t);
        return [...prev, saved];
      });
    }
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleDeleteTemplate = async (template: FormTemplate) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;
    const { error } = await deleteFormTemplate(template.id);
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== template.id));
    }
  };

  const handleSaveNamingPattern = async (template: FormTemplate, pattern: string) => {
    if (!activeFirm?.id) return;
    const { data: saved } = await upsertFormTemplate({
      id: template.id,
      firm_id: activeFirm.id,
      form_key: template.form_key,
      name: template.name,
      naming_pattern: pattern,
    });
    if (saved) {
      setTemplates(prev => prev.map(t => t.id === saved.id ? saved : t));
    }
  };

  const categories = Array.from(new Set(templates.map(t => t.category))).sort();

  const filtered = templates.filter(t => {
    const matchesSearch = searchQuery === '' ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.form_key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const grouped = filtered.reduce<Record<string, FormTemplate[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  const activeCount = templates.filter(t => t.is_active).length;
  const totalCount = templates.length;

  if (editingTemplate || isCreating) {
    return (
      <FormTemplateEditor
        template={editingTemplate}
        existingKeys={templates.map(t => t.form_key)}
        onSave={handleSaveTemplate}
        onCancel={() => { setEditingTemplate(null); setIsCreating(false); }}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Form Manager</h2>
          <p className="text-sm text-stone-500 mt-1">
            Manage form templates, naming conventions, and availability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-stone-50 text-stone-600 px-3 py-1.5 rounded-lg border border-stone-200">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-medium">{activeCount}/{totalCount} active</span>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Template
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-stone-200 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'templates' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Templates
        </button>
        <button
          onClick={() => setActiveTab('naming')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'naming' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Naming Conventions
        </button>
      </div>

      {activeTab === 'naming' && (
        <FormNamingConfig
          templates={templates}
          onSavePattern={handleSaveNamingPattern}
        />
      )}

      {activeTab === 'templates' && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:border-stone-400 focus:ring-1 focus:ring-stone-200"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm text-stone-700 focus:outline-none focus:border-stone-400"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-600"></div>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-5">
                <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-stone-700 mb-2">No templates found</h3>
              <p className="text-sm text-stone-400 max-w-sm">
                {searchQuery ? 'Try a different search term.' : 'Add your first form template to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(grouped).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTemplates.map(template => (
                      <FormTemplateCard
                        key={template.id}
                        template={template}
                        onToggleActive={handleToggleActive}
                        onEdit={setEditingTemplate}
                        onDelete={handleDeleteTemplate}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
