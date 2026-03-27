
import React, { useState, useEffect, useCallback } from 'react';
import { FirmProvider } from './contexts/FirmContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useFirm } from './contexts/FirmContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CaseDetail } from './components/CaseDetail';
import { NewIntakePage } from './components/NewIntakePage';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { Inbox } from './components/Inbox';
import { Directory } from './components/Directory';
import { CaseFile, CaseStatus, Email, DocumentAttachment } from './types';
import { TasksView } from './components/TasksView';
import { Workspace } from './components/Workspace';
import { ActivityFeed } from './components/ActivityFeed';
import { classifyAttachmentType } from './services/geminiService';
import { applyWorkflowToCase } from './services/workflowEngine';
import { getCasesByFirm, upsertCase, generateCaseNumber, deleteCase } from './services/caseService';

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
  const { session, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedCase, setSelectedCase] = useState<CaseFile | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [casesLoading, setCasesLoading] = useState(true);

  // Lifted State for Persistence
  const [emails, setEmails] = useState<Email[]>(MOCK_EMAILS);

  const [cases, setCases] = useState<CaseFile[]>([]);

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
        type: 'system' as const,
        message: `Case reassigned from ${prevName} to ${newName}.`,
        timestamp: new Date().toISOString(),
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
      // 1. Optimistically update Email State to reflect it is linked immediately
      setEmails(prevEmails => prevEmails.map(e => 
          e.id === email.id ? { ...e, linkedCaseId: caseId } : e
      ));

      // 2. Process attachments with AI (Async)
      // We map the mock attachments to classified document types
      const classifiedDocs: DocumentAttachment[] = await Promise.all(email.attachments.map(async (att) => {
          const docType = await classifyAttachmentType(att.name, email.subject, email.body);
          return {
              type: docType, // AI determined type
              fileName: att.name,
              fileData: null, // placeholder since we don't have real files
              mimeType: att.type === 'pdf' ? 'application/pdf' : 'image/jpeg',
              source: `Email: ${email.subject}`,
              tags: ['Email Attachment']
          };
      }));

      // 3. Update Case with new documents and logs
      setCases(prevCases => {
        const updated = prevCases.map(c => {
          if (c.id === caseId) {
            const newLog = {
              id: Math.random().toString(36).substr(2, 9),
              type: 'system' as const,
              message: `Linked email "${email.subject}" from ${email.from}. Added ${classifiedDocs.length} attachment(s).`,
              timestamp: new Date().toISOString()
            };
            const currentEmails = c.linkedEmails || [];
            const alreadyLinked = currentEmails.some(e => e.id === email.id);
            const newLinkedEmails = alreadyLinked ? currentEmails : [email, ...currentEmails];
            const updatedCase = {
              ...c,
              documents: [...c.documents, ...classifiedDocs],
              activityLog: [newLog, ...c.activityLog],
              linkedEmails: newLinkedEmails
            };
            if (activeFirm) {
              upsertCase(updatedCase, activeFirm.id);
            }
            return updatedCase;
          }
          return c;
        });
        return updated;
      });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <Sidebar
        currentView={currentView}
        setCurrentView={(view) => {
            setCurrentView(view);
            setSelectedCase(null);
        }}
        caseCount={cases.filter(c => c.status === CaseStatus.NEW).length}
        taskCount={cases.reduce((sum, c) => sum + (c.tasks || []).filter(t => t.status !== 'completed').length, 0)}
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
              onSelectCase={(c) => {
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
              />
          )}

          {!casesLoading && currentView === 'new-intake' && !selectedCase && (
            <NewIntakePage
              onBack={() => setCurrentView('dashboard')}
              onSubmit={async (c) => {
                await handleNewCase(c);
                setCurrentView('dashboard');
              }}
            />
          )}

          {!casesLoading && selectedCase && (
            <CaseDetail
              caseData={selectedCase}
              onBack={() => setSelectedCase(null)}
              onUpdateCase={handleCaseUpdate}
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
