import React, { useState, useRef, useEffect } from 'react';

interface InlineEditFieldProps {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'date' | 'textarea' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
  displayValue?: React.ReactNode;
  labelExtra?: React.ReactNode;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  label,
  value,
  onSave,
  type = 'text',
  options,
  placeholder,
  displayValue,
  labelExtra,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Enter' && type === 'textarea' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const inputClass = "w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-stone-400 focus:border-stone-400 outline-none transition-all";

  if (editing) {
    return (
      <div>
        <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
          {label}
          {labelExtra}
        </label>
        {type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className={inputClass + ' h-24 resize-none'}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
        ) : type === 'select' && options ? (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className={inputClass}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          >
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            className={inputClass}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs font-semibold bg-black text-white rounded-lg hover:bg-stone-800 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs font-medium text-stone-500 hover:text-stone-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/field relative">
      <label className="block text-xs font-bold text-stone-400 uppercase mb-1">
        {label}
        {labelExtra}
      </label>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {displayValue || (
            <p className="text-base font-medium text-stone-900">
              {value || <span className="text-stone-400 italic text-sm">N/A</span>}
            </p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="flex-shrink-0 p-1 rounded-md text-stone-300 opacity-0 group-hover/field:opacity-100 hover:text-stone-600 hover:bg-stone-100 transition-all duration-150"
          title="Edit"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
