import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI, Type } from "npm:@google/genai@^1.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DocumentInput {
  fileData: string;
  mimeType: string;
  fileName: string;
}

interface IdentifiedResult {
  type: string;
  suggestedName: string;
  confidence: number;
  fileName: string;
}

const validTypes = [
  "retainer",
  "crash_report",
  "medical_record",
  "authorization",
  "insurance_card",
  "correspondence",
  "photo",
  "email",
  "other",
];

const supportedMimes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

function inferTypeFromFileName(fileName: string): IdentifiedResult {
  const lower = fileName.toLowerCase();
  if (lower.includes("retainer") || lower.includes("fee agreement")) {
    return { type: "retainer", suggestedName: "Retainer - Signed", confidence: 70, fileName };
  }
  if (lower.includes("hipaa") || lower.includes("authorization") || lower.includes("release")) {
    return { type: "authorization", suggestedName: "HIPAA Authorization", confidence: 70, fileName };
  }
  if (lower.includes("crash") || lower.includes("police") || lower.includes("report")) {
    return { type: "crash_report", suggestedName: "Crash Report", confidence: 70, fileName };
  }
  if (lower.includes("insurance") || lower.includes("policy") || lower.includes("declaration")) {
    return { type: "insurance_card", suggestedName: "Insurance Card", confidence: 60, fileName };
  }
  if (lower.includes("letter") || lower.includes("correspondence") || lower.includes("acknowledg")) {
    return { type: "correspondence", suggestedName: "Correspondence", confidence: 60, fileName };
  }
  return { type: "other", suggestedName: fileName, confidence: 30, fileName };
}

function getEffectiveMime(mimeType: string): string {
  if (supportedMimes.includes(mimeType)) return mimeType;
  return mimeType.includes("image") ? "image/png" : "application/pdf";
}

function getBase64(fileData: string): string {
  return fileData.includes(",") ? fileData.split(",")[1] : fileData;
}

const deepAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    documentType: { type: Type.STRING, description: "Document type: retainer, crash_report, medical_record, authorization, insurance_card, correspondence, photo, email, or other" },
    suggestedName: { type: Type.STRING, description: "Suggested standardized filename" },
    confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
    summary: { type: Type.STRING, description: "Brief 1-2 sentence summary of the document content" },
    suggestedCategory: { type: Type.STRING, description: "Suggested category: lor_acknowledgment, coverage_determination, liability_determination, policy_limits, correspondence, billing, treatment, investigation, intake, settlement, demand, or other" },
    actions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          actionType: { type: Type.STRING, description: "Type: update_adjuster, complete_task, update_claim_number, update_insurance_info, update_coverage_status, update_liability_status, update_policy_limits, update_intake_field, general_note" },
          title: { type: Type.STRING, description: "Short title of the recommended action" },
          description: { type: Type.STRING, description: "Detailed description of what was found and what should be done" },
          priority: { type: Type.STRING, description: "high, medium, or low" },
          fieldName: { type: Type.STRING, description: "The field name that should be updated, if applicable" },
          oldValue: { type: Type.STRING, description: "The current/old value mentioned in the document, if applicable" },
          newValue: { type: Type.STRING, description: "The new value that should be set, if applicable" },
          taskType: { type: Type.STRING, description: "Task type to complete: lor_defendant, lor_client_ins, coverage_followup, liability_followup, policy_limits, crash_report_received, or empty if not a task completion" },
        },
        required: ["actionType", "title", "description", "priority"],
      },
      description: "List of recommended actions based on document content",
    },
    extractedData: {
      type: Type.OBJECT,
      properties: {
        adjusterName: { type: Type.STRING, description: "Name of the insurance adjuster mentioned" },
        adjusterPhone: { type: Type.STRING, description: "Phone number of adjuster" },
        adjusterEmail: { type: Type.STRING, description: "Email of adjuster" },
        claimNumber: { type: Type.STRING, description: "Claim number referenced" },
        policyNumber: { type: Type.STRING, description: "Policy number referenced" },
        insuranceCompany: { type: Type.STRING, description: "Insurance company name" },
        coverageDecision: { type: Type.STRING, description: "Coverage decision: accepted, denied, pending, or empty" },
        liabilityDecision: { type: Type.STRING, description: "Liability decision: accepted, denied, disputed, or empty" },
        policyLimitsAmount: { type: Type.STRING, description: "Policy limits amount if mentioned" },
        dateOfLetter: { type: Type.STRING, description: "Date of the letter/document in YYYY-MM-DD format" },
        referenceNumber: { type: Type.STRING, description: "Any reference or file number" },
        clientName: { type: Type.STRING, description: "Client/plaintiff name referenced" },
        defendantName: { type: Type.STRING, description: "Defendant/insured name referenced" },
      },
      description: "Structured data extracted from the document",
    },
  },
  required: ["documentType", "suggestedName", "confidence", "summary", "actions"],
};

const extractionSchema = {
  type: Type.OBJECT,
  properties: {
    clientName: { type: Type.STRING, description: "Full name of the client/plaintiff" },
    clientDob: { type: Type.STRING, description: "Date of birth in YYYY-MM-DD format" },
    clientSsn: { type: Type.STRING, description: "Client SSN if visible" },
    clientEmail: { type: Type.STRING, description: "Client email address" },
    clientPhone: { type: Type.STRING, description: "Client phone number" },
    clientCellPhone: { type: Type.STRING, description: "Client cell phone" },
    clientHomePhone: { type: Type.STRING, description: "Client home phone" },
    clientAddress: { type: Type.STRING, description: "Client street address" },
    clientCity: { type: Type.STRING, description: "Client city" },
    clientState: { type: Type.STRING, description: "Client state" },
    clientZip: { type: Type.STRING, description: "Client zip code" },
    clientMaritalStatus: { type: Type.STRING, description: "Married or Single" },
    clientDriversLicenseNumber: { type: Type.STRING, description: "Client DL number" },
    clientDriversLicenseState: { type: Type.STRING, description: "Client DL state" },
    emergencyContactName: { type: Type.STRING, description: "Emergency contact name" },
    emergencyContactPhone: { type: Type.STRING, description: "Emergency contact phone" },
    accidentDate: { type: Type.STRING, description: "Date of accident in YYYY-MM-DD format" },
    accidentTime: { type: Type.STRING, description: "Time of accident in HH:MM format" },
    accidentLocation: { type: Type.STRING, description: "Street or intersection of accident" },
    accidentCity: { type: Type.STRING, description: "City where accident occurred" },
    accidentCounty: { type: Type.STRING, description: "County where accident occurred" },
    accidentDescription: { type: Type.STRING, description: "Narrative of how the accident happened" },
    policeReportNumber: { type: Type.STRING, description: "Police/crash report number" },
    policeAgency: { type: Type.STRING, description: "Police agency" },
    plaintiffRole: { type: Type.STRING, description: "Driver, Passenger, or Pedestrian" },
    weatherConditions: { type: Type.STRING, description: "Weather at time of accident" },
    speedLimit: { type: Type.STRING, description: "Posted speed limit" },
    plaintiffDirection: { type: Type.STRING, description: "Direction plaintiff was traveling" },
    defendantDirection: { type: Type.STRING, description: "Direction defendant was traveling" },
    mainIntersections: { type: Type.STRING, description: "Main intersections near accident" },
    defendantName: { type: Type.STRING, description: "Defendant/at-fault party name" },
    defendantPhone: { type: Type.STRING, description: "Defendant phone" },
    defendantAddressStreet: { type: Type.STRING, description: "Defendant street address" },
    defendantAddressCity: { type: Type.STRING, description: "Defendant city" },
    defendantAddressState: { type: Type.STRING, description: "Defendant state" },
    defendantAddressZip: { type: Type.STRING, description: "Defendant zip" },
    defendantDriversLicense: { type: Type.STRING, description: "Defendant DL number" },
    defendantLicensePlate: { type: Type.STRING, description: "Defendant license plate" },
    defendantVehicleYear: { type: Type.STRING, description: "Defendant vehicle year" },
    defendantVehicleMake: { type: Type.STRING, description: "Defendant vehicle make" },
    defendantVehicleModel: { type: Type.STRING, description: "Defendant vehicle model" },
    defendantVehicleColor: { type: Type.STRING, description: "Defendant vehicle color" },
    defendantInsurance: { type: Type.STRING, description: "Defendant insurance company" },
    defendantInsuranceType: { type: Type.STRING, description: "Personal or Commercial" },
    defendantPolicyNumber: { type: Type.STRING, description: "Defendant policy number" },
    defendantClaimNumber: { type: Type.STRING, description: "Defendant claim number" },
    defendantAdjusterName: { type: Type.STRING, description: "Defendant insurance adjuster name" },
    defendantAdjusterPhone: { type: Type.STRING, description: "Defendant insurance adjuster phone" },
    defendantCoverageLimits: { type: Type.STRING, description: "Defendant coverage limits" },
    clientInsurance: { type: Type.STRING, description: "Client auto insurance company" },
    clientPolicyNumber: { type: Type.STRING, description: "Client auto policy number" },
    clientClaimNumber: { type: Type.STRING, description: "Client auto claim number" },
    clientInsuranceCoverageLimits: { type: Type.STRING, description: "Client coverage limits" },
    healthInsuranceCompany: { type: Type.STRING, description: "Client health insurance company" },
    healthInsuranceMemberNumber: { type: Type.STRING, description: "Health insurance member ID" },
    healthInsuranceGroupNumber: { type: Type.STRING, description: "Health insurance group number" },
    vehicleYear: { type: Type.STRING, description: "Client vehicle year" },
    vehicleMake: { type: Type.STRING, description: "Client vehicle make" },
    vehicleModel: { type: Type.STRING, description: "Client vehicle model" },
    vehicleColor: { type: Type.STRING, description: "Client vehicle color" },
    vehicleLicensePlate: { type: Type.STRING, description: "Client vehicle plate" },
    vehicleDamage: { type: Type.STRING, description: "Vehicle damage description" },
    vehicleDrivable: { type: Type.BOOLEAN, description: "Is vehicle drivable" },
    airbags: { type: Type.BOOLEAN, description: "Did airbags deploy" },
    seatbeltWorn: { type: Type.BOOLEAN, description: "Was seatbelt worn" },
    propertyDamageEstimate: { type: Type.STRING, description: "Estimated damage amount" },
    bodyShopName: { type: Type.STRING, description: "Body shop name" },
    bodyShopPhone: { type: Type.STRING, description: "Body shop phone" },
    bodyShopAddress: { type: Type.STRING, description: "Body shop address" },
    injuries: { type: Type.STRING, description: "Description of injuries" },
    ambulance: { type: Type.BOOLEAN, description: "Ambulance taken" },
    xraysTaken: { type: Type.BOOLEAN, description: "X-rays taken" },
    hospitalName: { type: Type.STRING, description: "Hospital name" },
    hospitalAddress: { type: Type.STRING, description: "Hospital address" },
    hospitalPhone: { type: Type.STRING, description: "Hospital phone" },
    preExistingConditions: { type: Type.STRING, description: "Pre-existing conditions" },
    treatmentProviders: { type: Type.STRING, description: "Treatment provider names" },
    doctorReferredTo: { type: Type.STRING, description: "Doctor referred to" },
    employerName: { type: Type.STRING, description: "Employer name" },
    employerPhone: { type: Type.STRING, description: "Employer phone" },
    employerAddress: { type: Type.STRING, description: "Employer address" },
    employmentPosition: { type: Type.STRING, description: "Job position/title" },
    timeLostFromWork: { type: Type.BOOLEAN, description: "Time lost from work" },
    timeLostAmount: { type: Type.STRING, description: "Amount of time lost" },
    wagesAmount: { type: Type.STRING, description: "Wages amount" },
    wagesPer: { type: Type.STRING, description: "Hour, Week, or Year" },
    retainerSigned: { type: Type.BOOLEAN, description: "Whether retainer appears signed" },
    hipaaSigned: { type: Type.BOOLEAN, description: "Whether HIPAA appears signed" },
    referralSource: { type: Type.STRING, description: "How client was referred" },
    primaryLanguage: { type: Type.STRING, description: "Client primary language" },
    notes: { type: Type.STRING, description: "Any additional notes from documents" },
  },
};

const fieldGroups = [
  { keys: ["clientName", "clientDob", "clientSsn", "clientEmail", "clientPhone", "clientCellPhone", "clientHomePhone", "clientAddress", "clientCity", "clientState", "clientZip", "clientMaritalStatus", "clientDriversLicenseNumber", "clientDriversLicenseState", "emergencyContactName", "emergencyContactPhone"], label: "Client Info" },
  { keys: ["accidentDate", "accidentTime", "accidentLocation", "accidentCity", "accidentCounty", "accidentDescription", "policeReportNumber", "policeAgency", "plaintiffRole", "weatherConditions", "speedLimit", "plaintiffDirection", "defendantDirection", "mainIntersections"], label: "Accident Details" },
  { keys: ["defendantName", "defendantPhone", "defendantAddressStreet", "defendantAddressCity", "defendantAddressState", "defendantAddressZip", "defendantDriversLicense", "defendantLicensePlate", "defendantVehicleYear", "defendantVehicleMake", "defendantVehicleModel", "defendantVehicleColor", "defendantInsurance", "defendantInsuranceType", "defendantPolicyNumber", "defendantClaimNumber", "defendantAdjusterName", "defendantAdjusterPhone", "defendantCoverageLimits"], label: "Defendant" },
  { keys: ["clientInsurance", "clientPolicyNumber", "clientClaimNumber", "clientInsuranceCoverageLimits", "healthInsuranceCompany", "healthInsuranceMemberNumber", "healthInsuranceGroupNumber"], label: "Insurance" },
  { keys: ["vehicleYear", "vehicleMake", "vehicleModel", "vehicleColor", "vehicleLicensePlate", "vehicleDamage", "vehicleDrivable", "airbags", "seatbeltWorn", "propertyDamageEstimate", "bodyShopName", "bodyShopPhone", "bodyShopAddress"], label: "Vehicle" },
  { keys: ["injuries", "ambulance", "xraysTaken", "hospitalName", "hospitalAddress", "hospitalPhone", "preExistingConditions", "treatmentProviders", "doctorReferredTo"], label: "Medical" },
  { keys: ["employerName", "employerPhone", "employerAddress", "employmentPosition", "timeLostFromWork", "timeLostAmount", "wagesAmount", "wagesPer"], label: "Employment" },
  { keys: ["retainerSigned", "hipaaSigned"], label: "Signatures" },
  { keys: ["referralSource", "primaryLanguage", "notes"], label: "Admin" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { documents, clientNames, clientName, mode, apiKey: clientApiKey }: { documents: DocumentInput[]; clientNames?: string[]; clientName?: string; mode?: string; apiKey?: string } = body;
    const resolvedClientNames = (clientNames && clientNames.length > 0) ? clientNames : (clientName ? [clientName] : []);
    const identifyOnly = mode === "identify_only";
    const deepAnalysis = mode === "deep_analysis";

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("API_KEY") || clientApiKey;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "No Gemini API key available.", identified: [], extracted: {} }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "No documents provided", identified: [], extracted: {} }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (event: string, data: unknown) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const identified: IdentifiedResult[] = [];

        if (deepAnalysis) {
          for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            send("scan_start", { index: i, fileName: doc.fileName, total: documents.length });

            try {
              const base64Data = getBase64(doc.fileData);
              const effectiveMime = getEffectiveMime(doc.mimeType);

              const caseContext = resolvedClientNames.length > 0
                ? `\n\nCase context: The client/plaintiff is "${resolvedClientNames[0]}". Any other party names are likely defendants or their representatives.`
                : "";

              const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{
                  parts: [
                    { inlineData: { mimeType: effectiveMime, data: base64Data } },
                    {
                      text: `You are a legal case management AI assistant. Read ALL pages of this document thoroughly and analyze its contents.${caseContext}

This is a document uploaded to a personal injury case management system. Your job is to:

1. IDENTIFY the document type from: retainer, crash_report, medical_record, authorization, insurance_card, correspondence, photo, email, other
   - "correspondence" = letters from/to insurance companies, adjusters, attorneys, or any formal correspondence related to the case
   - A letter from an insurance company IS "correspondence", not "other"

2. SUMMARIZE what the document says in 1-2 sentences

3. EXTRACT any actionable information and create recommended actions. Common scenarios include:
   - Adjuster changed/assigned: If a letter mentions a NEW adjuster name, phone, or email, recommend updating the adjuster info
   - LOR acknowledged: If the insurance company acknowledges receipt of a Letter of Representation, recommend completing the LOR task
   - Coverage decision: If coverage is accepted/denied, recommend updating coverage status
   - Liability decision: If liability is accepted/denied/disputed, recommend updating liability status
   - Policy limits disclosed: If policy limits amounts are mentioned, recommend updating
   - Claim number assigned: If a new claim number is provided, recommend updating
   - New insurance info: Any new policy numbers, claim numbers, or insurance contact info

4. EXTRACT structured data: adjuster name/phone/email, claim numbers, policy numbers, insurance company, dates, etc.

Be thorough - read every page. Insurance letters often have key information on page 2 or later pages.`
                    }
                  ]
                }],
                config: {
                  responseMimeType: "application/json",
                  responseSchema: deepAnalysisSchema,
                },
              });

              const parsed = JSON.parse(response.text || "{}");
              const docType = validTypes.includes(parsed.documentType) ? parsed.documentType : "other";

              send("doc_identified", {
                index: i,
                type: docType,
                suggestedName: parsed.suggestedName || doc.fileName,
                confidence: parsed.confidence || 50,
                fileName: doc.fileName,
              });

              send("doc_analysis", {
                index: i,
                summary: parsed.summary || "",
                suggestedCategory: parsed.suggestedCategory || "",
                actions: parsed.actions || [],
                extractedData: parsed.extractedData || {},
              });
            } catch (err) {
              console.error(`Deep analysis failed for ${doc.fileName}:`, err);
              const fallback = inferTypeFromFileName(doc.fileName);
              send("doc_identified", { index: i, ...fallback });
              send("doc_analysis", {
                index: i,
                summary: "Analysis could not be completed for this document.",
                suggestedCategory: "",
                actions: [],
                extractedData: {},
              });
            }
          }

          send("complete", { message: "Deep analysis complete" });
          controller.close();
          return;
        }

        for (let i = 0; i < documents.length; i++) {
          const doc = documents[i];
          send("scan_start", { index: i, fileName: doc.fileName, total: documents.length });

          let result: IdentifiedResult;
          try {
            const base64Data = getBase64(doc.fileData);
            const effectiveMime = getEffectiveMime(doc.mimeType);

            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: [{
                parts: [
                  { inlineData: { mimeType: effectiveMime, data: base64Data } },
                  {
                    text: `Analyze this document and identify what type of legal/intake document it is. Read ALL pages thoroughly.

Available types:
- retainer: Signed retainer agreement or fee agreement between client and attorney
- authorization: HIPAA authorization form or medical records release
- crash_report: Police report, crash report, or accident report
- insurance_card: Insurance card, declarations page, or policy document
- correspondence: Letters from/to insurance companies, adjusters, attorneys, acknowledgment letters, coverage letters, denial letters, or any formal correspondence
- photo: Photos of injuries, vehicle damage, or accident scene
- medical_record: Medical records, discharge papers, diagnosis
- email: Email correspondence
- other: Anything that does not fit any above category

IMPORTANT: A letter from an insurance company about a claim IS "correspondence", NOT "other".

Return the document type and a suggested standardized filename.
The filename should follow the pattern: "DocumentType - Detail" (e.g., "Retainer - Signed", "Correspondence - LOR Acknowledgment from State Farm", "Correspondence - Adjuster Change Notice")`
                  }
                ]
              }],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, description: "Document type from the available list" },
                    suggestedName: { type: Type.STRING, description: "Suggested standardized filename" },
                    confidence: { type: Type.NUMBER, description: "Confidence score 0-100" },
                  },
                  required: ["type", "suggestedName", "confidence"],
                },
              },
            });

            const parsed = JSON.parse(response.text || "{}");
            const docType = validTypes.includes(parsed.type) ? parsed.type : "other";
            result = {
              type: docType,
              suggestedName: parsed.suggestedName || doc.fileName,
              confidence: parsed.confidence || 50,
              fileName: doc.fileName,
            };
          } catch (err) {
            console.error(`Identification failed for ${doc.fileName}:`, err);
            result = inferTypeFromFileName(doc.fileName);
          }

          identified.push(result);
          send("doc_identified", { index: i, ...result });
        }

        if (identifyOnly) {
          send("complete", { message: "Identification complete" });
          controller.close();
          return;
        }

        send("extraction_start", { message: "Cross-referencing all documents to extract detailed client data..." });

        try {
          const extractionParts: any[] = [];
          for (let i = 0; i < documents.length; i++) {
            const doc = documents[i];
            const base64Data = getBase64(doc.fileData);
            const effectiveMime = getEffectiveMime(doc.mimeType);
            extractionParts.push({ inlineData: { mimeType: effectiveMime, data: base64Data } });
            extractionParts.push({
              text: `[Document above is identified as: ${identified[i].type} - "${identified[i].suggestedName}"]`,
            });
          }

          const clientNameInstruction = resolvedClientNames.length > 0
            ? resolvedClientNames.length === 1
              ? `CRITICAL: The client/plaintiff in this case is "${resolvedClientNames[0]}". When reading police/crash reports that list multiple parties (drivers, passengers, pedestrians), the person matching or closest to "${resolvedClientNames[0]}" is the CLIENT/PLAINTIFF. All other parties are defendants or witnesses. Assign vehicle info, address, insurance, and other details to the correct party based on this. Do NOT confuse the client with the defendant.`
              : `CRITICAL: This is a multi-party matter. The clients/plaintiffs in this case are: ${resolvedClientNames.map((n: string, i: number) => `${i === 0 ? '(PRIMARY) ' : ''}"${n}"`).join(', ')}. When reading police/crash reports that list multiple parties, the people matching or closest to these names are the CLIENTS/PLAINTIFFS. All other parties are defendants or witnesses. The PRIMARY client's info should populate the main client fields. Assign vehicle info, address, insurance, and other details to the correct party based on this. Do NOT confuse any client with the defendant.`
            : "";

          extractionParts.push({
            text: `You are a legal intake specialist. Review ALL the uploaded documents carefully and extract as much client intake information as possible.

${clientNameInstruction}

These documents typically include:
- Retainer agreement (contains client name, signature, date)
- HIPAA authorization (contains client info, signature)
- Police/crash report (contains accident details, parties involved, vehicles, date, location, defendant info, insurance info, directions of travel, weather, citations)
- Insurance cards (contains policy info, carrier name, member numbers)
- Medical records (injuries, providers, treatment)

Extract EVERY available field. Be extremely thorough:
- For crash reports: extract ALL parties, ALL vehicle info, directions, weather, speed limits, report numbers, agency info, intersections
- For client info: full name, DOB, SSN if visible, phone numbers, full address with city/state/zip, DL info
- For defendant info: name, address, phone, DL, plate, vehicle year/make/model/color, insurance company/policy/claim/adjuster
- For insurance: both defendant and client insurance, health insurance if present
- For vehicles: year, make, model, color, plate, damage description, drivability, airbags, seatbelt
- For medical: injuries, ambulance, hospital, x-rays, providers, pre-existing conditions

If a field is not found in any document, omit it. Cross-reference data between documents.`,
          });

          const extractionResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: extractionParts }],
            config: {
              responseMimeType: "application/json",
              responseSchema: extractionSchema,
            },
          });

          const extracted = JSON.parse(extractionResponse.text || "{}");

          for (const group of fieldGroups) {
            const fields: Record<string, unknown> = {};
            let hasData = false;
            for (const key of group.keys) {
              if (extracted[key] !== undefined && extracted[key] !== null && extracted[key] !== "") {
                fields[key] = extracted[key];
                hasData = true;
              }
            }
            if (hasData) {
              send("fields_extracted", { group: group.label, fields });
            }
          }
        } catch (err) {
          console.error("Extraction failed:", err);
          send("extraction_error", { error: err instanceof Error ? err.message : "Extraction failed" });
        }

        send("complete", { message: "Analysis complete" });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        identified: [],
        extracted: {},
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
