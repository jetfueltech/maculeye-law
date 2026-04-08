import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BusinessResult {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  types: string[];
}

async function callGemini(
  apiKey: string,
  prompt: string,
  useGrounding: boolean
): Promise<string> {
  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 },
  };

  if (useGrounding) {
    body.tools = [{ google_search: {} }];
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini ${res.status}: ${errText.substring(0, 300)}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts
    .filter((p: { text?: string }) => p.text)
    .map((p: { text: string }) => p.text)
    .join("\n");
}

function extractResults(text: string): BusinessResult[] {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (item: Record<string, unknown>) =>
              item && typeof item.name === "string" && item.name.trim()
          )
          .map((item: Record<string, unknown>) => ({
            name: String(item.name || "").trim(),
            address: String(item.address || "").trim(),
            city: String(item.city || "").trim(),
            state: String(item.state || "").trim(),
            zip: String(item.zip || "").trim(),
            types: Array.isArray(item.types)
              ? item.types.map(String).slice(0, 3)
              : [],
          }));
      }
    } catch {
      console.error("JSON parse failed, trying text fallback");
    }
  }

  return parseTextFallback(text);
}

function parseTextFallback(text: string): BusinessResult[] {
  const results: BusinessResult[] = [];
  const blocks = text.split(/\n{2,}|\d+\.\s+/);

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) continue;

    let name = "";
    let address = "";

    for (const line of lines) {
      const cleaned = line.replace(/\*\*/g, "").replace(/^[-*]\s*/, "");

      const nameMatch = cleaned.match(/^(?:Name|Business):?\s*(.+)/i);
      if (nameMatch) {
        name = nameMatch[1].trim();
        continue;
      }

      const addrMatch = cleaned.match(/^Address:?\s*(.+)/i);
      if (addrMatch) {
        address = addrMatch[1].trim();
        continue;
      }

      if (!name && cleaned.length > 2 && !cleaned.includes(":")) {
        name = cleaned;
      } else if (name && !address && /\d/.test(cleaned)) {
        address = cleaned;
      }
    }

    if (name && address) {
      const parsed = splitAddress(address);
      results.push({
        name,
        address: parsed.street,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        types: [],
      });
    }
  }

  return results;
}

function splitAddress(full: string): {
  street: string;
  city: string;
  state: string;
  zip: string;
} {
  const zipMatch = full.match(/(\d{5})(?:-\d{4})?/);
  const zip = zipMatch ? zipMatch[1] : "";

  const stateMatch = full.match(/,\s*([A-Z]{2})\s/);
  const state = stateMatch ? stateMatch[1] : "";

  const parts = full.split(",").map((p) => p.trim());
  const street = parts[0] || "";
  let city = "";
  if (parts.length >= 3) {
    city = parts[parts.length - 2]
      .replace(/\s+[A-Z]{2}\s*\d{5}.*$/, "")
      .trim();
  } else if (parts.length === 2) {
    city = parts[1].replace(/\s+[A-Z]{2}\s*\d{5}.*$/, "").trim();
  }

  return { street, city, state, zip };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { query, location } = await req.json();

    if (!location) {
      return new Response(
        JSON.stringify({ error: "Location is required", results: [] }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key not configured", results: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const filterText = query?.trim()
      ? `Only include results that match this filter: "${query.trim()}".`
      : "";

    const prompt = `You are a local business directory assistant. List all real businesses, stores, restaurants, gas stations, and commercial establishments located within 1000 feet (about 300 meters / one city block) of this address: ${location}

${filterText}

Think about what is at this intersection and the surrounding blocks. Include businesses on both sides of the street and around nearby corners.

You MUST respond with ONLY a JSON array. No other text before or after. Each element must have exactly these fields:
{
  "name": "Business Name",
  "address": "123 Main St",
  "city": "Chicago",
  "state": "IL",
  "zip": "60628",
  "types": ["gas_station"]
}

Rules:
- Include the full street address, city, state abbreviation, and 5-digit zip code
- types should be 1-3 lowercase categories with underscores (e.g. gas_station, restaurant, convenience_store, auto_repair, grocery_store, church, school, bank, pharmacy, fast_food)
- Only include real businesses that actually exist at these addresses
- Return at least 5-10 results if possible`;

    let fullText = "";

    try {
      console.log("Trying Gemini with Google Search grounding...");
      fullText = await callGemini(apiKey, prompt, true);
      console.log("Grounded response length:", fullText.length);
    } catch (groundingErr) {
      console.log(
        "Grounding failed, falling back to plain Gemini:",
        String(groundingErr).substring(0, 200)
      );
      fullText = await callGemini(apiKey, prompt, false);
      console.log("Plain response length:", fullText.length);
    }

    console.log("Raw response preview:", fullText.substring(0, 400));

    const results = extractResults(fullText);
    console.log("Parsed", results.length, "results");

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("search-businesses error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal error",
        results: [],
        debug: String(error).substring(0, 200),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
