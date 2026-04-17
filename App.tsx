
import React, { useState, useEffect, useCallback } from 'react';
import { FirmProvider } from './contexts/FirmContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useFirm } from './contexts/FirmContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CaseDetail } from './components/CaseDetail';
import { NewIntakePage } from './components/NewIntakePage';
import type { IntakePrefill } from './components/inbox/ThreadDetail';
import { useOutlookSync } from './hooks/useOutlookSync';
import { useRingCentralSync } from './hooks/useRingCentralSync';
import { placeRingOut } from './services/ringcentralService';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { Inbox } from './components/Inbox';
import { Directory } from './components/Directory';
import { CaseFile, CaseStatus, Email, DocumentAttachment, CommunicationLog } from './types';
import { TasksView } from './components/TasksView';
import { Workspace } from './components/Workspace';
import { ActivityFeed } from './components/ActivityFeed';
import { FormsPanel } from './components/FormsPanel';
import { FloatingCallBar, ActiveCallInfo } from './components/FloatingCallBar';
import { classifyAttachmentType } from './services/geminiService';
import { applyWorkflowToCase } from './services/workflowEngine';
import { getCasesByFirm, upsertCase, generateCaseNumber, deleteCase } from './services/caseService';
import { updateSyncedEmail, copyAttachmentToCaseDocuments } from './services/outlookService';

// Initial Mock Emails moved from Inbox to App for persistence
const MOCK_EMAILS: Email[] = [
  {
    id: 'e101',
    from: 'State Farm Claims',
    fromEmail: 'claims@statefarm.com',
    subject: 'Claim SF-889922 - Liability Status - Michael Chen',
    body: 'We have completed our review of the intersection footage. Our insured driver, Susan Miller, has accepted 100% liability for the accident on 11/05/2026.',
    date: '10:45 AM',
    isRead: false,
    direction: 'inbound',
    threadId: 'th-sf-101',
    attachments: [
        { name: 'Liability_Decision_Ltr.pdf', type: 'pdf', size: '145 KB' }
    ],
    category: 'liability_decision'
  },
  {
    id: 'e202',
    from: 'Law Offices of Peter Smith',
    fromEmail: 'psmith@defenselaw.com',
    subject: 'Johnson v. Davis - Answer to Complaint',
    body: 'Please see the attached Answer and Affirmative Defenses filed on behalf of Defendant Robert Davis today.',
    date: 'Yesterday',
    isRead: true,
    direction: 'inbound',
    threadId: 'th-legal-202',
    attachments: [{ name: 'Def_Answer.pdf', type: 'pdf', size: '1.2 MB' }],
    category: 'attorney_correspondence'
  },
  {
    id: 'e103',
    from: 'Michael Chen',
    fromEmail: 'm.chen@email.com',
    subject: 'Dashcam Video',
    body: 'I was able to download the dashcam footage from my car. It clearly shows the green light. The file was too big to email so here is a link, but I also attached a screenshot.',
    date: 'Nov 06',
    isRead: true,
    direction: 'inbound',
    threadId: 'th-dashcam-103',
    attachments: [
        { name: 'Dashcam_Frame_01.jpg', type: 'image', size: '3.2 MB' }
    ],
    category: 'client_communication'
  },
  {
    id: 'e204',
    from: 'Unknown Sender',
    fromEmail: 'injured_driver@gmail.com',
    subject: 'Car accident question',
    body: 'Hi, I was rear ended yesterday at a red light. The other driver has insurance but they are being difficult. Do you give free consultations?',
    date: 'Nov 12',
    isRead: true,
    direction: 'inbound',
    threadId: 'th-inquiry-204',
    attachments: [{ name: 'car_damage.jpg', type: 'image', size: '2.1 MB' }],
    category: 'general'
  }
];


function AppContent() {
  const { activeFirm } = useFirm();
  const { session, profile, loading: authLoading } = useAuth();
  const currentUserName = profile?.full_name || profile?.email || 'Unknown User';
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState<CaseFile | null>(null);
  const [caseDefaultTab, setCaseDefaultTab] = useState<string | undefined>(undefined);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [casesLoading, setCasesLoading] = useState(true);
  const [intakePrefill, setIntakePrefill] = useState<IntakePrefill | null>(null);

  const handleCreateCaseFromEmail = useCallback((prefill: IntakePrefill) => {
    setIntakePrefill(prefill);
    setSelectedCase(null);
    setCurrentView('new-intake');
  }, []);

  // Lifted State for Persistence
  const [emails, setEmails] = useState<Email[]>(MOCK_EMAILS);

  const [cases, setCases] = useState<CaseFile[]>([]);
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);

  // App-level Outlook sync — runs on mount and every 5 minutes regardless of view.
  const outlookSync = useOutlookSync(activeFirm?.id, setEmails);

  // App-level RingCentral sync — keeps call logs and SMS fresh regardless of view.
  const rcSync = useRingCentralSync(activeFirm?.id, profile?.id);

  const activeFirmIdRef = React.useRef<string | null>(null);
  const loadedFirmIdRef = React.useRef<string | null>(null);

  const loadCasesForFirm = useCallback(async (firmId: string) => {
    setCasesLoading(true);
    setSelectedCase(null);
    const dbCases = await getCasesByFirm(firmId);
    if (activeFirmIdRef.current !== firmId) return;
    const processed = dbCases.map(c => {
      let updated = c;
      if (!updated.statuteOfLimitationsDate && updated.accidentDate) {
        const solDate = new Date(updated.accidentDate);
        solDate.setFullYear(solDate.getFullYear() + 2);
        updated = { ...updated, statuteOfLimitationsDate: solDate.toISOString().split('T')[0] };
      }
      return applyWorkflowToCase(updated);
    });
    setCases(processed);
    loadedFirmIdRef.current = firmId;
    setCasesLoading(false);
  }, []);

  useEffect(() => {
    const firmId = activeFirm?.id || null;
    activeFirmIdRef.current = firmId;
    if (firmId && firmId !== loadedFirmIdRef.current) {
      loadCasesForFirm(firmId);
    } else if (!firmId) {
      setCases([]);
      setSelectedCase(null);
      setCasesLoading(false);
    }
  }, [activeFirm?.id, loadCasesForFirm]);

  const handleCaseUpdate = async (updatedCase: CaseFile) => {
    const previousCase = cases.find(c => c.id === updatedCase.id);
    let caseToSave = { ...updatedCase };

    if (previousCase && previousCase.assignedTo?.id !== caseToSave.assignedTo?.id) {
      const prevName = previousCase.assignedTo?.name || 'Unassigned';
      const newName = caseToSave.assignedTo?.name || 'Unassigned';
      const log = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'user' as const,
        message: `Case reassigned from ${prevName} to ${newName}.`,
        timestamp: new Date().toISOString(),
        author: currentUserName,
      };
      caseToSave.activityLog = [log, ...(caseToSave.activityLog || [])];
    }

    const withWorkflow = applyWorkflowToCase(caseToSave);
    setCases(prev => prev.map(c => c.id === withWorkflow.id ? withWorkflow : c));
    setSelectedCase(prev => prev?.id === withWorkflow.id ? withWorkflow : prev);
    if (activeFirm) {
      await upsertCase(withWorkflow, activeFirm.id);
    }
  };

  const handleNewCase = async (newCase: CaseFile) => {
    let caseWithNumber = { ...newCase };
    if (activeFirm) {
      const caseNumber = await generateCaseNumber(activeFirm.id);
      if (caseNumber) {
        caseWithNumber.caseNumber = caseNumber;
      }
      const withWorkflow = applyWorkflowToCase(caseWithNumber);
      const { error } = await upsertCase(withWorkflow, activeFirm.id);
      if (error) {
        console.error('Failed to save case:', error);
        alert(`Failed to save case: ${error}`);
        return;
      }
      setCases(prev => [withWorkflow, ...prev]);
    } else {
      const withWorkflow = applyWorkflowToCase(caseWithNumber);
      setCases(prev => [withWorkflow, ...prev]);
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    const { error } = await deleteCase(caseId);
    if (!error) {
      setCases(prev => prev.filter(c => c.id !== caseId));
      if (selectedCase?.id === caseId) {
        setSelectedCase(null);
      }
    }
  };

  const handleLinkEmail = async (caseId: string, email: Email) => {
    setEmails(prevEmails => prevEmails.map(e => {
      if (e.id === email.id) return { ...e, linkedCaseId: caseId };
      if (e.threadId && e.threadId === email.threadId) return { ...e, linkedCaseId: caseId };
      return e;
    }));

    if (!email.id.startsWith('e')) {
      try {
        await updateSyncedEmail(email.id, { linked_case_id: caseId });
      } catch (err) {
        console.error('Failed to persist email link:', err);
      }
    }

    const linkLog = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'user' as const,
      message: `Linked email "${email.subject}" from ${email.from}.`,
      timestamp: new Date().toISOString(),
      author: currentUserName,
    };

    setCases(prevCases => prevCases.map(c => {
      if (c.id !== caseId) return c;
      const currentEmails = c.linkedEmails || [];
      const alreadyLinked = currentEmails.some(e => e.id === email.id);
      const updatedCase = {
        ...c,
        activityLog: [linkLog, ...c.activityLog],
        linkedEmails: alreadyLinked ? currentEmails : [email, ...currentEmails],
      };
      if (activeFirm) {
        upsertCase(updatedCase, activeFirm.id);
      }
      return updatedCase;
    }));

    try {
      const classifiedDocs: DocumentAttachment[] = await Promise.all(
        email.attachments.map(async (att) => {
          const docType = await classifyAttachmentType(att.name, email.subject, email.body);
          return {
            type: docType,
            fileName: att.name,
            fileData: null,
            mimeType: att.type === 'pdf' ? 'application/pdf' : 'image/jpeg',
            source: `Email: ${email.subject}`,
            tags: ['Email Attachment'],
          };
        })
      );

      if (classifiedDocs.length > 0) {
        setCases(prevCases => prevCases.map(c => {
          if (c.id !== caseId) return c;
          const docLog = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'user' as const,
            message: `Classified ${classifiedDocs.length} attachment(s) from "${email.subject}".`,
            timestamp: new Date().toISOString(),
            author: currentUserName,
          };
          const updatedCase = {
            ...c,
            documents: [...c.documents, ...classifiedDocs],
            activityLog: [docLog, ...c.activityLog],
          };
          if (activeFirm) {
            upsertCase(updatedCase, activeFirm.id);
          }
          return updatedCase;
        }));
      }
    } catch (err) {
      console.error('Failed to classify attachments:', err);
    }
  };

  const handleProcessAttachment = async (caseId: string, email: Email, attachmentIndex: number) => {
    const att = email.attachments[attachmentIndex];
    if (!att) return;

    const docType = await classifyAttachmentType(att.name, email.subject, email.body);
    const contentType = att.contentType || (att.type === 'pdf' ? 'application/pdf' : att.type === 'image' ? 'image/jpeg' : 'application/octet-stream');

    let storagePath: string | undefined;
    let storageUrl: string | undefined;

    if (att.storagePath) {
      const result = await copyAttachmentToCaseDocuments(
        att.storagePath,
        caseId,
        att.name,
        contentType
      );
      if ('url' in result) {
        storagePath = result.path;
        storageUrl = result.url;
      }
    }

    const newDoc: DocumentAttachment = {
      type: docType,
      fileName: att.name,
      fileData: null,
      mimeType: contentType,
      source: `Email: ${email.subject}`,
      tags: ['Email Attachment'],
      uploadedAt: new Date().toISOString(),
      ...(storagePath ? { storagePath } : {}),
      ...(storageUrl ? { storageUrl } : {}),
    };

    setCases(prevCases => prevCases.map(c => {
      if (c.id === caseId) {
        const alreadyExists = c.documents.some(d => d.fileName === att.name && d.source === `Email: ${email.subject}`);
        if (alreadyExists) return c;

        const log = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'user' as const,
          message: `Ingested attachment "${att.name}" from email "${email.subject}" into case documents.`,
          timestamp: new Date().toISOString(),
          author: currentUserName,
        };
        const updatedCase = {
          ...c,
          documents: [...c.documents, newDoc],
          activityLog: [log, ...c.activityLog],
        };
        if (activeFirm) {
          upsertCase(updatedCase, activeFirm.id);
        }
        return updatedCase;
      }
      return c;
    }));
  };

  const handleStartCall = async (contactName: string, contactPhone: string, caseId: string, caseName: string) => {
    setActiveCall({ contactName, contactPhone, caseId, caseName });
    // When RingCentral is connected, also place a real RingOut. RC dials the
    // user's configured callback phone first, then bridges to the contact.
    if (rcSync.connection && activeFirm?.id && profile?.id && contactPhone) {
      const result = await placeRingOut(activeFirm.id, profile.id, contactPhone);
      if (result.error) {
        alert(`RingCentral could not place the call:\n\n${result.error}`);
      }
    } else if (!rcSync.connection) {
      // Optional: surface that call is simulated until RC is connected.
      console.info('Call is being simulated — connect RingCentral in Settings for real calls.');
    }
  };

  const handleCallEnd = (log: Omit<CommunicationLog, 'id'>) => {
    if (!activeCall) return;
    const fullLog: CommunicationLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
    };
    setCases(prev => prev.map(c => {
      if (c.id === activeCall.caseId) {
        const newLog = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'user' as const,
          message: `Outbound call to ${activeCall.contactName} (${fullLog.duration || '0:00'})`,
          timestamp: new Date().toISOString(),
          author: currentUserName,
        };
        const updatedCase = {
          ...c,
          communications: [fullLog, ...(c.communications || [])],
          activityLog: [newLog, ...c.activityLog],
        };
        if (activeFirm) {
          upsertCase(updatedCase, activeFirm.id);
        }
        setSelectedCase(prev => prev?.id === updatedCase.id ? updatedCase : prev);
        return updatedCase;
      }
      return c;
    }));
    setActiveCall(null);
  };

  const handleCallDismiss = () => {
    setActiveCall(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen bg-stone-100 font-sans">
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
            setCurrentView(view);
            setSelectedCase(null);
        }}
        caseCount={cases.filter(c => c.status === CaseStatus.NEW).length}
        taskCount={cases.reduce((sum, c) => sum + (c.tasks || []).filter(t => t.status !== 'completed').length, 0)}
        unreadEmailCount={emails.filter(e => !e.isRead).length}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <main
        className="flex-1 p-4 transition-all duration-300 overflow-x-hidden"
        style={{ marginLeft: isSidebarCollapsed ? '5rem' : '16rem', width: isSidebarCollapsed ? 'calc(100% - 5rem)' : 'calc(100% - 16rem)' }}
      >
        <div className="w-full">
          {casesLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}
          {!casesLoading && currentView === 'dashboard' && !selectedCase && (
            <Dashboard
              cases={cases}
              onSelectCase={(c, defaultTab) => {
                setCaseDefaultTab(defaultTab);
                setSelectedCase(c);
              }}
              onOpenNewIntake={() => setCurrentView('new-intake')}
              onUpdateCase={handleCaseUpdate}
              onDeleteCase={handleDeleteCase}
            />
          )}

          {!casesLoading && currentView === 'inbox' && !selectedCase && (
              <Inbox
                cases={cases}
                emails={emails}
                setEmails={setEmails}
                onLinkCase={handleLinkEmail}
                onProcessAttachment={handleProcessAttachment}
                onCreateCaseFromEmail={handleCreateCaseFromEmail}
                firmId={activeFirm?.id}
                outlookConnected={outlookSync.outlookConnected}
                isSyncingOutlook={outlookSync.isSyncing}
                syncMessage={outlookSync.syncMessage}
                connectedEmail={outlookSync.connectedEmail}
                runSync={outlookSync.runSync}
              />
          )}

          {!casesLoading && currentView === 'new-intake' && !selectedCase && (
            <NewIntakePage
              onBack={() => {
                setIntakePrefill(null);
                setCurrentView('dashboard');
              }}
              onSubmit={async (c) => {
                await handleNewCase(c);
                setIntakePrefill(null);
                setCurrentView('dashboard');
              }}
              initialClientNames={intakePrefill?.clientNames}
              initialPendingDocs={intakePrefill?.pendingDocs}
            />
          )}

          {!casesLoading && selectedCase && (
            <CaseDetail
              caseData={selectedCase}
              onBack={() => { setSelectedCase(null); setCaseDefaultTab(undefined); }}
              onUpdateCase={handleCaseUpdate}
              defaultTab={caseDefaultTab as any}
              onStartCall={(contactName, contactPhone) => handleStartCall(contactName, contactPhone, selectedCase.id, selectedCase.clientName)}
              isCallActive={!!activeCall}
            />
          )}

          {!casesLoading && currentView === 'analytics' && !selectedCase && (
            <Analytics cases={cases} />
          )}

          {!casesLoading && currentView === 'activity' && !selectedCase && (
            <ActivityFeed
              cases={cases}
              onSelectCase={(c) => {
                setSelectedCase(c);
                setCurrentView('dashboard');
              }}
            />
          )}

           {currentView === 'directory' && !selectedCase && (
            <Directory />
          )}

          {!casesLoading && currentView === 'workspace' && !selectedCase && (
            <Workspace
              cases={cases}
              onSelectCase={(c) => {
                setSelectedCase(c);
              }}
              onUpdateCase={handleCaseUpdate}
            />
          )}

           {!casesLoading && currentView === 'forms' && !selectedCase && (
            <FormsPanel
              cases={cases}
              onUpdateCase={handleCaseUpdate}
            />
          )}

           {!casesLoading && currentView === 'tasks' && !selectedCase && (
            <TasksView
              cases={cases}
              onSelectCase={(c) => {
                setSelectedCase(c);
                setCurrentView('dashboard');
              }}
              onUpdateCase={handleCaseUpdate}
            />
          )}

           {currentView === 'settings' && !selectedCase && (
            <Settings />
          )}
        </div>
      </main>

      {activeCall && (
        <FloatingCallBar
          activeCall={activeCall}
          onEndCall={handleCallEnd}
          onDismiss={handleCallDismiss}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <FirmProvider>
        <AppContent />
      </FirmProvider>
    </AuthProvider>
  );
}
