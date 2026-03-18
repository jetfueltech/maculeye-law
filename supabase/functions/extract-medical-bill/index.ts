import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenAI, Type } from "npm:@google/genai@^1.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supportedMimes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

function getEffectiveMime(mimeType: string): string {
  if (supportedMimes.includes(mimeType)) return mimeType;
  return mimeType.includes("image") ? "image/png" : "application/pdf";
}

function getBase64(fileData: string): string {
  return fileData.includes(",") ? fileData.split(",")[1] : fileData;
}

const billItemSchema = {
  type: Type.OBJECT,
  properties: {
    providerName: { type: Type.STRING, description: "Name of the medical provider/facility on the bill" },
    providerAddress: { type: Type.STRING, description: "Full street address of the provider" },
    providerCity: { type: Type.STRING, description: "City of the provider" },
    providerState: { type: Type.STRING, description: "State of the provider" },
    providerZip: { type: Type.STRING, description: "Zip code of the provider" },
    providerPhone: { type: Type.STRING, description: "Phone number of the provider" },
    providerFax: { type: Type.STRING, description: "Fax number of the provider" },
    providerType: {
      type: Type.STRING,
      description: "Type of provider: hospital, er, urgent_care, chiropractor, physical_therapy, orthopedic, neurologist, pain_management, primary_care, imaging, surgery_center, or other",
    },
    patientName: { type: Type.STRING, description: "Name of the patient on the bill" },
    patientDob: { type: Type.STRING, description: "Patient date of birth" },
    patientAccountNumber: { type: Type.STRING, description: "Patient account number" },
    dateOfService: { type: Type.STRING, description: "Date of service or visit (YYYY-MM-DD format if possible)" },
    dateOfServiceEnd: { type: Type.STRING, description: "End date of service if range (YYYY-MM-DD format)" },
    totalCharges: { type: Type.NUMBER, description: "Total charges/amount billed" },
    amountPaid: { type: Type.NUMBER, description: "Amount already paid" },
    amountDue: { type: Type.NUMBER, description: "Balance due / amount owed" },
    insurancePayments: { type: Type.NUMBER, description: "Amount paid by insurance" },
    adjustments: { type: Type.NUMBER, description: "Insurance adjustments or write-offs" },
    lineItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING, description: "Service or procedure description" },
          cptCode: { type: Type.STRING, description: "CPT code if available" },
          date: { type: Type.STRING, description: "Date of this specific service" },
          amount: { type: Type.NUMBER, description: "Charge amount for this line item" },
        },
      },
      description: "Individual line items / charges on this specific bill",
    },
    diagnosisCodes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "ICD-10 diagnosis codes if listed on this bill",
    },
    billType: {
      type: Type.STRING,
      description: "Type of bill: facility, physician, radiology, lab, pharmacy, ambulance, or other",
    },
    documentTypeKey: {
      type: Type.STRING,
      description: "A specific document type key for naming. Must be one of: er_facility_bill, er_physician_bill, er_radiology_bill, hospital_facility_bill, hospital_physician_bill, chiro_bill, pt_bill, ortho_bill, neuro_bill, pain_mgmt_bill, pcp_bill, imaging_bill, surgery_bill, lab_bill, pharmacy_bill, ambulance_bill, medical_bill",
    },
    pageSpan: {
      type: Type.STRING,
      description: "If you can identify the page range this bill spans in the document, provide it as e.g. '1-3' or '4-4'. If unknown, leave empty.",
    },
    notes: { type: Type.STRING, description: "Any other relevant notes or observations from this bill" },
  },
};

const multiBillSchema = {
  type: Type.OBJECT,
  properties: {
    documentStructure: {
      type: Type.STRING,
      description: "Describe how the document is structured: 'single_bill' if the entire document is one bill (even if multi-page), 'bill_packet' if the document contains multiple distinct bills from different providers or different dates of service, or 'single_bill_multipage' if the document is a single bill that spans multiple pages with continuation pages.",
    },
    bills: {
      type: Type.ARRAY,
      items: billItemSchema,
      description: "Array of all distinct bills found in the document. A multi-page bill for the SAME provider with the SAME account number and a continuous charge list is ONE bill, not multiple. Only split into separate entries when there are truly different bills (different providers, different account numbers, or clearly separate billing statements).",
    },
  },
  required: ["documentStructure", "bills"],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { fileData, mimeType, fileName, apiKey: clientApiKey } = body;

    const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("API_KEY") || clientApiKey;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "No Gemini API key available." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fileData || !mimeType) {
      return new Response(
        JSON.stringify({ error: "fileData and mimeType are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const base64Data = getBase64(fileData);
    const effectiveMime = getEffectiveMime(mimeType);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { inlineData: { mimeType: effectiveMime, data: base64Data } },
            {
              text: `You are a medical billing specialist AI. Analyze this document carefully to determine its structure and extract bill data.

STEP 1 - DOCUMENT STRUCTURE ANALYSIS:
First, determine the document structure:
- "single_bill": The document contains exactly ONE bill from one provider (may be just 1 page).
- "single_bill_multipage": The document is ONE bill from one provider that spans multiple pages. Clues: same provider header on each page, page numbers like "Page 1 of 3", continuation of the same charge list, same account number throughout. This is ONE bill, NOT multiple.
- "bill_packet": The document contains MULTIPLE distinct bills. Clues: different provider names appear, different headers/letterheads, separate billing statements with their own totals, different account numbers from different facilities.

CRITICAL DISTINCTION - Multi-page vs Packet:
- A 5-page PDF where every page says "Memorial Hospital" with the same account number and charges continuing across pages = "single_bill_multipage" with 1 bill entry
- A 5-page PDF where page 1-2 is from "Memorial Hospital" and page 3-5 is from "Dr. Smith's Office" = "bill_packet" with 2 bill entries
- Multiple pages that are just different VIEWS of the same bill (summary page + detail page + insurance explanation) = "single_bill_multipage" with 1 bill entry

STEP 2 - BILL EXTRACTION:
For EACH distinct bill (remember: multi-page same-provider = 1 bill), extract:

1. PROVIDER INFO: Full name, complete address, phone, fax, provider type (hospital, er, urgent_care, chiropractor, physical_therapy, orthopedic, neurologist, pain_management, primary_care, imaging, surgery_center, or other).

2. PATIENT INFO: Patient name, DOB, account number.

3. SERVICE DETAILS: Date(s) of service, line items with CPT codes, descriptions, amounts. For multi-page bills, combine ALL line items from ALL pages into one list.

4. FINANCIAL SUMMARY: Total charges, insurance payments, adjustments, amount paid, balance due. Use the FINAL totals (not per-page subtotals).

5. DIAGNOSIS: ICD-10 codes if listed.

6. BILL TYPE: facility, physician, radiology, lab, pharmacy, ambulance, or other.

7. DOCUMENT TYPE KEY: Assign the most specific document type key for naming:
   - ER bills: er_facility_bill, er_physician_bill, er_radiology_bill
   - Hospital: hospital_facility_bill, hospital_physician_bill
   - Specialty: chiro_bill, pt_bill, ortho_bill, neuro_bill, pain_mgmt_bill, pcp_bill
   - Other: imaging_bill, surgery_bill, lab_bill, pharmacy_bill, ambulance_bill, medical_bill (fallback)

8. PAGE SPAN: If identifiable, note which pages this bill spans (e.g. "1-3", "4-6").

Be precise with dollar amounts. Use YYYY-MM-DD for dates. If a field is not visible, omit it.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: multiBillSchema,
      },
    });

    const parsed = JSON.parse(response.text || '{"documentStructure":"single_bill","bills":[]}');
    const bills = Array.isArray(parsed.bills) ? parsed.bills : [parsed];
    const documentStructure = parsed.documentStructure || (bills.length > 1 ? "bill_packet" : "single_bill");

    return new Response(
      JSON.stringify({ bills, documentStructure, fileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Bill extraction error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
