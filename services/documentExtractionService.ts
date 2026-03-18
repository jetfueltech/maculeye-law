import { GoogleGenAI, Type } from "@google/genai";
import { DocumentType } from '../types';

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (ai) return ai;
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  ai = new GoogleGenAI({ apiKey });
  return ai;
}

export interface IdentifiedDocument {
  file: File;
  fileData: string;
  mimeType: string;
  identifiedType: DocumentType;
  suggestedName: string;
  confidence: number;
}

export interface ExtractedIntakeData {
  clientName?: string;
  clientDob?: string;
  clientSsn?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientCellPhone?: string;
  clientHomePhone?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  clientMaritalStatus?: string;
  clientDriversLicenseNumber?: string;
  clientDriversLicenseState?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  accidentDate?: string;
  accidentTime?: string;
  accidentLocation?: string;
  accidentCity?: string;
  accidentCounty?: string;
  accidentDescription?: string;
  policeReportNumber?: string;
  policeAgency?: string;
  plaintiffRole?: string;
  weatherConditions?: string;
  speedLimit?: string;
  plaintiffDirection?: string;
  defendantDirection?: string;
  mainIntersections?: string;

  defendantName?: string;
  defendantPhone?: string;
  defendantAddressStreet?: string;
  defendantAddressCity?: string;
  defendantAddressState?: string;
  defendantAddressZip?: string;
  defendantDriversLicense?: string;
  defendantLicensePlate?: string;
  defendantVehicleYear?: string;
  defendantVehicleMake?: string;
  defendantVehicleModel?: string;
  defendantVehicleColor?: string;
  defendantInsurance?: string;
  defendantInsuranceType?: string;
  defendantPolicyNumber?: string;
  defendantClaimNumber?: string;
  defendantAdjusterName?: string;
  defendantAdjusterPhone?: string;
  defendantCoverageLimits?: string;

  clientInsurance?: string;
  clientPolicyNumber?: string;
  clientClaimNumber?: string;
  clientInsuranceCoverageLimits?: string;

  healthInsuranceCompany?: string;
  healthInsuranceMemberNumber?: string;
  healthInsuranceGroupNumber?: string;

  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  vehicleLicensePlate?: string;
  vehicleDamage?: string;
  vehicleDrivable?: boolean;
  airbags?: boolean;
  seatbeltWorn?: boolean;
  propertyDamageEstimate?: string;
  bodyShopName?: string;
  bodyShopPhone?: string;
  bodyShopAddress?: string;

  injuries?: string;
  ambulance?: boolean;
  xraysTaken?: boolean;
  hospitalName?: string;
  hospitalAddress?: string;
  hospitalPhone?: string;
  preExistingConditions?: string;
  treatmentProviders?: string;
  doctorReferredTo?: string;

  employerName?: string;
  employerPhone?: string;
  employerAddress?: string;
  employmentPosition?: string;
  timeLostFromWork?: boolean;
  timeLostAmount?: string;
  wagesAmount?: string;
  wagesPer?: string;

  retainerSigned?: boolean;
  hipaaSigned?: boolean;

  referralSource?: string;
  primaryLanguage?: string;
  notes?: string;
}

export const EXTRACTED_FIELD_SECTIONS: Record<string, { label: string; fields: string[] }> = {
  client: {
    label: 'Client Info',
    fields: ['clientName', 'clientDob', 'clientSsn', 'clientEmail', 'clientPhone', 'clientCellPhone', 'clientHomePhone', 'clientAddress', 'clientCity', 'clientState', 'clientZip', 'clientMaritalStatus', 'clientDriversLicenseNumber', 'clientDriversLicenseState', 'emergencyContactName', 'emergencyContactPhone'],
  },
  accident: {
    label: 'Accident',
    fields: ['accidentDate', 'accidentTime', 'accidentLocation', 'accidentCity', 'accidentCounty', 'accidentDescription', 'policeReportNumber', 'policeAgency', 'plaintiffRole', 'weatherConditions', 'speedLimit', 'plaintiffDirection', 'defendantDirection', 'mainIntersections'],
  },
  defendant: {
    label: 'Defendant',
    fields: ['defendantName', 'defendantPhone', 'defendantAddressStreet', 'defendantAddressCity', 'defendantAddressState', 'defendantAddressZip', 'defendantDriversLicense', 'defendantLicensePlate', 'defendantVehicleYear', 'defendantVehicleMake', 'defendantVehicleModel', 'defendantVehicleColor', 'defendantInsurance', 'defendantInsuranceType', 'defendantPolicyNumber', 'defendantClaimNumber', 'defendantAdjusterName', 'defendantAdjusterPhone', 'defendantCoverageLimits'],
  },
  insurance: {
    label: 'Insurance',
    fields: ['clientInsurance', 'clientPolicyNumber', 'clientClaimNumber', 'clientInsuranceCoverageLimits', 'healthInsuranceCompany', 'healthInsuranceMemberNumber', 'healthInsuranceGroupNumber'],
  },
  vehicle: {
    label: 'Vehicle & Property',
    fields: ['vehicleYear', 'vehicleMake', 'vehicleModel', 'vehicleColor', 'vehicleLicensePlate', 'vehicleDamage', 'vehicleDrivable', 'airbags', 'seatbeltWorn', 'propertyDamageEstimate', 'bodyShopName', 'bodyShopPhone', 'bodyShopAddress'],
  },
  medical: {
    label: 'Medical',
    fields: ['injuries', 'ambulance', 'xraysTaken', 'hospitalName', 'hospitalAddress', 'hospitalPhone', 'preExistingConditions', 'treatmentProviders', 'doctorReferredTo'],
  },
  employment: {
    label: 'Employment',
    fields: ['employerName', 'employerPhone', 'employerAddress', 'employmentPosition', 'timeLostFromWork', 'timeLostAmount', 'wagesAmount', 'wagesPer'],
  },
  documents: {
    label: 'Documents',
    fields: ['retainerSigned', 'hipaaSigned'],
  },
};

export async function identifyDocument(
  fileData: string,
  mimeType: string,
  fileName: string
): Promise<{ type: DocumentType; suggestedName: string; confidence: number }> {
  const client = getAI();
  if (!client) {
    return inferTypeFromFileName(fileName);
  }

  try {
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          parts: [
            {
              inlineData: { mimeType, data: base64Data }
            },
            {
              text: `Analyze this document and identify what type of legal/intake document it is.

Available types:
- retainer: Signed retainer agreement or fee agreement between client and attorney
- authorization: HIPAA authorization form or medical records release
- crash_report: Police report, crash report, or accident report
- insurance_card: Insurance card, declarations page, or policy document
- photo: Photos of injuries, vehicle damage, or accident scene
- medical_record: Medical records, discharge papers, diagnosis
- other: Anything else

Return the document type and a suggested standardized filename.
The filename should follow the pattern: "DocumentType - Detail" (e.g., "Retainer - Signed", "Crash Report - Chicago PD", "HIPAA Authorization - Signed")`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, description: "Document type from the available list" },
            suggestedName: { type: Type.STRING, description: "Suggested standardized filename" },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-100" }
          },
          required: ["type", "suggestedName", "confidence"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    const validTypes: DocumentType[] = ['retainer', 'crash_report', 'medical_record', 'authorization', 'insurance_card', 'photo', 'other'];
    const docType = validTypes.includes(result.type) ? result.type : 'other';

    return {
      type: docType,
      suggestedName: result.suggestedName || fileName,
      confidence: result.confidence || 50
    };
  } catch {
    return inferTypeFromFileName(fileName);
  }
}

function inferTypeFromFileName(fileName: string): { type: DocumentType; suggestedName: string; confidence: number } {
  const lower = fileName.toLowerCase();
  if (lower.includes('retainer') || lower.includes('fee agreement')) {
    return { type: 'retainer', suggestedName: 'Retainer - Signed', confidence: 70 };
  }
  if (lower.includes('hipaa') || lower.includes('authorization') || lower.includes('release')) {
    return { type: 'authorization', suggestedName: 'HIPAA Authorization', confidence: 70 };
  }
  if (lower.includes('crash') || lower.includes('police') || lower.includes('report')) {
    return { type: 'crash_report', suggestedName: 'Crash Report', confidence: 70 };
  }
  if (lower.includes('insurance') || lower.includes('policy') || lower.includes('declaration')) {
    return { type: 'insurance_card', suggestedName: 'Insurance Card', confidence: 60 };
  }
  return { type: 'other', suggestedName: fileName, confidence: 30 };
}

export async function extractIntakeData(
  documents: IdentifiedDocument[]
): Promise<ExtractedIntakeData> {
  const client = getAI();
  if (!client) {
    return {};
  }

  const parts: any[] = [];

  documents.forEach(doc => {
    if (doc.fileData) {
      const base64Data = doc.fileData.includes(',') ? doc.fileData.split(',')[1] : doc.fileData;
      parts.push({
        inlineData: { mimeType: doc.mimeType, data: base64Data }
      });
      parts.push({
        text: `[Document above is identified as: ${doc.identifiedType} - "${doc.suggestedName}"]`
      });
    }
  });

  parts.push({
    text: `You are a legal intake specialist. Review ALL the uploaded documents carefully and extract as much client intake information as possible.

These documents typically include:
- Retainer agreement (contains client name, signature, date)
- HIPAA authorization (contains client info, signature)
- Police/crash report (contains accident details, parties, vehicles, date, location, defendant info, insurance info)
- Insurance cards (contains policy info, carrier name)

Extract the following fields where available. If a field is not found in any document, omit it.
Be thorough - check every document for relevant information. Cross-reference data between documents when possible.`
  });

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: { type: Type.STRING },
            clientDob: { type: Type.STRING },
            clientEmail: { type: Type.STRING },
            clientPhone: { type: Type.STRING },
            clientAddress: { type: Type.STRING },
            accidentDate: { type: Type.STRING },
            accidentLocation: { type: Type.STRING },
            accidentDescription: { type: Type.STRING },
            policeReportNumber: { type: Type.STRING },
            policeAgency: { type: Type.STRING },
            defendantName: { type: Type.STRING },
            defendantInsurance: { type: Type.STRING },
            defendantPolicyNumber: { type: Type.STRING },
            defendantVehicle: { type: Type.STRING },
            clientInsurance: { type: Type.STRING },
            clientPolicyNumber: { type: Type.STRING },
            vehicleYear: { type: Type.STRING },
            vehicleMake: { type: Type.STRING },
            vehicleModel: { type: Type.STRING },
            vehicleDamage: { type: Type.STRING },
            injuries: { type: Type.STRING },
            treatmentProviders: { type: Type.STRING },
            retainerSigned: { type: Type.BOOLEAN },
            hipaaSigned: { type: Type.BOOLEAN }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}') as ExtractedIntakeData;
  } catch (error) {
    console.error("Extraction failed:", error);
    return {};
  }
}
