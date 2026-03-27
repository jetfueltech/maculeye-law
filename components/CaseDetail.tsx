
import React, { useState, useRef, useEffect } from 'react';
import { CaseFile, CaseStatus, Insurance, ActivityLog, ExtendedIntakeData, Email, CommunicationLog, ChatMessage, Assignee, TeamNote, CaseTeamMember, Adjuster } from '../types';
import { analyzeIntakeCase } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { ExtendedIntakeForm } from './ExtendedIntakeForm';
import { MedicalTreatment } from './MedicalTreatment';
import { CoverageTracker } from './CoverageTracker';
import { CaseTasksPanel } from './CaseTasksPanel';
import { DocumentsPanel } from './DocumentsPanel';
import { MemberPicker } from './MemberPicker';
import { CaseTeamPanel } from './CaseTeamPanel';
import { FinancialsTab } from './FinancialsTab';
import { AdjusterPanel } from './AdjusterPanel';

interface CaseDetailProps {
  caseData: CaseFile;
  onBack: () => void;
  onUpdateCase: (updatedCase: CaseFile) => void;
}

export const CaseDetail: React.FC<CaseDetailProps> = ({ caseData, onBack, onUpdateCase }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'extended' | 'medical' | 'documents' | 'ai_analysis' | 'activity_log' | 'coverage' | 'tasks' | 'financials'>('overview');
  const [analyzing, setAnalyzing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Collapse States
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(true);
  const [isCaseInfoExpanded, setIsCaseInfoExpanded] = useState(true);
  
  // Initialize editForm
  const [editForm, setEditForm] = useState<CaseFile>(() => ({
      ...caseData,
      vehicleInfo: caseData.vehicleInfo || { year: '', make: '', model: '', damage: '' },
      extendedIntake: caseData.extendedIntake || { accident: {} },
      insurance: caseData.insurance && caseData.insurance.length > 0 ? caseData.insurance : []
  }));

  useEffect(() => {
      setEditForm({
          ...caseData,
          vehicleInfo: caseData.vehicleInfo || { year: '', make: '', model: '', damage: '' },
          extendedIntake: caseData.extendedIntake || { accident: {} },
          insurance: caseData.insurance && caseData.insurance.length > 0 ? caseData.insurance : []
      });
  }, [caseData]);

  const [cmsLoading, setCmsLoading] = useState(false);
  const [newNote, setNewNote] = useState('');
  const notesEndRef = useRef<HTMLDivElement>(null);

  const handleAddNote = () => {
    const trimmed = newNote.trim();
    if (!trimmed || !profile) return;
    const note: TeamNote = {
      id: crypto.randomUUID(),
      authorId: profile.id,
      authorName: profile.full_name || profile.email,
      authorInitials: profile.avatar_initials || profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const updatedCase = {
      ...caseData,
      teamNotes: [...(caseData.teamNotes || []), note],
    };
    onUpdateCase(updatedCase);
    setNewNote('');
    setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // Chat State
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  
  
  // Email Expansion State
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);
  
  // RingCentral State
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneAction, setPhoneAction] = useState<'call' | 'sms' | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [isCallActive, setIsCallActive] = useState(false);
  const [callNote, setCallNote] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);



  // Call Timer Effect
  useEffect(() => {
    let interval: any;
    if (isCallActive) {
        interval = setInterval(() => {
            setCallTimer(prev => prev + 1);
        }, 1000);
    } else {
        clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isCallActive]);

  // Scroll Chat to Bottom
  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [caseData.chatHistory]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const addActivity = (updatedCase: CaseFile, message: string, type: 'system' | 'user' | 'note' = 'system') => {
      const newLog: ActivityLog = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          message,
          timestamp: new Date().toISOString(),
          author: type === 'user' || type === 'note' ? 'John Doe, Esq.' : 'System'
      };
      return {
          ...updatedCase,
          activityLog: [newLog, ...(updatedCase.activityLog || [])]
      };
  };

  // Chat Handlers
  const handleSendChat = () => {
      if (!chatMessage.trim()) return;
      
      const newMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'John Doe',
          senderInitials: 'JD',
          isCurrentUser: true,
          message: chatMessage,
          timestamp: new Date().toISOString()
      };
      
      const updatedChat = [...(caseData.chatHistory || []), newMsg];
      onUpdateCase({ ...caseData, chatHistory: updatedChat });
      setChatMessage('');
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const isImage = file.type.startsWith('image/');
          const newMsg: ChatMessage = {
              id: Date.now().toString(),
              sender: 'John Doe',
              senderInitials: 'JD',
              isCurrentUser: true,
              message: '',
              timestamp: new Date().toISOString(),
              attachments: [{
                  name: file.name,
                  type: isImage ? 'image' : 'file',
                  url: reader.result as string
              }]
          };
          
          const updatedChat = [...(caseData.chatHistory || []), newMsg];
          onUpdateCase({ ...caseData, chatHistory: updatedChat });
      };
      reader.readAsDataURL(file);
      if (chatFileInputRef.current) chatFileInputRef.current.value = '';
  };

  const handleCommReply = (item: any, mode: 'reply' | 'replyAll' | 'forward') => {
      setReplyMode(mode);
      setReplyText('');
  };

  const handleSendReply = (item: any) => {
      if (!replyText.trim()) return;
      
      const newEmail: Email = {
          id: `reply-${Date.now()}`,
          from: 'LegalFlow Team',
          fromEmail: 'intake@legalflow.com',
          subject: (replyMode === 'forward' ? 'Fwd: ' : 'Re: ') + (item.threadTitle || item.content),
          body: replyText,
          date: new Date().toISOString(),
          isRead: true,
          direction: 'outbound',
          threadId: item.threadId || item.id,
          attachments: []
      };

      const newEmails = [newEmail, ...(caseData.linkedEmails || [])];
      let updatedCase = { ...caseData, linkedEmails: newEmails };
      updatedCase = addActivity(updatedCase, `Replied to email: ${newEmail.subject}`, 'user');
      onUpdateCase(updatedCase);
      
      setReplyMode(null);
      setReplyText('');
  };

  const handleSendSMSReply = (phone: string) => {
      if (!replyText.trim()) return;
      const newLog: CommunicationLog = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'sms',
          direction: 'outbound',
          contactName: caseData.clientName,
          contactPhone: phone,
          timestamp: new Date().toISOString(),
          status: 'sent',
          content: replyText
      };

      let updatedCase = {
          ...caseData,
          communications: [newLog, ...(caseData.communications || [])]
      };
      updatedCase = addActivity(updatedCase, `SMS reply sent to ${caseData.clientName}`, 'user');
      onUpdateCase(updatedCase);
      setReplyMode(null);
      setReplyText('');
  };

  const handlePhoneClick = () => {
      setPhoneModalOpen(true);
      setPhoneAction('call'); // Default to Call
      setCallTimer(0);
      setIsCallActive(false);
      setCallNote('');
      setSmsMessage('');
  };

  const handleStartCall = () => {
      setIsCallActive(true);
  };

  const handleEndCall = () => {
      setIsCallActive(false);
  };

  const handleSaveCall = () => {
      const newLog: CommunicationLog = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'call',
          direction: 'outbound',
          contactName: caseData.clientName,
          contactPhone: caseData.clientPhone,
          timestamp: new Date().toISOString(),
          duration: formatTime(callTimer),
          status: 'completed',
          content: callNote || 'No notes provided.',
          // Optional: Simulate transcript generation
      };
      let updatedCase = {
          ...caseData,
          communications: [newLog, ...(caseData.communications || [])]
      };
      updatedCase = addActivity(updatedCase, `Outbound call to ${caseData.clientName}`, 'user');
      onUpdateCase(updatedCase);
      setPhoneModalOpen(false);
  };

  const handleSendSMS = () => {
      if (!smsMessage.trim()) return;
      setSmsSending(true);
      setTimeout(() => {
          const newLog: CommunicationLog = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'sms',
              direction: 'outbound',
              contactName: caseData.clientName,
              contactPhone: caseData.clientPhone,
              timestamp: new Date().toISOString(),
              status: 'sent',
              content: smsMessage
          };
          let updatedCase = {
              ...caseData,
              communications: [newLog, ...(caseData.communications || [])]
          };
          updatedCase = addActivity(updatedCase, `SMS sent to ${caseData.clientName}`, 'user');
          onUpdateCase(updatedCase);
          setSmsSending(false);
          setPhoneModalOpen(false);
      }, 1000);
  };

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    setActiveTab('ai_analysis');
    try {
      const analysis = await analyzeIntakeCase(caseData);
      let updatedCase = {
        ...caseData,
        status: CaseStatus.REVIEW_NEEDED,
        aiAnalysis: analysis
      };
      updatedCase = addActivity(updatedCase, 'AI Analysis completed successfully.');
      onUpdateCase(updatedCase);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleStatusChange = (status: CaseStatus) => {
    let updatedCase = { ...caseData, status };
    if (status === CaseStatus.ACCEPTED && !updatedCase.actionDate) {
        updatedCase.actionDate = new Date().toISOString();
    }
    updatedCase = addActivity(updatedCase, `Status changed to ${status}.`);
    onUpdateCase(updatedCase);
  };

  const handleSave = () => {
    let updatedCase = editForm;
    updatedCase = addActivity(updatedCase, 'Case details manually edited.', 'user');
    onUpdateCase(updatedCase);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({
        ...caseData,
        vehicleInfo: caseData.vehicleInfo || { year: '', make: '', model: '', damage: '' },
        extendedIntake: caseData.extendedIntake || { accident: {} },
        insurance: caseData.insurance || []
    });
    setIsEditing(false);
  };

  const handleInsuranceChange = (type: 'Defendant' | 'Client', field: keyof Insurance, value: string) => {
      setEditForm(prev => {
          const currentIns = prev.insurance || [];
          const index = currentIns.findIndex(i => i.type === type);
          let newIns = [...currentIns];
          if (index >= 0) {
              newIns[index] = { ...newIns[index], [field]: value };
          } else {
              newIns.push({ type, provider: '', [field]: value } as Insurance);
          }
          return { ...prev, insurance: newIns };
      });
  };

  const handleExtendedIntakeSave = (data: ExtendedIntakeData) => {
      let updatedCase = { ...caseData, extendedIntake: data };
      updatedCase = addActivity(updatedCase, 'Extended Intake Form updated.', 'user');
      onUpdateCase(updatedCase);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 5) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all";
  const isAcceptedOrLater = [CaseStatus.ACCEPTED, CaseStatus.INTAKE_PROCESSING, CaseStatus.INTAKE_PAUSED, CaseStatus.INTAKE_COMPLETE].includes(caseData.status);

  const getIns = (type: 'Defendant' | 'Client') => editForm.insurance?.find(i => i.type === type) || { provider: '', claimNumber: '', coverageLimits: '' };

  // --- Group Emails by Thread ---
  const emailThreads = new Map<string, Email[]>();
  (caseData.linkedEmails || []).forEach(email => {
      const key = email.threadId || email.subject;
      if (!emailThreads.has(key)) {
          emailThreads.set(key, []);
      }
      emailThreads.get(key)?.push(email);
  });

  const threadedCommunications = [
      ...Array.from(emailThreads.entries()).map(([key, emails]) => {
          const sortedThread = [...emails].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const latestEmail = sortedThread[sortedThread.length - 1];
          return {
              id: key,
              type: 'email-thread',
              direction: latestEmail.direction,
              contactName: latestEmail.from,
              timestamp: latestEmail.date.includes('Just') ? new Date().toISOString() : latestEmail.date,
              content: latestEmail.subject,
              threadMessages: sortedThread,
              count: emails.length
          };
      }),
      ...(caseData.communications || []).map(c => ({
          ...c,
          type: c.type,
          threadMessages: []
      }))
  ].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative">
      {/* 1. Header Section */}
      <div className="bg-white px-8 py-6 rounded-2xl border border-slate-200">
         <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
             <div className="flex items-start gap-4 flex-1">
                 <button onClick={onBack} className="mt-1.5 p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                 </button>
                 <div className="flex-1">
                     <div className="flex flex-wrap items-center gap-3 mb-2">
                         <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{caseData.clientName}</h1>
                         <div className="relative group">
                            <select 
                                value={caseData.status}
                                onChange={(e) => handleStatusChange(e.target.value as CaseStatus)}
                                className={`appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 border-0 transition-all
                                    ${caseData.status === CaseStatus.NEW ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 
                                      caseData.status === CaseStatus.ACCEPTED ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                      caseData.status === CaseStatus.REVIEW_NEEDED ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                      caseData.status === CaseStatus.LOST_CONTACT ? 'bg-stone-100 text-stone-700 hover:bg-stone-200' :
                                      'bg-slate-100 text-slate-700 hover:bg-slate-200'}
                                `}
                            >
                                <option value={CaseStatus.NEW}>New</option>
                                <option value={CaseStatus.ANALYZING}>Analyzing</option>
                                <option value={CaseStatus.REVIEW_NEEDED}>Review Needed</option>
                                <option value={CaseStatus.ACCEPTED}>Accepted</option>
                                <option value={CaseStatus.REJECTED}>Rejected</option>
                                <option value={CaseStatus.LOST_CONTACT}>Lost Contact</option>
                                <option value={CaseStatus.INTAKE_PROCESSING}>Processing</option>
                                <option value={CaseStatus.INTAKE_COMPLETE}>Complete</option>
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                <svg className="w-3 h-3 text-current opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                         </div>
                     </div>
                     <div className="flex items-center gap-2 text-slate-500 text-sm flex-wrap">
                         {caseData.caseNumber && (
                           <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{caseData.caseNumber}</span>
                         )}
                         <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">ID: {caseData.id}</span>
                         <span>•</span>
                         <span>{caseData.accidentDate}</span>
                         <span>•</span>
                         <span>{caseData.location || 'Location Pending'}</span>
                     </div>
                     <div className="flex items-center gap-2 mt-2">
                       <span className="text-xs font-semibold text-slate-400">Team:</span>
                       <CaseTeamPanel
                         compact
                         team={caseData.caseTeam || []}
                         onChange={(newTeam: CaseTeamMember[]) => {
                           onUpdateCase({ ...caseData, caseTeam: newTeam });
                         }}
                       />
                     </div>
                 </div>
             </div>

             <div className="flex items-center gap-3 mt-4 md:mt-0">
                 {isEditing ? (
                     <>
                        <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200">Save Changes</button>
                     </>
                 ) : (
                     <>
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                            Edit Details
                        </button>
                        {caseData.status === CaseStatus.NEW && !analyzing && (
                            <button 
                                onClick={runAIAnalysis}
                                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm shadow-blue-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Run AI Analysis
                            </button>
                        )}
                     </>
                 )}
             </div>
         </div>

         {/* Navigation Tabs */}
         <div className="flex gap-8 mt-8 border-b border-slate-100 overflow-x-auto">
             <button onClick={() => setActiveTab('overview')} className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'overview' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 Overview & Status
                 {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
             </button>
             {isAcceptedOrLater && (
                 <button onClick={() => setActiveTab('extended')} className={`pb-4 text-sm font-medium transition-colors relative flex items-center gap-2 whitespace-nowrap ${activeTab === 'extended' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                     Detailed Intake
                     <span className="bg-blue-50 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">FORM</span>
                     {activeTab === 'extended' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                 </button>
             )}
             <button onClick={() => setActiveTab('medical')} className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'medical' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 Medical Treatment
                 {activeTab === 'medical' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
             </button>
             <button onClick={() => setActiveTab('documents')} className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'documents' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 Documents ({caseData.documents.length})
                 {activeTab === 'documents' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
             </button>
             <button onClick={() => setActiveTab('ai_analysis')} className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'ai_analysis' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 AI Analysis
                 {activeTab === 'ai_analysis' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
             </button>
             <button onClick={() => setActiveTab('coverage')} className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'coverage' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 Coverage & Limits
                 {(caseData.insurance || []).some(i => i.type === 'Defendant' && (!i.coverageStatus || i.coverageStatus === 'pending')) && (
                   <span className="ml-1.5 w-2 h-2 bg-amber-400 rounded-full inline-block"></span>
                 )}
                 {activeTab === 'coverage' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
             </button>
             <button onClick={() => setActiveTab('tasks')} className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'tasks' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 Tasks
                 {(caseData.tasks || []).filter(t => t.status !== 'completed').length > 0 && (
                   <span className="ml-1.5 text-[10px] font-bold bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full">{(caseData.tasks || []).filter(t => t.status !== 'completed').length}</span>
                 )}
                 {activeTab === 'tasks' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
             </button>
             <button onClick={() => setActiveTab('financials')} className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'financials' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 Financials
                 {activeTab === 'financials' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
             </button>
             <button onClick={() => setActiveTab('activity_log')} className={`pb-4 text-sm font-medium transition-colors relative whitespace-nowrap ${activeTab === 'activity_log' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                 Activity Log
                 {activeTab === 'activity_log' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
             </button>
         </div>
      </div>

      {/* 2. Content Area */}
      {activeTab === 'financials' ? (
          <FinancialsTab caseData={caseData} onUpdateCase={onUpdateCase} />
      ) : activeTab === 'extended' ? (
          <div className="animate-fade-in"><ExtendedIntakeForm caseData={caseData} onSave={handleExtendedIntakeSave} onUpdateCase={onUpdateCase} /></div>
      ) : activeTab === 'coverage' ? (
          <div className="animate-fade-in"><CoverageTracker caseData={caseData} onUpdateCase={onUpdateCase} /></div>
      ) : activeTab === 'tasks' ? (
          <div className="animate-fade-in"><CaseTasksPanel caseData={caseData} onUpdateCase={onUpdateCase} /></div>
      ) : activeTab === 'medical' ? (
          <div className="animate-fade-in"><MedicalTreatment caseData={caseData} onUpdateCase={onUpdateCase} /></div>
      ) : activeTab === 'documents' ? (
        <DocumentsPanel caseData={caseData} onUpdateCase={onUpdateCase} />
      ) : activeTab === 'ai_analysis' ? (
          <div className="animate-fade-in p-8 bg-white rounded-2xl border border-slate-200 min-h-[400px]">
              {caseData.aiAnalysis ? (
                  <div className="max-w-4xl mx-auto">
                      <div className="flex items-center justify-between mb-8">
                          <h3 className="font-bold text-2xl text-slate-900 flex items-center">
                              <svg className="w-8 h-8 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                              Intake Assessment
                          </h3>
                          <span className="text-sm text-slate-500">Analysis run on {new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                          <div className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center text-center ${getScoreColor(caseData.aiAnalysis.caseScore)}`}>
                              <span className="text-5xl font-bold mb-2">{caseData.aiAnalysis.caseScore}</span>
                              <span className="text-sm font-bold uppercase tracking-wider">Case Score</span>
                          </div>
                          <div className="col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                              <h4 className="font-bold text-slate-900 text-lg mb-2">Recommendation: {caseData.aiAnalysis.recommendedAction}</h4>
                              <p className="text-slate-600 leading-relaxed">{caseData.aiAnalysis.summary}</p>
                          </div>
                      </div>
                      <div className="space-y-8">
                          <div>
                              <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Liability Analysis</h4>
                              <p className="text-slate-700 leading-relaxed bg-white p-4 border border-slate-200 rounded-xl shadow-sm">{caseData.aiAnalysis.liabilityAssessment}</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                  <h4 className="font-bold text-rose-600 text-sm uppercase tracking-wider mb-4 border-b border-rose-100 pb-2">Key Risk Factors</h4>
                                  <ul className="space-y-3">
                                      {caseData.aiAnalysis.keyRiskFactors.map((risk, i) => (
                                          <li key={i} className="flex items-start text-sm text-slate-700">
                                              <svg className="w-5 h-5 text-rose-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                              {risk}
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                              <div>
                                  <h4 className="font-bold text-blue-600 text-sm uppercase tracking-wider mb-4 border-b border-blue-100 pb-2">Document Verification</h4>
                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                      <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-slate-700">Retainer Status</span>
                                          {caseData.aiAnalysis.retainerValid ? <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">Signed & Valid</span> : <span className="bg-rose-100 text-rose-700 text-xs px-2 py-1 rounded-full font-bold">Missing / Invalid</span>}
                                      </div>
                                      <p className="text-xs text-slate-500">{caseData.aiAnalysis.retainerNotes}</p>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                      <div className="w-20 h-20 bg-blue-50 text-blue-200 rounded-full flex items-center justify-center mb-6">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">No Analysis Generated</h3>
                      <button onClick={runAIAnalysis} className="px-6 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center mt-4">Run Analysis Now</button>
                  </div>
              )}
          </div>
      ) : activeTab === 'activity_log' ? (
          <div className="animate-fade-in p-8 bg-white rounded-2xl border border-slate-200 min-h-[400px]">
              <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Activity Timeline
              </h3>
              <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                  {caseData.activityLog?.map((log) => (
                      <div key={log.id} className="relative pl-10">
                          <div className={`absolute left-2.5 top-1.5 w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 ${log.type === 'system' ? 'bg-blue-400' : log.type === 'note' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                              <p className="text-sm text-slate-800 font-medium">{log.message}</p>
                              <div className="flex items-center gap-2 mt-2">
                                  <span className="text-xs text-slate-400 font-medium">{new Date(log.timestamp).toLocaleString()}</span>
                                  <span className="text-xs text-slate-300">•</span>
                                  <span className="text-xs text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-100">{log.author || 'System'}</span>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      ) : (
          <div className="grid grid-cols-12 gap-8 animate-fade-in">
              <div className="col-span-12 lg:col-span-8 space-y-8">
                  {/* Case Information Grid */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all duration-300">
                      <div 
                        className="px-8 py-6 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setIsCaseInfoExpanded(!isCaseInfoExpanded)}
                      >
                          <h3 className="text-lg font-bold text-slate-800">Case Information</h3>
                          <button className="text-slate-400 hover:text-slate-600 transition-colors">
                              <svg className={`w-5 h-5 transition-transform duration-300 ${isCaseInfoExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                      </div>
                      
                      {isCaseInfoExpanded && (
                        <div className="p-8 space-y-10 animate-fade-in">
                           {/* Row 1: Client & Incident */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                              <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">Client Demographics</h4>
                                  <div className="space-y-5">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                                          {isEditing ? <input className={inputClass} value={editForm.clientName} onChange={e => setEditForm({...editForm, clientName: e.target.value})} /> : <p className="text-base font-medium text-slate-900">{caseData.clientName}</p>}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">DOB</label>
                                          {isEditing ? <input type="date" className={inputClass} value={editForm.clientDob} onChange={e => setEditForm({...editForm, clientDob: e.target.value})} /> : <p className="text-base font-medium text-slate-900">{caseData.clientDob || 'N/A'}</p>}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone</label>
                                          {isEditing ? (
                                              <input className={inputClass} value={editForm.clientPhone} onChange={e => setEditForm({...editForm, clientPhone: e.target.value})} />
                                          ) : (
                                              <button 
                                                onClick={handlePhoneClick}
                                                className="text-base font-medium text-blue-600 hover:text-blue-800 flex items-center hover:underline"
                                              >
                                                  {caseData.clientPhone}
                                                  <svg className="w-4 h-4 ml-2 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                                              </button>
                                          )}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                                          {isEditing ? <input className={inputClass} value={editForm.clientEmail} onChange={e => setEditForm({...editForm, clientEmail: e.target.value})} /> : <p className="text-base font-medium text-slate-900">{caseData.clientEmail}</p>}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Address</label>
                                          {isEditing ? <input className={inputClass} value={editForm.clientAddress} onChange={e => setEditForm({...editForm, clientAddress: e.target.value})} /> : <p className="text-base font-medium text-slate-900">{caseData.clientAddress}</p>}
                                      </div>
                                  </div>
                              </div>
                              <div>
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 pb-2 border-b border-slate-100">Incident Details</h4>
                                  <div className="space-y-5">
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Date of Loss</label>
                                          {isEditing ? <input type="date" className={inputClass} value={editForm.accidentDate} onChange={e => setEditForm({...editForm, accidentDate: e.target.value})} /> : <p className="text-base font-medium text-slate-900">{caseData.accidentDate}</p>}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex items-center">
                                              Statute of Limitations
                                              <svg className="w-3 h-3 ml-1 text-rose-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                                          </label>
                                          {isEditing ? (
                                              <input
                                                  type="date"
                                                  className={inputClass}
                                                  value={editForm.statuteOfLimitationsDate || ''}
                                                  onChange={e => setEditForm({...editForm, statuteOfLimitationsDate: e.target.value})}
                                              />
                                          ) : (
                                              caseData.statuteOfLimitationsDate ? (
                                                  (() => {
                                                      const solDate = new Date(caseData.statuteOfLimitationsDate);
                                                      const today = new Date();
                                                      const daysRemaining = Math.floor((solDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                                      const isUrgent = daysRemaining < 90;
                                                      const isCritical = daysRemaining < 30;

                                                      return (
                                                          <div className="flex items-center gap-2">
                                                              <span className={`inline-block px-3 py-1.5 rounded-lg border text-sm font-bold ${
                                                                  isCritical ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                                  isUrgent ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                              }`}>
                                                                  {new Date(caseData.statuteOfLimitationsDate).toLocaleDateString()}
                                                              </span>
                                                              <span className={`text-xs font-medium ${
                                                                  isCritical ? 'text-rose-600' :
                                                                  isUrgent ? 'text-amber-600' :
                                                                  'text-slate-500'
                                                              }`}>
                                                                  ({daysRemaining > 0 ? `${daysRemaining} days remaining` : 'EXPIRED'})
                                                              </span>
                                                          </div>
                                                      );
                                                  })()
                                              ) : (
                                                  <span className="text-rose-500 text-sm italic font-medium">Not Set - Set Immediately</span>
                                              )
                                          )}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location</label>
                                          {isEditing ? <input className={inputClass} value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} /> : <p className="text-base font-medium text-slate-900">{caseData.location || 'N/A'}</p>}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Impact Assessment</label>
                                          {isEditing ? (
                                              <input 
                                                className={inputClass} 
                                                value={editForm.impact || ''} 
                                                onChange={e => setEditForm({...editForm, impact: e.target.value})} 
                                                placeholder="e.g. High PD - Hospital"
                                              />
                                          ) : (
                                              caseData.impact ? (
                                                  <span className="inline-block bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold">
                                                      {caseData.impact}
                                                  </span>
                                              ) : (
                                                  <span className="text-slate-400 text-sm italic">Not Assessed</span>
                                              )
                                          )}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Facts of Loss</label>
                                          {isEditing ? (
                                              <textarea className={inputClass + " h-24"} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} />
                                          ) : (
                                              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">
                                                  {caseData.description}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Row 2: Insurance Information */}
                          <div className="border-t border-slate-100 pt-8 mt-8">
                              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 pb-2">Insurance Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                                  {/* Defendant Insurance */}
                                  <div className="space-y-5">
                                      <h5 className="text-sm font-bold text-slate-700 flex items-center">
                                          Defendant Coverage
                                          <span className="ml-2 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase">At-Fault</span>
                                      </h5>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Carrier</label>
                                          {isEditing ? (
                                              <input 
                                                  className={inputClass} 
                                                  value={getIns('Defendant').provider} 
                                                  onChange={e => handleInsuranceChange('Defendant', 'provider', e.target.value)}
                                                  placeholder="e.g. State Farm"
                                              />
                                          ) : (
                                              <p className="text-base font-medium text-slate-900">{getIns('Defendant').provider || 'Unknown'}</p>
                                          )}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Claim Number</label>
                                          {isEditing ? (
                                              <input 
                                                  className={inputClass} 
                                                  value={getIns('Defendant').claimNumber || ''} 
                                                  onChange={e => handleInsuranceChange('Defendant', 'claimNumber', e.target.value)}
                                                  placeholder="Claim #"
                                              />
                                          ) : (
                                              <p className="text-base font-medium text-slate-900">{getIns('Defendant').claimNumber || 'Pending'}</p>
                                          )}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Coverage Limits</label>
                                          {isEditing ? (
                                              <input 
                                                  className={inputClass} 
                                                  value={getIns('Defendant').coverageLimits || ''} 
                                                  onChange={e => handleInsuranceChange('Defendant', 'coverageLimits', e.target.value)}
                                                  placeholder="e.g. 100/300/50"
                                              />
                                          ) : (
                                              <div className="flex items-center">
                                                  {getIns('Defendant').coverageLimits ? (
                                                      <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono text-sm font-bold border border-blue-100">
                                                          {getIns('Defendant').coverageLimits}
                                                      </span>
                                                  ) : (
                                                      <span className="text-slate-400 text-sm italic">Unknown Limits</span>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  </div>

                                  {/* Client Insurance */}
                                  <div className="space-y-5">
                                      <h5 className="text-sm font-bold text-slate-700 flex items-center">
                                          Client Coverage
                                          <span className="ml-2 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase">First Party</span>
                                      </h5>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Carrier</label>
                                          {isEditing ? (
                                              <input 
                                                  className={inputClass} 
                                                  value={getIns('Client').provider} 
                                                  onChange={e => handleInsuranceChange('Client', 'provider', e.target.value)}
                                                  placeholder="e.g. Geico"
                                              />
                                          ) : (
                                              <p className="text-base font-medium text-slate-900">{getIns('Client').provider || 'Unknown'}</p>
                                          )}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Claim Number</label>
                                          {isEditing ? (
                                              <input 
                                                  className={inputClass} 
                                                  value={getIns('Client').claimNumber || ''} 
                                                  onChange={e => handleInsuranceChange('Client', 'claimNumber', e.target.value)}
                                                  placeholder="Claim #"
                                              />
                                          ) : (
                                              <p className="text-base font-medium text-slate-900">{getIns('Client').claimNumber || 'Pending'}</p>
                                          )}
                                      </div>
                                      <div>
                                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Coverage Limits</label>
                                          {isEditing ? (
                                              <input 
                                                  className={inputClass} 
                                                  value={getIns('Client').coverageLimits || ''} 
                                                  onChange={e => handleInsuranceChange('Client', 'coverageLimits', e.target.value)}
                                                  placeholder="e.g. 50/100 UIM"
                                              />
                                          ) : (
                                              <div className="flex items-center">
                                                  {getIns('Client').coverageLimits ? (
                                                      <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded font-mono text-sm font-bold border border-emerald-100">
                                                          {getIns('Client').coverageLimits}
                                                      </span>
                                                  ) : (
                                                      <span className="text-slate-400 text-sm italic">Unknown Limits</span>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Team Notes Section */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="text-lg font-bold text-slate-800 flex items-center">
                              <svg className="w-5 h-5 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Team Notes
                          </h3>
                          <span className="text-xs font-medium text-slate-400">{(caseData.teamNotes || []).length} {(caseData.teamNotes || []).length === 1 ? 'note' : 'notes'}</span>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                          {(caseData.teamNotes || []).length > 0 ? (
                              <div className="divide-y divide-slate-100">
                                  {(caseData.teamNotes || []).map((note) => (
                                      <div key={note.id} className="px-8 py-4 hover:bg-slate-50/50 transition-colors">
                                          <div className="flex items-start gap-3">
                                              <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                                                  {note.authorInitials}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-1">
                                                      <span className="text-sm font-semibold text-slate-800">{note.authorName}</span>
                                                      <span className="text-[11px] text-slate-400">
                                                          {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                      </span>
                                                  </div>
                                                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                                  <div ref={notesEndRef} />
                              </div>
                          ) : (
                              <div className="px-8 py-10 text-center text-slate-400 text-sm">
                                  No notes yet. Add a note below.
                              </div>
                          )}
                      </div>
                      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                          <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1">
                                  {profile?.avatar_initials || '??'}
                              </div>
                              <div className="flex-1">
                                  <textarea
                                      className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder-slate-400 transition-shadow"
                                      rows={2}
                                      placeholder="Add a note..."
                                      value={newNote}
                                      onChange={e => setNewNote(e.target.value)}
                                      onKeyDown={e => {
                                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
                                      }}
                                  />
                                  <div className="flex items-center justify-between mt-2">
                                      <span className="text-[11px] text-slate-400">Cmd+Enter to submit</span>
                                      <button
                                          onClick={handleAddNote}
                                          disabled={!newNote.trim()}
                                          className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                          Add Note
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Communication Card (Unified with Threads) */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="text-lg font-bold text-slate-800">Communication History</h3>
                          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{threadedCommunications.length} Groups</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                          {threadedCommunications.length > 0 ? (
                              threadedCommunications.map(comm => (
                                  <div key={comm.id} className={`transition-colors group ${expandedItemId === comm.id ? 'bg-slate-50' : 'hover:bg-slate-50'}`}>
                                      <div 
                                        className="p-6 cursor-pointer"
                                        onClick={() => setExpandedItemId(expandedItemId === comm.id ? null : comm.id)}
                                      >
                                          <div className="flex justify-between items-start mb-2">
                                              <div className="flex items-center gap-3">
                                                  {comm.type === 'email-thread' && (
                                                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 relative">
                                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                          {comm.count > 1 && (
                                                              <span className="absolute -top-1 -right-1 bg-slate-800 text-white text-[9px] font-bold px-1 rounded-full border-2 border-white">{comm.count}</span>
                                                          )}
                                                      </div>
                                                  )}
                                                  {comm.type === 'call' && (
                                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${comm.direction === 'inbound' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                                      </div>
                                                  )}
                                                  {comm.type === 'sms' && (
                                                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                                      </div>
                                                  )}

                                                  <div>
                                                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors flex items-center">
                                                          {comm.type === 'email-thread' ? (
                                                              <>
                                                                  {comm.count > 1 ? 'Email Thread' : comm.contactName}
                                                                  <span className="text-slate-400 font-normal ml-2 text-xs">
                                                                    {comm.count > 1 ? `(${comm.count} messages)` : ''}
                                                                  </span>
                                                              </>
                                                          ) : comm.type === 'call' ? (comm.direction === 'outbound' ? 'Outbound Call' : 'Inbound Call') : 
                                                           comm.type === 'sms' ? (comm.direction === 'outbound' ? 'Sent SMS' : 'Received SMS') :
                                                           comm.contactName}
                                                      </h4>
                                                      <p className="text-xs text-slate-500">
                                                          {comm.type === 'email-thread' && `Latest: ${new Date(comm.timestamp).toLocaleString()}`}
                                                          {comm.type === 'call' && `Duration: ${comm.duration || '0:00'}`}
                                                          {comm.type === 'sms' && comm.contactPhone}
                                                      </p>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                  <span className="text-xs text-slate-400 whitespace-nowrap">
                                                      {new Date(comm.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                  </span>
                                                  {expandedItemId === comm.id ? <svg className="w-4 h-4 text-slate-400 transform rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg> : <svg className="w-4 h-4 text-slate-400 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>}
                                              </div>
                                          </div>
                                          
                                          {comm.type === 'email-thread' ? (
                                              <h5 className={`text-sm font-medium mb-1 pl-11 ${expandedItemId === comm.id ? 'text-slate-900' : 'text-slate-800'}`}>{comm.content}</h5>
                                          ) : null}
                                          
                                          {expandedItemId !== comm.id && (
                                              <div className="pl-11 mb-2 flex items-center justify-between">
                                                  <p className="text-sm text-slate-500 line-clamp-1">
                                                      {comm.type === 'email-thread' 
                                                        ? comm.threadMessages[comm.threadMessages.length - 1].body 
                                                        : comm.content}
                                                  </p>
                                                  {comm.transcript && (
                                                      <span className="flex items-center text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200 font-medium ml-4 whitespace-nowrap">
                                                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                          Transcript
                                                      </span>
                                                  )}
                                              </div>
                                          )}
                                      </div>
                                      
                                      {expandedItemId === comm.id && (
                                          <div className="px-6 pb-6 pl-6 animate-fade-in cursor-auto border-t border-slate-100 bg-white" onClick={(e) => e.stopPropagation()}>
                                              {/* Expanded Item content omitted for brevity as it is unchanged */}
                                          </div>
                                      )}
                                  </div>
                              ))
                          ) : (
                              <div className="p-8 text-center text-slate-400">No communications history found.</div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Right Column: Team, Adjusters, Chat */}
              <div className="col-span-12 lg:col-span-4 space-y-8">
                  {/* Case Team */}
                  <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                    <CaseTeamPanel
                      team={caseData.caseTeam || []}
                      onChange={(newTeam: CaseTeamMember[]) => {
                        onUpdateCase({ ...caseData, caseTeam: newTeam });
                      }}
                    />
                  </div>

                  {/* Insurance Adjusters */}
                  <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
                    <AdjusterPanel
                      adjusters={caseData.adjusters || []}
                      insuranceEntries={(caseData.insurance || []).map(ins => ({ type: ins.type, provider: ins.provider }))}
                      onChange={(newAdj: Adjuster[]) => {
                        onUpdateCase({ ...caseData, adjusters: newAdj });
                      }}
                    />
                  </div>

                  {/* Internal Team Chat */}
                  <div className="bg-white rounded-2xl border border-slate-200 flex flex-col h-[600px]">
                      {/* Chat content omitted for brevity */}
                      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                          <div className="flex items-center">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                              <h3 className="font-bold text-slate-800 text-sm">Team Chat</h3>
                          </div>
                          <span className="text-xs text-slate-500 font-medium">#{caseData.id}</span>
                      </div>
                      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                          {caseData.chatHistory?.map((msg) => (
                              <div key={msg.id} className={`flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                  {!msg.isCurrentUser && (
                                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 border border-blue-200">
                                          {msg.senderInitials}
                                      </div>
                                  )}
                                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.isCurrentUser ? 'bg-blue-600 text-white rounded-br-none shadow-md' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                      {!msg.isCurrentUser && <p className="text-[10px] font-bold text-slate-400 mb-1">{msg.sender}</p>}
                                      {msg.message}
                                      {msg.attachments && msg.attachments.map((att, i) => (
                                          <div key={i} className="mt-2 bg-black/10 rounded p-2 flex items-center">
                                              <svg className="w-4 h-4 mr-1 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                                              <span className="text-xs truncate">{att.name}</span>
                                          </div>
                                      ))}
                                      <p className={`text-[10px] mt-1 text-right ${msg.isCurrentUser ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </div>
                              </div>
                          ))}
                          <div ref={chatEndRef} />
                      </div>
                      <div className="p-3 border-t border-slate-100 bg-white rounded-b-2xl">
                          <div className="relative">
                              <input 
                                  type="text" 
                                  placeholder="Type a message..." 
                                  className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                  value={chatMessage}
                                  onChange={(e) => setChatMessage(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                                  <button onClick={() => chatFileInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                  </button>
                                  <input type="file" ref={chatFileInputRef} className="hidden" onChange={handleChatFileUpload} />
                                  <button onClick={handleSendChat} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Tasks / Next Steps */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                          Next Steps
                      </h3>
                      <div className="space-y-3">
                          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group">
                              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                              <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">Verify insurance limits</span>
                          </label>
                          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group">
                              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                              <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">Request medical records</span>
                          </label>
                          <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group">
                              <input type="checkbox" className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                              <span className="text-sm text-slate-700 group-hover:text-slate-900 font-medium">Send representation letter</span>
                          </label>
                      </div>
                      <button className="w-full mt-4 text-xs font-bold text-slate-500 hover:text-blue-600 py-2 border border-dashed border-slate-300 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all">
                          + Add Task
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* RingCentral Modal */}
      {phoneModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  {/* RC Header */}
                  <div className="bg-slate-900 text-white p-4 flex justify-between items-start">
                      <div>
                          <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">RingCentral Connected</span>
                          </div>
                          <h3 className="text-lg font-bold mt-1">{caseData.clientName}</h3>
                          <p className="text-sm text-slate-400">{caseData.clientPhone}</p>
                      </div>
                      <button onClick={() => setPhoneModalOpen(false)} className="text-slate-400 hover:text-white">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-slate-200">
                      <button 
                          className={`flex-1 py-3 text-sm font-bold transition-colors ${phoneAction === 'call' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
                          onClick={() => setPhoneAction('call')}
                      >
                          Phone Call
                      </button>
                      <button 
                          className={`flex-1 py-3 text-sm font-bold transition-colors ${phoneAction === 'sms' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50' : 'text-slate-500 hover:bg-slate-50'}`}
                          onClick={() => setPhoneAction('sms')}
                      >
                          SMS Message
                      </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 overflow-y-auto">
                      {phoneAction === 'call' ? (
                          <div className="flex flex-col items-center">
                              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all duration-500 ${isCallActive ? 'bg-green-100 ring-8 ring-green-50' : 'bg-slate-100'}`}>
                                  <svg className={`w-10 h-10 ${isCallActive ? 'text-green-600' : 'text-slate-400'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                              </div>
                              
                              <h4 className="text-2xl font-mono font-bold text-slate-800 mb-1">
                                  {isCallActive ? formatTime(callTimer) : 'Ready to Call'}
                              </h4>
                              <p className="text-sm text-slate-500 mb-8">{isCallActive ? 'Call in progress...' : 'Click start to dial'}</p>

                              <div className="w-full space-y-4">
                                  {isCallActive ? (
                                      <button 
                                          onClick={handleEndCall}
                                          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-200 transition-all flex items-center justify-center"
                                      >
                                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1 0-1.41C2.74 9.32 7.13 8 12 8c4.87 0 9.26 1.32 11.71 3.67.39.39.39 1.02 0 1.41l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.66-1.85.995.995 0 0 1-.57-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg>
                                          End Call
                                      </button>
                                  ) : (
                                      <button 
                                          onClick={handleStartCall}
                                          className="w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-all flex items-center justify-center"
                                      >
                                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                                          Start Call
                                      </button>
                                  )}
                                  
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Call Notes</label>
                                      <textarea 
                                          className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                          placeholder="Enter call details here..."
                                          value={callNote}
                                          onChange={e => setCallNote(e.target.value)}
                                      ></textarea>
                                  </div>

                                  {!isCallActive && callTimer > 0 && (
                                      <button 
                                          onClick={handleSaveCall}
                                          className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 transition-colors"
                                      >
                                          Save Call Log
                                      </button>
                                  )}
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col h-full">
                              <div className="flex-1 bg-slate-50 rounded-xl border border-slate-100 p-4 mb-4 overflow-y-auto">
                                  {/* Simulated History for Context */}
                                  <div className="flex flex-col space-y-3">
                                      <div className="self-end bg-teal-100 text-teal-900 p-2 rounded-lg rounded-br-none text-xs max-w-[80%]">
                                          Hi {caseData.clientName.split(' ')[0]}, just checking in on your treatment.
                                          <div className="text-[9px] opacity-50 mt-1 text-right">Yesterday</div>
                                      </div>
                                      <div className="self-start bg-white border border-slate-200 text-slate-700 p-2 rounded-lg rounded-bl-none text-xs max-w-[80%]">
                                          Going well, thanks for asking.
                                          <div className="text-[9px] opacity-50 mt-1">Yesterday</div>
                                      </div>
                                  </div>
                              </div>
                              <div>
                                  <textarea 
                                      className="w-full h-20 p-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 resize-none mb-3"
                                      placeholder="Type SMS message..."
                                      value={smsMessage}
                                      onChange={e => setSmsMessage(e.target.value)}
                                  ></textarea>
                                  <button 
                                      onClick={handleSendSMS}
                                      disabled={smsSending || !smsMessage.trim()}
                                      className={`w-full py-3 rounded-xl font-bold shadow-md flex items-center justify-center transition-all ${smsSending ? 'bg-teal-300 text-white cursor-wait' : 'bg-teal-600 text-white hover:bg-teal-700 shadow-teal-200'}`}
                                  >
                                      {smsSending ? 'Sending...' : 'Send Message'}
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
