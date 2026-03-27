import { CaseFile, CaseTask, DocumentAttachment, DocumentCategory, TaskStatus, TaskType } from '../types';

interface DocumentAction {
  taskType: TaskType;
  category?: DocumentCategory;
  description: string;
}

const DOCUMENT_TASK_RULES: {
  patterns: RegExp[];
  docTypes?: string[];
  action: DocumentAction;
}[] = [
  {
    patterns: [/lor.*acknowledg/i, /letter.*representation.*acknowledg/i, /acknowledg.*receipt/i, /acknowledg.*lor/i, /receipt.*lor/i],
    action: {
      taskType: 'lor_defendant',
      category: 'lor_acknowledgment',
      description: 'LOR Acknowledgment received',
    },
  },
  {
    patterns: [/coverage.*determin/i, /coverage.*accept/i, /coverage.*confirm/i, /coverage.*response/i, /coverage.*letter/i],
    action: {
      taskType: 'coverage_followup',
      category: 'coverage_determination',
      description: 'Coverage determination received',
    },
  },
  {
    patterns: [/liability.*determin/i, /liability.*accept/i, /liability.*decision/i, /liability.*response/i],
    action: {
      taskType: 'liability_followup',
      category: 'liability_determination',
      description: 'Liability determination received',
    },
  },
  {
    patterns: [/policy.*limit/i, /dec.*page/i, /declarations.*page/i],
    action: {
      taskType: 'policy_limits',
      category: 'policy_limits',
      description: 'Policy limits information received',
    },
  },
  {
    patterns: [/crash.*report/i, /police.*report/i, /accident.*report/i],
    docTypes: ['crash_report'],
    action: {
      taskType: 'crash_report_received',
      category: 'investigation',
      description: 'Crash report received',
    },
  },
];

function matchesPatterns(fileName: string, suggestedName: string, patterns: RegExp[]): boolean {
  const combined = `${fileName} ${suggestedName}`.toLowerCase();
  return patterns.some(p => p.test(combined));
}

export interface DocumentAnalysisResult {
  completedTasks: { taskType: TaskType; description: string }[];
  suggestedCategory?: DocumentCategory;
  activityMessages: string[];
}

export function analyzeUploadedDocument(
  doc: DocumentAttachment,
  suggestedName: string,
  caseData: CaseFile
): DocumentAnalysisResult {
  const result: DocumentAnalysisResult = {
    completedTasks: [],
    activityMessages: [],
  };

  const tasks = caseData.tasks || [];

  for (const rule of DOCUMENT_TASK_RULES) {
    const nameMatches = matchesPatterns(doc.fileName, suggestedName, rule.patterns);
    const typeMatches = rule.docTypes ? rule.docTypes.includes(doc.type) : false;

    if (nameMatches || typeMatches) {
      const openTask = tasks.find(
        t => t.type === rule.action.taskType && t.status !== 'completed'
      );

      if (openTask) {
        result.completedTasks.push({
          taskType: rule.action.taskType,
          description: rule.action.description,
        });
        result.activityMessages.push(
          `Task auto-completed: "${openTask.title}" -- ${rule.action.description}`
        );
      }

      if (rule.action.category && !result.suggestedCategory) {
        result.suggestedCategory = rule.action.category;
      }
    }
  }

  return result;
}

export function applyDocumentActions(
  caseData: CaseFile,
  analysisResult: DocumentAnalysisResult
): CaseFile {
  let updated = { ...caseData };
  const nowISO = new Date().toISOString();

  if (analysisResult.completedTasks.length > 0) {
    const typesToComplete = new Set(analysisResult.completedTasks.map(t => t.taskType));

    updated.tasks = (updated.tasks || []).map(t => {
      if (typesToComplete.has(t.type) && t.status !== 'completed') {
        return { ...t, status: 'completed' as TaskStatus, completedDate: nowISO };
      }
      return t;
    });

    for (const taskType of typesToComplete) {
      if (taskType === 'lor_defendant' && !updated.lorDefendantSentDate) {
        updated.lorDefendantSentDate = nowISO.split('T')[0];
      }
      if (taskType === 'lor_client_ins' && !updated.lorClientInsSentDate) {
        updated.lorClientInsSentDate = nowISO.split('T')[0];
      }
      if (taskType === 'crash_report_received' && !updated.crashReportRequestedDate) {
        updated.crashReportRequestedDate = nowISO.split('T')[0];
      }
    }
  }

  return updated;
}
