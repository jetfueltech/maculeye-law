import React, { useState } from 'react';
import { CaseFile } from '../types';
import {
  WorkflowStageProgress,
  WorkflowCheckItem,
  WorkflowItemAction,
  ContactInfo,
  InfoField,
} from '../services/workflowEngine';

interface WorkflowStageCardProps {
  stage: WorkflowStageProgress;
  caseData: CaseFile;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkDone: (itemId: string, taskType?: string) => void;
  completingItem: string | null;
  onAction: (action: WorkflowItemAction, providerId?: string, erVisitId?: string) => void;
  onCall: (contact: ContactInfo) => void;
  onEmail: (contact: ContactInfo) => void;
  onText: (contact: ContactInfo) => void;
  actionLabels: Record<WorkflowItemAction, string>;
}

const STATUS_COLORS: Record<WorkflowStageProgress['status'], string> = {
  complete: 'bg-emerald-500 text-white border-emerald-500',
  active: 'bg-blue-600 text-white border-blue-600',
  pending: 'bg-white text-slate-400 border-slate-200',
  blocked: 'bg-white text-slate-300 border-slate-100',
};

export const WorkflowStageCard: React.FC<WorkflowStageCardProps> = ({
  stage, caseData, isExpanded, onToggle, onMarkDone, completingItem,
  onAction, onCall, onEmail, onText, actionLabels,
}) => {
  const [showContacts, setShowContacts] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const missingFields = stage.infoFields?.filter(f => f.status === 'missing') || [];
  const hasContacts = stage.contacts && stage.contacts.length > 0;
  const hasInfoFields = stage.infoFields && stage.infoFields.length > 0;

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all ${
      stage.status === 'active' ? 'border-blue-200 shadow-sm shadow-blue-50' : 'border-slate-200'
    }`}>
      <div
        className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-colors ${
          stage.status === 'active' ? 'bg-blue-50 hover:bg-blue-100/50' : 'bg-slate-50 hover:bg-slate-100/50'
        }`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${STATUS_COLORS[stage.status]}`}>
            {stage.status === 'complete' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stage.icon} /></svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{stage.label}</span>
              {stage.status === 'active' && (
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Current</span>
              )}
              {stage.status === 'complete' && (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Complete</span>
              )}
              {missingFields.length > 0 && stage.status !== 'complete' && (
                <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full">
                  {missingFields.length} missing
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {hasContacts && stage.status !== 'complete' && (
            <div className="flex -space-x-1.5 mr-2">
              {stage.contacts!.slice(0, 3).map((contact, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center" title={contact.name}>
                  <span className="text-[8px] font-bold text-slate-500">
                    {contact.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <span className="text-sm font-bold text-slate-700">{stage.completedItems}/{stage.totalItems}</span>
          <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div>
          {(hasContacts || hasInfoFields) && stage.status !== 'complete' && (
            <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {hasContacts && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowContacts(!showContacts); setShowInfo(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      showContacts ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Contacts ({stage.contacts!.length})
                  </button>
                )}
                {hasInfoFields && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowInfo(!showInfo); setShowContacts(false); }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                      showInfo ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Info Gathered
                    {missingFields.length > 0 && (
                      <span className="bg-rose-100 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{missingFields.length}</span>
                    )}
                  </button>
                )}
              </div>

              {showContacts && (
                <div className="mt-3 space-y-2 animate-fade-in">
                  {stage.contacts!.map((contact, i) => (
                    <ContactBadge key={i} contact={contact} onCall={onCall} onEmail={onEmail} onText={onText} />
                  ))}
                </div>
              )}

              {showInfo && (
                <div className="mt-3 grid grid-cols-2 gap-2 animate-fade-in">
                  {stage.infoFields!.map((field, i) => (
                    <InfoFieldRow key={i} field={field} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="divide-y divide-slate-50">
            {stage.items.map(item => (
              <WorkflowItemRow
                key={item.id}
                item={item}
                completingItem={completingItem}
                onMarkDone={onMarkDone}
                onAction={onAction}
                onCall={onCall}
                onEmail={onEmail}
                onText={onText}
                actionLabels={actionLabels}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ContactBadge: React.FC<{
  contact: ContactInfo;
  onCall: (c: ContactInfo) => void;
  onEmail: (c: ContactInfo) => void;
  onText: (c: ContactInfo) => void;
}> = ({ contact, onCall, onEmail, onText }) => {
  const initials = contact.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const hasPhone = !!contact.phone;
  const hasEmail = !!contact.email;

  return (
    <div className="flex items-center gap-3 bg-white rounded-lg border border-slate-200 px-3 py-2.5 group hover:border-blue-200 transition-colors">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-bold text-slate-600">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{contact.name}</p>
        <div className="flex items-center gap-2">
          {contact.role && <span className="text-[10px] text-slate-400">{contact.role}</span>}
          {contact.phone && (
            <>
              <span className="text-[10px] text-slate-300">|</span>
              <span className="text-[10px] text-slate-500 font-mono">{contact.phone}</span>
            </>
          )}
          {contact.email && (
            <>
              <span className="text-[10px] text-slate-300">|</span>
              <span className="text-[10px] text-slate-500 truncate">{contact.email}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {hasPhone && (
          <button
            onClick={(e) => { e.stopPropagation(); onCall(contact); }}
            className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors"
            title="Call"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
        )}
        {hasPhone && (
          <button
            onClick={(e) => { e.stopPropagation(); onText(contact); }}
            className="w-7 h-7 rounded-lg bg-sky-50 hover:bg-sky-100 flex items-center justify-center transition-colors"
            title="Text"
          >
            <svg className="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </button>
        )}
        {hasEmail && (
          <button
            onClick={(e) => { e.stopPropagation(); onEmail(contact); }}
            className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
            title="Email"
          >
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

const InfoFieldRow: React.FC<{ field: InfoField }> = ({ field }) => {
  const statusStyles = {
    gathered: 'bg-emerald-50 border-emerald-200',
    partial: 'bg-amber-50 border-amber-200',
    missing: 'bg-rose-50 border-rose-200',
  };
  const statusDot = {
    gathered: 'bg-emerald-500',
    partial: 'bg-amber-400',
    missing: 'bg-rose-400',
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${statusStyles[field.status]}`}>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[field.status]}`} />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase">{field.label}</span>
        {field.value ? (
          <p className="text-xs text-slate-700 truncate">{field.value}</p>
        ) : (
          <p className="text-xs text-rose-400 italic">Not provided</p>
        )}
      </div>
    </div>
  );
};

const WorkflowItemRow: React.FC<{
  item: WorkflowCheckItem;
  completingItem: string | null;
  onMarkDone: (itemId: string, taskType?: string) => void;
  onAction: (action: WorkflowItemAction, providerId?: string, erVisitId?: string) => void;
  onCall: (c: ContactInfo) => void;
  onEmail: (c: ContactInfo) => void;
  onText: (c: ContactInfo) => void;
  actionLabels: Record<WorkflowItemAction, string>;
}> = ({ item, completingItem, onMarkDone, onAction, onCall, onEmail, onText, actionLabels }) => (
  <div className={`flex items-start gap-3 px-6 py-3.5 group ${item.done ? 'bg-white' : item.urgent ? 'bg-amber-50' : 'bg-white hover:bg-slate-50/50'}`}>
    <button
      onClick={() => !item.done && item.taskType && onMarkDone(item.id, item.taskType)}
      className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
        item.done
          ? 'bg-emerald-500 border-emerald-500'
          : completingItem === item.id
          ? 'border-emerald-400 bg-emerald-50'
          : item.urgent
          ? 'border-amber-400 hover:bg-amber-50'
          : item.taskType
          ? 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
          : 'border-slate-200 cursor-default'
      }`}
    >
      {item.done && (
        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      )}
    </button>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-800 font-medium'}`}>
          {item.label}
        </span>
      </div>
      {item.detail && !item.done && (
        <p className={`text-xs mt-0.5 ${item.urgent ? 'text-amber-600 font-medium' : 'text-slate-400'}`}>{item.detail}</p>
      )}
      {item.contact && !item.done && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-400">{item.contact.name}</span>
          {item.contact.phone && <span className="text-[10px] text-slate-400 font-mono">{item.contact.phone}</span>}
        </div>
      )}
      {item.infoNeeded && item.infoNeeded.length > 0 && !item.done && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {item.infoNeeded.map((info, i) => (
            <span key={i} className="text-[9px] bg-rose-50 text-rose-500 border border-rose-100 px-1.5 py-0.5 rounded font-medium">
              {info}
            </span>
          ))}
        </div>
      )}
    </div>

    <div className="flex items-center gap-1.5 flex-shrink-0">
      {item.contact && !item.done && (item.contact.phone || item.contact.email) && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.contact.phone && (
            <button
              onClick={(e) => { e.stopPropagation(); onCall(item.contact!); }}
              className="w-6 h-6 rounded bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors"
              title="Call"
            >
              <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          )}
          {item.contact.phone && (
            <button
              onClick={(e) => { e.stopPropagation(); onText(item.contact!); }}
              className="w-6 h-6 rounded bg-sky-50 hover:bg-sky-100 flex items-center justify-center transition-colors"
              title="Text"
            >
              <svg className="w-3 h-3 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          )}
          {item.contact.email && (
            <button
              onClick={(e) => { e.stopPropagation(); onEmail(item.contact!); }}
              className="w-6 h-6 rounded bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors"
              title="Email"
            >
              <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          )}
        </div>
      )}

      {item.urgent && !item.done && (
        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">Follow Up</span>
      )}

      {item.action && !item.done && (
        <button
          onClick={e => { e.stopPropagation(); onAction(item.action!, item.providerId, item.erVisitId); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" /></svg>
          {actionLabels[item.action]}
        </button>
      )}

      {item.action && item.done && (
        <span className="text-[10px] font-medium text-emerald-600 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          Sent
        </span>
      )}
    </div>
  </div>
);
