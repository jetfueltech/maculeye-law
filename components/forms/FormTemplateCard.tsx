import React, { useState } from 'react';
import { FormTemplate } from '../../services/formTemplateService';

interface FormTemplateCardProps {
  template: FormTemplate;
  onToggleActive: (template: FormTemplate) => void;
  onEdit: (template: FormTemplate) => void;
  onDelete: (template: FormTemplate) => void;
  onPreview: (template: FormTemplate) => void;
}

export const FormTemplateCard: React.FC<FormTemplateCardProps> = ({
  template,
  onToggleActive,
  onEdit,
  onDelete,
  onPreview,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`relative bg-white rounded-xl border border-stone-200 p-5 transition-all group ${
        template.is_active
          ? 'hover:border-stone-300 hover:shadow-md'
          : 'opacity-60 bg-stone-50'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
          template.is_active ? 'bg-stone-100 group-hover:bg-blue-50' : 'bg-stone-100'
        }`}>
          <svg
            className={`w-5 h-5 transition-colors ${
              template.is_active ? 'text-stone-500 group-hover:text-blue-600' : 'text-stone-400'
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={template.icon} />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          {template.is_system && (
            <span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full border border-stone-200">
              System
            </span>
          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors opacity-0 group-hover:opacity-100"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
              </svg>
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 w-40 overflow-hidden">
                  <button
                    onClick={() => { onEdit(template); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => { onToggleActive(template); setShowMenu(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={template.is_active ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' : 'M5 13l4 4L19 7'} />
                    </svg>
                    {template.is_active ? 'Disable' : 'Enable'}
                  </button>
                  {!template.is_system && (
                    <button
                      onClick={() => { onDelete(template); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 border-t border-stone-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <h5 className="text-sm font-bold text-stone-800 mb-1">{template.name}</h5>
      <p className="text-xs text-stone-500 leading-relaxed mb-3">{template.description}</p>

      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded border border-stone-100 truncate max-w-[180px]">
          {template.form_key}
        </span>
        <button
          onClick={() => onToggleActive(template)}
          className={`relative w-9 h-5 rounded-full transition-colors ${
            template.is_active ? 'bg-emerald-500' : 'bg-stone-300'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              template.is_active ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {template.is_active && (
        <button
          onClick={() => onPreview(template)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-stone-600 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 hover:border-stone-300 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Preview Form
        </button>
      )}
    </div>
  );
};
