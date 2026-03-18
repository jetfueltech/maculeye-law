
import { GoogleGenAI, Type } from "@google/genai";
import { CaseFile, AIAnalysis, Email, EmailMatchAnalysis, DocumentType } from '../types';

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (ai) return ai;
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  ai = new GoogleGenAI({ apiKey });
  return ai;
}

export const analyzeIntakeCase = async (caseFile: CaseFile): Promise<AIAnalysis> => {
  // Construct a rich prompt with all available data
  const partiesText = caseFile.parties?.map(p => `${p.role}: ${p.name}`).join(', ') || 'None listed';
  
  const insuranceText = caseFile.insurance?.map(i => {
      if (i.isUninsured) return `${i.type}: UNINSURED`;
      return `${i.type}: ${i.provider} (Limits: ${i.coverageLimits || 'Unknown'}, Claim: ${i.claimNumber || 'N/A'})`;
  }).join(', ') || 'None listed';

  const vehicleText = caseFile.vehicleInfo ? `${caseFile.vehicleInfo.year} ${caseFile.vehicleInfo.make} ${caseFile.vehicleInfo.model}` : 'N/A';

  const promptText = `
    You are a senior personal injury case manager. Your job is to strictly analyze the provided intake materials and determine the quality of the case.
    
    Case Details:
    Client: ${caseFile.clientName} (DOB: ${caseFile.clientDob || 'N/A'})
    Date of Accident: ${caseFile.accidentDate}
    Location: ${caseFile.location || 'Unknown'}
    
    Facts of Loss: 
    ${caseFile.description}
    
    Vehicle: ${vehicleText}
    Parties Involved: ${partiesText}
    Insurance Info: ${insuranceText}
    Treatment Status: ${caseFile.treatmentStatus || 'Unknown'}
    Providers: ${caseFile.treatmentProviders || 'None listed'}

    Task:
    1. Analyze the attached images/PDFs (Retainer, Crash Report, Insurance Cards, Photos) and the text details provided.
    2. Verify if the Retainer appears to be a signed legal document.
    3. Analyze liability based on the facts and crash report. Who is at fault?
    4. Evaluate insurance coverage. Note low policy limits or uninsured drivers as major risk factors.
    5. Provide a Case Score from 1-10 (10 being clear liability, high coverage limits/commercial policy, significant damages, signed retainer).
    6. List key risk factors (e.g., unclear liability, no insurance found, uninsured defendant, gap in treatment, minor property damage).
    
    Return the response in JSON format.
  `;

  // Prepare parts (Text + Images/PDFs)
  const parts: any[] = [{ text: promptText }];

  caseFile.documents.forEach(doc => {
    if (doc.fileData) {
      // Remove data URL prefix if present
      const base64Data = doc.fileData.split(',')[1] || doc.fileData;
      
      // Use stored mimeType or fallback
      const mimeType = doc.mimeType || 'image/jpeg';

      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
      parts.push({ text: `[Above is the ${doc.type}]` });
    }
  });

  const client = getAI();
  if (!client) {
    return {
      caseScore: 5,
      liabilityAssessment: "AI analysis unavailable. Please review manually.",
      retainerValid: false,
      retainerNotes: "API key not configured.",
      summary: "Automated analysis requires a Gemini API key.",
      recommendedAction: 'INVESTIGATE' as const,
      keyRiskFactors: ["AI unavailable"]
    };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caseScore: { type: Type.NUMBER, description: "Score from 1 to 10" },
            liabilityAssessment: { type: Type.STRING, description: "Detailed assessment of liability" },
            retainerValid: { type: Type.BOOLEAN, description: "Is retainer signed?" },
            retainerNotes: { type: Type.STRING, description: "Notes on documents" },
            summary: { type: Type.STRING, description: "Executive summary" },
            recommendedAction: { type: Type.STRING, enum: ['ACCEPT', 'REJECT', 'INVESTIGATE'] },
            keyRiskFactors: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["caseScore", "liabilityAssessment", "retainerValid", "summary", "recommendedAction"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as AIAnalysis;

  } catch (error) {
    console.error("Analysis Failed", error);
    return {
      caseScore: 0,
      liabilityAssessment: "Analysis failed. Please review manually.",
      retainerValid: false,
      retainerNotes: "Could not process document.",
      summary: "System error during analysis.",
      recommendedAction: 'INVESTIGATE',
      keyRiskFactors: ["System Error"]
    };
  }
};

export const matchEmailToCase = async (email: Email, cases: CaseFile[]): Promise<EmailMatchAnalysis> => {
  // Create a condensed summary of available cases
  const casesSummary = cases.map(c => 
    `Case ID: ${c.id}
     Client: ${c.clientName}
     Incident Date: ${c.accidentDate}
     Description: ${c.description}
     DOB: ${c.clientDob || 'N/A'}`
  ).join('\n---\n');

  const prompt = `
    You are a legal intake assistant. Your task is to match an incoming email to one of the active cases in our system.

    INCOMING EMAIL:
    From: ${email.from} (${email.fromEmail})
    Subject: ${email.subject}
    Body: ${email.body}
    Attachments: ${email.attachments.map(a => a.name).join(', ')}

    ACTIVE CASES:
    ${casesSummary}

    INSTRUCTIONS:
    1. Compare the email content (sender, subject, body, attachment names) against the Active Cases.
    2. Look for matching Client Names, Case IDs, Dates of Loss, or specific context (e.g. medical records matching a client's injury).
    3. Assign a Confidence Score from 0 to 100.
       - 90-100: Certain match (e.g., exact Case ID or full name + unique context).
       - 70-89: Likely match (e.g., matching name but generic subject).
       - 0-69: Unsure or no match.
    4. If no case matches, return null for suggestedCaseId.

    Return JSON format only.
  `;

  const client = getAI();
  if (!client) {
    return { suggestedCaseId: null, confidenceScore: 0, reasoning: "AI unavailable - API key not configured" };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedCaseId: { type: Type.STRING, nullable: true, description: "The ID of the matched case, or null if no match found." },
            confidenceScore: { type: Type.NUMBER, description: "0-100 confidence score." },
            reasoning: { type: Type.STRING, description: "Brief explanation of why this match was chosen." }
          },
          required: ["confidenceScore", "reasoning"]
        }
      }
    });

    return JSON.parse(response.text || '{}') as EmailMatchAnalysis;
  } catch (error) {
    console.error("Email Match Failed", error);
    return {
      suggestedCaseId: null,
      confidenceScore: 0,
      reasoning: "AI Service Error"
    };
  }
};

export const classifyAttachmentType = async (fileName: string, emailSubject: string, emailBody: string): Promise<DocumentType> => {
  const prompt = `
    You are an intelligent legal document classifier. 
    Analyze the filename and the context of the email to determine the document type.

    Filename: "${fileName}"
    Email Subject: "${emailSubject}"
    Email Body: "${emailBody.substring(0, 500)}..."

    Available Types:
    - 'retainer': Contracts, fee agreements, representation letters.
    - 'crash_report': Police reports, exchange of information, accident reports.
    - 'medical_record': Medical bills, diagnosis, discharge instructions, MRI/X-Ray reports.
    - 'authorization': HIPAA forms, release of information.
    - 'insurance_card': Policy declarations, insurance cards, coverage letters.
    - 'photo': Images of scene, damage, or injuries.
    - 'other': Any other document (pleadings, correspondence, miscellaneous).

    INSTRUCTIONS:
    - If the file is an image (jpg, png) usually containing "damage" or "scene", it's 'photo'.
    - If "Liability Decision" or "Coverage Position", it's usually 'other' or related to 'insurance_card' if it's strictly policy info, but if it's correspondence about liability, categorize as 'other' or the most relevant type.
    - BE PRECISE. Return ONLY the type string from the list above. Do not return JSON.
  `;

  const client = getAI();
  if (!client) return 'other';

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "text/plain",
      }
    });

    const text = response.text?.trim().toLowerCase().replace(/['"]/g, '') || 'other';
    
    // Validate against allowed types
    const validTypes: DocumentType[] = ['retainer', 'crash_report', 'medical_record', 'authorization', 'insurance_card', 'photo', 'email', 'other'];
    if (validTypes.includes(text as DocumentType)) {
      return text as DocumentType;
    }
    return 'other';

  } catch (error) {
    console.error("Classification Failed", error);
    return 'other';
  }
};
