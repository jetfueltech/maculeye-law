import React from 'react';
import { ContactInfo } from '../services/workflowEngine';

interface ContactActionModalProps {
  contact: ContactInfo;
  mode: 'call' | 'sms' | 'email';
  onClose: () => void;
  callTimer: number;
  isCallActive: boolean;
  callNote: string;
  smsMessage: string;
  emailSubject: string;
  emailBody: string;
  formatTime: (s: number) => string;
  onStartCall: () => void;
  onEndCall: () => void;
  onSaveCall: () => void;
  onCallNoteChange: (v: string) => void;
  onSmsChange: (v: string) => void;
  onSendSMS: () => void;
  onEmailSubjectChange: (v: string) => void;
  onEmailBodyChange: (v: string) => void;
  onSendEmail: () => void;
  onSwitchMode: (mode: 'call' | 'sms' | 'email') => void;
}

export const ContactActionModal: React.FC<ContactActionModalProps> = ({
  contact, mode, onClose, callTimer, isCallActive, callNote, smsMessage,
  emailSubject, emailBody, formatTime, onStartCall, onEndCall, onSaveCall,
  onCallNoteChange, onSmsChange, onSendSMS, onEmailSubjectChange,
  onEmailBodyChange, onSendEmail, onSwitchMode,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
    <div className="bg-white w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
      <div className="bg-slate-900 text-white p-4 flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {contact.role || 'Contact'}
            </span>
          </div>
          <h3 className="text-lg font-bold mt-1">{contact.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            {contact.phone && <span className="text-sm text-slate-400">{contact.phone}</span>}
            {contact.email && <span className="text-sm text-slate-400">{contact.email}</span>}
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex border-b border-slate-200">
        {contact.phone && (
          <button
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'call' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => onSwitchMode('call')}
          >
            Call
          </button>
        )}
        {contact.phone && (
          <button
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'sms' ? 'text-sky-600 border-b-2 border-sky-600 bg-sky-50' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => onSwitchMode('sms')}
          >
            Text
          </button>
        )}
        {contact.email && (
          <button
            className={`flex-1 py-3 text-sm font-bold transition-colors ${mode === 'email' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => onSwitchMode('email')}
          >
            Email
          </button>
        )}
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {mode === 'call' && (
          <div className="flex flex-col items-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${isCallActive ? 'bg-emerald-100 ring-8 ring-emerald-50' : 'bg-slate-100'}`}>
              <svg className={`w-10 h-10 ${isCallActive ? 'text-emerald-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </div>
            <h4 className="text-2xl font-mono font-bold text-slate-800 mb-1">
              {isCallActive ? formatTime(callTimer) : 'Ready to Call'}
            </h4>
            <p className="text-sm text-slate-500 mb-6">{isCallActive ? 'Call in progress...' : contact.phone}</p>

            <div className="w-full space-y-4">
              {isCallActive ? (
                <button
                  onClick={onEndCall}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center"
                >
                  End Call
                </button>
              ) : (
                <button
                  onClick={onStartCall}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center"
                >
                  Start Call
                </button>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Call Notes</label>
                <textarea
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="Enter call details here..."
                  value={callNote}
                  onChange={e => onCallNoteChange(e.target.value)}
                />
              </div>
              {!isCallActive && callTimer > 0 && (
                <button
                  onClick={onSaveCall}
                  className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors"
                >
                  Save Call Log
                </button>
              )}
            </div>
          </div>
        )}

        {mode === 'sms' && (
          <div className="flex flex-col h-full">
            <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 mb-4 min-h-[120px] flex items-center justify-center">
              <p className="text-xs text-slate-400">New SMS to {contact.phone}</p>
            </div>
            <textarea
              className="w-full h-20 p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500 resize-none mb-3"
              placeholder="Type SMS message..."
              value={smsMessage}
              onChange={e => onSmsChange(e.target.value)}
            />
            <button
              onClick={onSendSMS}
              disabled={!smsMessage.trim()}
              className="w-full py-3 rounded-xl font-bold shadow-md flex items-center justify-center transition-all bg-sky-600 text-white hover:bg-sky-700 shadow-sky-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Message
            </button>
          </div>
        )}

        {mode === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To</label>
              <p className="text-sm text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">{contact.email}</p>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Subject</label>
              <input
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email subject..."
                value={emailSubject}
                onChange={e => onEmailSubjectChange(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
              <textarea
                className="w-full h-32 p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Compose email..."
                value={emailBody}
                onChange={e => onEmailBodyChange(e.target.value)}
              />
            </div>
            <button
              onClick={onSendEmail}
              disabled={!emailBody.trim()}
              className="w-full py-3 rounded-xl font-bold shadow-md flex items-center justify-center transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Email
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
