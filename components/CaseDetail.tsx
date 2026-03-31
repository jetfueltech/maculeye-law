
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CaseFile, CaseStatus, Insurance, ActivityLog, ExtendedIntakeData, Email, CommunicationLog, ChatMessage, Assignee, TeamNote, CaseTeamMember, Adjuster, DocumentAttachment } from '../types';
import { analyzeIntakeCase } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { ExtendedIntakeForm } from './ExtendedIntakeForm';
import { MedicalTreatment } from './MedicalTreatment';
import { CoverageTracker } from './CoverageTracker';
import { CaseTasksPanel } from './CaseTasksPanel';
import { DocumentsPanel } from './DocumentsPanel';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { MemberPicker } from './MemberPicker';
import { CaseTeamPanel } from './CaseTeamPanel';
import { FinancialsTab } from './FinancialsTab';
import { AdjusterPanel } from './AdjusterPanel';
import { DocumentGenerator, DocumentFormType } from './DocumentGenerator';
import { uploadDocument } from '../services/documentStorageService';
import { generateDocumentNameWithExt } from '../services/documentNamingService';

const DOC_TYPE_ICONS: Record<string, { bg: string; text: string; icon: string; label: string }> = {
  retainer: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', label: 'Retainer' },
  crash_report: { bg: 'bg-red-50', text: 'text-red-600', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', label: 'Crash Report' },
  medical_record: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Medical' },
  authorization: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z', label: 'Authorization' },
  insurance_card: { bg: 'bg-cyan-50', text: 'text-cyan-600', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Insurance' },
  correspondence: { bg: 'bg-slate-100', text: 'text-slate-600', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Letter' },
  photo: { bg: 'bg-rose-50', text: 'text-rose-600', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'Photo' },
  email: { bg: 'bg-sky-50', text: 'text-sky-600', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', label: 'Email' },
  other: { bg: 'bg-slate-50', text: 'text-slate-500', icon: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z', label: 'File' },
};

function inferDocTypeFromName(filename: string): DocumentAttachment['type'] {
  const lower = filename.toLowerCase();
  if (lower.includes('retainer')) return 'retainer';
  if (lower.includes('crash') || lower.includes('police')) return 'crash_report';
  if (lower.includes('medical') || lower.includes('record')) return 'medical_record';
  if (lower.includes('auth') || lower.includes('hipaa')) return 'authorization';
  if (lower.includes('insurance')) return 'insurance_card';
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|heic)$/)) return 'photo';
  return 'other';
}

type CaseDetailTab = 'overview' | 'extended' | 'medical' | 'documents' | 'ai_analysis' | 'activity_log' | 'coverage' | 'tasks' | 'financials';

interface CaseDetailProps {
  caseData: CaseFile;
  onBack: () => void;
  onUpdateCase: (updatedCase: CaseFile) => void;
  defaultTab?: CaseDetailTab;
}

export const CaseDetail: React.FC<CaseDetailProps> = ({ caseData, onBack, onUpdateCase, defaultTab }) => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<CaseDetailTab>(defaultTab || 'overview');
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

  const [docDragOver, setDocDragOver] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [docPreviewIndex, setDocPreviewIndex] = useState<number | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<DocumentFormType | null>(null);
  const [showDocGenerator, setShowDocGenerator] = useState(false);
  const overviewFileInputRef = useRef<HTMLInputElement>(null);

  const handleOverviewDocDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDocDragOver(true);
  }, []);

  const handleOverviewDocDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDocDragOver(false);
  }, []);

  const handleOverviewDocUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    setDocUploading(true);
    const authorName = profile?.full_name || profile?.email || 'Unknown User';
    const existingCounts: Record<string, number> = {};
    (caseData.documents || []).forEach(d => {
      existingCounts[d.type] = (existingCounts[d.type] || 0) + 1;
    });

    const newDocs: DocumentAttachment[] = [];
    for (const file of fileArray) {
      const docType = inferDocTypeFromName(file.name);
      const result = await uploadDocument(caseData.id, file);
      if (!('error' in result)) {
        existingCounts[docType] = (existingCounts[docType] || 0) + 1;
        const properName = generateDocumentNameWithExt({
          clientName: caseData.clientName,
          dol: caseData.accidentDate || '',
          docType,
          version: existingCounts[docType],
          originalFileName: file.name,
        });
        newDocs.push({
          type: docType,
          fileData: null,
          fileName: properName,
          mimeType: file.type || 'application/octet-stream',
          source: 'Upload',
          storagePath: result.path,
          storageUrl: result.url,
          uploadedAt: new Date().toISOString(),
        });
      }
    }
    if (newDocs.length > 0) {
      const log = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'system' as const,
        message: `Uploaded ${newDocs.length} document(s): ${newDocs.map(d => d.fileName).join(', ')}`,
        timestamp: new Date().toISOString(),
        author: authorName,
      };
      onUpdateCase({
        ...caseData,
        documents: [...(caseData.documents || []), ...newDocs],
        activityLog: [log, ...(caseData.activityLog || [])],
      });
    }
    setDocUploading(false);
  }, [caseData, profile, onUpdateCase]);

  const handleOverviewDocDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDocDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleOverviewDocUpload(e.dataTransfer.files);
    }
  }, [handleOverviewDocUpload]);

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
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  
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

  useEffect(() => {
    if (!chatMenuId) return;
    const handler = () => setChatMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [chatMenuId]);

  const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentUserName = profile?.full_name || profile?.email || 'Unknown User';

  const addActivity = (updatedCase: CaseFile, message: string, type: 'system' | 'user' | 'note' = 'system') => {
      const newLog: ActivityLog = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          message,
          timestamp: new Date().toISOString(),
          author: type === 'system' ? 'System' : currentUserName
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
          sender: currentUserName,
          senderInitials: profile?.avatar_initials || currentUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
          isCurrentUser: true,
          message: chatMessage,
          timestamp: new Date().toISOString()
      };
      
      const updatedChat = [...(caseData.chatHistory || []), newMsg];
      onUpdateCase({ ...caseData, chatHistory: updatedChat });
      setChatMessage('');
      if (chatTextareaRef.current) chatTextareaRef.current.style.height = 'auto';
  };

  const handleDeleteChat = (msgId: string) => {
      const updatedChat = (caseData.chatHistory || []).filter(m => m.id !== msgId);
      onUpdateCase({ ...caseData, chatHistory: updatedChat });
      setChatMenuId(null);
  };

  const handleStartEditChat = (msg: ChatMessage) => {
      setEditingMsgId(msg.id);
      setEditingText(msg.message);
      setChatMenuId(null);
  };

  const handleSaveEditChat = (msgId: string) => {
      if (!editingText.trim()) return;
      const updatedChat = (caseData.chatHistory || []).map(m =>
        m.id === msgId ? { ...m, message: editingText, edited: true } : m
      );
      onUpdateCase({ ...caseData, chatHistory: updatedChat });
      setEditingMsgId(null);
      setEditingText('');
  };

  const handleCancelEditChat = () => {
      setEditingMsgId(null);
      setEditingText('');
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const isImage = file.type.startsWith('image/');
          const newMsg: ChatMessage = {
              id: Date.now().toString(),
              sender: currentUserName,
              senderInitials: profile?.avatar_initials || currentUserName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
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
                        <button
                          onClick={() => setIsFormModalOpen(true)}
                          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Generate Forms
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

                  {/* Documents Preview */}
                  <div
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                    onDragOver={handleOverviewDocDragOver}
                    onDragLeave={handleOverviewDocDragLeave}
                    onDrop={handleOverviewDocDrop}
                  >
                      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                          <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                              </div>
                              <div>
                                <h3 className="text-sm font-bold text-slate-800">Documents</h3>
                                <p className="text-[11px] text-slate-400">{(caseData.documents || []).length} {(caseData.documents || []).length === 1 ? 'file' : 'files'}</p>
                              </div>
                          </div>
                          <div className="flex items-center gap-2">
                              <input
                                type="file"
                                ref={overviewFileInputRef}
                                className="hidden"
                                multiple
                                onChange={(e) => {
                                  if (e.target.files && e.target.files.length > 0) handleOverviewDocUpload(e.target.files);
                                  if (overviewFileInputRef.current) overviewFileInputRef.current.value = '';
                                }}
                              />
                              <button
                                onClick={() => overviewFileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Upload
                              </button>
                              <button onClick={() => setActiveTab('documents')} className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-100 font-medium transition-colors rounded-lg">
                                  View All
                              </button>
                          </div>
                      </div>

                      <div className="p-5">
                        {docUploading && (
                          <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-medium text-blue-700">Uploading documents...</span>
                          </div>
                        )}

                        {(caseData.documents || []).length > 0 ? (
                          <>
                            <div className="grid grid-cols-4 gap-2.5">
                              {[...(caseData.documents || [])].reverse().slice(0, 8).map((doc, idx) => {
                                const style = DOC_TYPE_ICONS[doc.type] || DOC_TYPE_ICONS.other;
                                const isImage = doc.mimeType?.startsWith('image/');
                                const realIndex = (caseData.documents || []).length - 1 - idx;
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => setDocPreviewIndex(realIndex)}
                                    className="group relative overflow-hidden rounded-xl cursor-pointer hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-200 hover:-translate-y-0.5"
                                  >
                                    <div className={`h-[88px] flex items-center justify-center ${isImage && doc.storageUrl ? 'bg-slate-100' : style.bg} relative overflow-hidden`}>
                                      {isImage && doc.storageUrl ? (
                                        <img src={doc.storageUrl} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className={`${style.text} transition-transform duration-200 group-hover:scale-110`}>
                                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={style.icon} /></svg>
                                        </div>
                                      )}
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                    </div>
                                    <div className="bg-white border border-slate-200 border-t-0 rounded-b-xl px-2.5 py-2">
                                      <p className="text-[11px] font-medium text-slate-700 truncate">{doc.fileName}</p>
                                      <div className="flex items-center justify-between mt-0.5">
                                        <span className={`text-[10px] font-medium ${style.text}`}>{style.label}</span>
                                        {doc.uploadedAt && (
                                          <span className="text-[10px] text-slate-400">{new Date(doc.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {(caseData.documents || []).length > 8 && (
                              <button onClick={() => setActiveTab('documents')} className="w-full mt-3 text-xs font-medium text-blue-600 hover:text-blue-700 py-1.5 text-center transition-colors">
                                View all {(caseData.documents || []).length} documents
                              </button>
                            )}

                            <div
                              className={`mt-3 border-2 border-dashed rounded-xl py-4 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                                docDragOver
                                  ? 'border-blue-400 bg-blue-50'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                              onClick={() => overviewFileInputRef.current?.click()}
                            >
                              <svg className={`w-4 h-4 transition-colors ${docDragOver ? 'text-blue-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                              <p className={`text-xs font-medium transition-colors ${docDragOver ? 'text-blue-600' : 'text-slate-400'}`}>
                                {docDragOver ? 'Drop files here' : 'Drag & drop files to upload'}
                              </p>
                            </div>
                          </>
                        ) : (
                          <div
                            className={`border-2 border-dashed rounded-xl py-10 flex flex-col items-center justify-center transition-all duration-200 cursor-pointer ${
                              docDragOver
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                            onClick={() => overviewFileInputRef.current?.click()}
                          >
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-3 transition-colors ${docDragOver ? 'bg-blue-100 text-blue-500' : 'bg-slate-100 text-slate-300'}`}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </div>
                            <p className={`text-sm font-medium mb-1 transition-colors ${docDragOver ? 'text-blue-600' : 'text-slate-500'}`}>
                              {docDragOver ? 'Drop files here' : 'Drop files to upload'}
                            </p>
                            <p className="text-xs text-slate-400">or click to browse</p>
                          </div>
                        )}
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
                              <div key={msg.id} className={`group flex ${msg.isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                  {!msg.isCurrentUser && (
                                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 border border-blue-200">
                                          {msg.senderInitials}
                                      </div>
                                  )}
                                  <div className="relative">
                                      {msg.isCurrentUser && (
                                          <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                onClick={() => setChatMenuId(chatMenuId === msg.id ? null : msg.id)}
                                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
                                              >
                                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                                              </button>
                                              {chatMenuId === msg.id && (
                                                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 w-28">
                                                      <button
                                                        onClick={() => handleStartEditChat(msg)}
                                                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                      >
                                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                          Edit
                                                      </button>
                                                      <button
                                                        onClick={() => handleDeleteChat(msg.id)}
                                                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                      >
                                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                          Delete
                                                      </button>
                                                  </div>
                                              )}
                                          </div>
                                      )}
                                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.isCurrentUser ? 'bg-blue-600 text-white rounded-br-none shadow-md' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'}`}>
                                          {!msg.isCurrentUser && <p className="text-[10px] font-bold text-slate-400 mb-1">{msg.sender}</p>}
                                          {editingMsgId === msg.id ? (
                                              <div className="space-y-2">
                                                  <textarea
                                                    value={editingText}
                                                    onChange={(e) => setEditingText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEditChat(msg.id); }
                                                      if (e.key === 'Escape') handleCancelEditChat();
                                                    }}
                                                    className="w-full bg-white/20 rounded-lg p-2 text-sm text-white placeholder-white/50 outline-none resize-none border border-white/30"
                                                    rows={2}
                                                    autoFocus
                                                  />
                                                  <div className="flex justify-end gap-1.5">
                                                      <button onClick={handleCancelEditChat} className="px-2 py-0.5 text-[10px] font-medium bg-white/20 hover:bg-white/30 rounded transition-colors">Cancel</button>
                                                      <button onClick={() => handleSaveEditChat(msg.id)} className="px-2 py-0.5 text-[10px] font-medium bg-white/30 hover:bg-white/40 rounded transition-colors">Save</button>
                                                  </div>
                                              </div>
                                          ) : (
                                              <>{msg.message}</>
                                          )}
                                          {msg.attachments && msg.attachments.map((att, i) => (
                                              <div key={i} className="mt-2 bg-black/10 rounded p-2 flex items-center">
                                                  <svg className="w-4 h-4 mr-1 opacity-70" fill="currentColor" viewBox="0 0 24 24"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
                                                  <span className="text-xs truncate">{att.name}</span>
                                              </div>
                                          ))}
                                          <p className={`text-[10px] mt-1 text-right ${msg.isCurrentUser ? 'text-blue-100' : 'text-slate-400'}`}>
                                              {msg.edited && <span className="mr-1 italic">(edited)</span>}
                                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          <div ref={chatEndRef} />
                      </div>
                      <div className="p-3 border-t border-slate-100 bg-white rounded-b-2xl">
                          <div className="relative flex items-end gap-2">
                              <textarea
                                  ref={chatTextareaRef}
                                  placeholder="Type a message..."
                                  className="flex-1 pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none overflow-hidden"
                                  rows={1}
                                  value={chatMessage}
                                  onChange={(e) => {
                                    setChatMessage(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendChat();
                                    }
                                  }}
                              />
                              <div className="flex items-center gap-1 flex-shrink-0 pb-1.5">
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

                  {/* Team Notes */}
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                          <h3 className="font-bold text-slate-800 text-sm flex items-center">
                              <svg className="w-4 h-4 mr-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Team Notes
                          </h3>
                          <span className="text-[10px] font-medium text-slate-400">{(caseData.teamNotes || []).length} {(caseData.teamNotes || []).length === 1 ? 'note' : 'notes'}</span>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                          {(caseData.teamNotes || []).length > 0 ? (
                              <div className="divide-y divide-slate-100">
                                  {(caseData.teamNotes || []).map((note) => (
                                      <div key={note.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                                          <div className="flex items-start gap-2.5">
                                              <div className="w-7 h-7 rounded-full bg-slate-700 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                                                  {note.authorInitials}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 mb-0.5">
                                                      <span className="text-xs font-semibold text-slate-800">{note.authorName}</span>
                                                      <span className="text-[10px] text-slate-400">
                                                          {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                      </span>
                                                  </div>
                                                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                                  <div ref={notesEndRef} />
                              </div>
                          ) : (
                              <div className="px-5 py-8 text-center text-slate-400 text-xs">
                                  No notes yet. Add a note below.
                              </div>
                          )}
                      </div>
                      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                          <div className="flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-1">
                                  {profile?.avatar_initials || '??'}
                              </div>
                              <div className="flex-1">
                                  <textarea
                                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none placeholder-slate-400 transition-shadow"
                                      rows={2}
                                      placeholder="Add a note..."
                                      value={newNote}
                                      onChange={e => setNewNote(e.target.value)}
                                      onKeyDown={e => {
                                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
                                      }}
                                  />
                                  <div className="flex items-center justify-between mt-1.5">
                                      <span className="text-[10px] text-slate-400">Cmd+Enter to submit</span>
                                      <button
                                          onClick={handleAddNote}
                                          disabled={!newNote.trim()}
                                          className="px-3 py-1 bg-slate-800 text-white text-[10px] font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                          Add Note
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
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
      {docPreviewIndex !== null && (
        <DocumentPreviewModal
          documents={caseData.documents}
          currentIndex={docPreviewIndex}
          onClose={() => setDocPreviewIndex(null)}
          onNavigate={setDocPreviewIndex}
        />
      )}

      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Generate Legal Documents</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">Select the document you wish to generate based on the current case data.</p>
              <div className="space-y-3 mb-6">
                {([
                  { key: 'rep_lien' as DocumentFormType, title: 'Letter of Representation + Lien', desc: 'Includes notification to insurance carrier and attorney lien notice.' },
                  { key: 'foia' as DocumentFormType, title: 'Chicago FOIA Package', desc: 'Request letter, CPD form, and crash report attachment placeholder.' },
                  { key: 'intake_summary' as DocumentFormType, title: 'Client Intake Summary', desc: 'Detailed form including Accident, Client, Medical, and Insurance info.' },
                  { key: 'boss_intake_form' as DocumentFormType, title: 'Boss Intake Form', desc: 'Auto-populated intake spreadsheet with all case data, providers, and insurance.' },
                ]).map(opt => (
                  <label key={opt.key} className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedForm === opt.key ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input
                      type="radio"
                      name="formType"
                      checked={selectedForm === opt.key}
                      onChange={() => setSelectedForm(opt.key)}
                      className="w-5 h-5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">{opt.title}</span>
                      <span className="text-xs text-slate-500">{opt.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg mr-2">Cancel</button>
                <button
                  onClick={() => { if (selectedForm) { setShowDocGenerator(true); setIsFormModalOpen(false); } }}
                  disabled={!selectedForm}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-all flex items-center disabled:opacity-50"
                >
                  Preview & Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DocumentGenerator
        isOpen={showDocGenerator}
        onClose={() => setShowDocGenerator(false)}
        caseData={caseData}
        formType={selectedForm}
        onSaveToDocuments={(docName: string, docFormType: DocumentFormType) => {
          const newDoc: DocumentAttachment = {
            type: 'other',
            fileData: null,
            fileName: `${docName} — ${caseData.clientName} — ${new Date().toISOString().split('T')[0]}.pdf`,
            mimeType: 'application/pdf',
            source: 'Generated',
            category: 'intake',
            generatedFormType: docFormType,
            uploadedAt: new Date().toISOString(),
          };
          onUpdateCase({ ...caseData, documents: [...caseData.documents, newDoc] });
        }}
      />
    </div>
  );
};
