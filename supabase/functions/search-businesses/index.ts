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
      ? `Only include results matching: ${query.trim()}.`
      : "";

    const prompt = `List all businesses, stores, restaurants, gas stations, and commercial establishments located within 1000 feet (about 300 meters) of ${location}.

${filterText}

Return ONLY a valid JSON array. Each element must have these exact fields:
- "name": string (business name)
- "address": string (street address only, e.g. "600 E 103rd St")
- "city": string (city name)
- "state": string (2-letter state abbreviation)
- "zip": string (5-digit zip code)
- "types": string array (1-3 business categories like "gas_station", "restaurant", "convenience_store")

Example format:
[{"name":"Shell Gas Station","address":"605 E 103rd St","city":"Chicago","state":"IL","zip":"60628","types":["gas_station"]}]

Return ONLY the JSON array, no other text. Include all nearby businesses you can find.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: {
            temperature: 0.1,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Search service error", results: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const parts = geminiData?.candidates?.[0]?.content?.parts || [];
    const fullText = parts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join("\n");

    console.log("Gemini raw response length:", fullText.length);
    console.log("Gemini raw response:", fullText.substring(0, 500));

    let results: BusinessResult[] = [];

    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          results = parsed
            .filter(
              (item: Record<string, unknown>) =>
                item && typeof item.name === "string" && item.name.trim()
            )
            .map((item: Record<string, unknown>) => ({
              name: String(item.name || "").trim(),
              address: String(item.address || "").trim(),
              city: String(item.city || "").trim(),
              state: String(item.state || "IL").trim(),
              zip: String(item.zip || "").trim(),
              types: Array.isArray(item.types)
                ? item.types.map(String).slice(0, 3)
                : [],
            }));
        }
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);
      }
    }

    if (results.length === 0) {
      results = parseTextFallback(fullText);
    }

    console.log("Returning", results.length, "results");

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("search-businesses error:", error);
    return new Response(
      JSON.stringify({ error: "Internal error", results: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function parseTextFallback(text: string): BusinessResult[] {
  const results: BusinessResult[] = [];
  const blocks = text.split(/\n{2,}|\d+\.\s+/);

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
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
  const state = stateMatch ? stateMatch[1] : "IL";

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
