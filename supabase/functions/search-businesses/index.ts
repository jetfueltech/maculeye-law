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

function parseGeminiResponse(text: string): BusinessResult[] {
  const results: BusinessResult[] = [];
  const lines = text.split("\n").filter((l) => l.trim());

  let current: Partial<BusinessResult> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    const nameMatch = trimmed.match(/^(?:\d+[\.\)]\s*)?(?:\*\*)?Name(?:\*\*)?:\s*(.+?)(?:\*\*)?$/i);
    if (nameMatch) {
      if (current?.name && current?.address) {
        results.push(finalize(current));
      }
      current = { name: nameMatch[1].replace(/\*\*/g, "").trim(), types: [] };
      continue;
    }

    if (!current) continue;

    const addressMatch = trimmed.match(/^(?:\*\*)?Address(?:\*\*)?:\s*(.+?)$/i);
    if (addressMatch) {
      const full = addressMatch[1].replace(/\*\*/g, "").trim();
      const parsed = parseFullAddress(full);
      current.address = parsed.address;
      current.city = parsed.city;
      current.state = parsed.state;
      current.zip = parsed.zip;
      continue;
    }

    const typeMatch = trimmed.match(/^(?:\*\*)?Type(?:s)?(?:\*\*)?:\s*(.+?)$/i);
    if (typeMatch) {
      current.types = typeMatch[1]
        .replace(/\*\*/g, "")
        .split(/[,;]/)
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, "_"))
        .filter(Boolean);
      continue;
    }
  }

  if (current?.name && current?.address) {
    results.push(finalize(current));
  }

  return results;
}

function finalize(partial: Partial<BusinessResult>): BusinessResult {
  return {
    name: partial.name || "Unknown",
    address: partial.address || "",
    city: partial.city || "",
    state: partial.state || "IL",
    zip: partial.zip || "",
    types: (partial.types || []).slice(0, 3),
  };
}

function parseFullAddress(full: string): {
  address: string;
  city: string;
  state: string;
  zip: string;
} {
  const zipMatch = full.match(/(\d{5})(?:-\d{4})?/);
  const zip = zipMatch ? zipMatch[1] : "";

  const stateMatch = full.match(
    /,\s*([A-Z]{2})\s*\d{0,5}/
  );
  const state = stateMatch ? stateMatch[1] : "IL";

  const parts = full.split(",").map((p) => p.trim());
  const address = parts[0] || "";
  const city = parts.length >= 3 ? parts[parts.length - 2].replace(/\s+[A-Z]{2}\s*\d{5}.*$/, "").trim() : parts[1]?.replace(/\s+[A-Z]{2}\s*\d{5}.*$/, "").trim() || "";

  return { address, city, state, zip };
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

    const searchTerm = query?.trim() || "businesses";
    const prompt = `Find up to 15 real ${searchTerm} near ${location}. For each result provide EXACTLY this format with no extra text:

Name: [business name]
Address: [full street address, city, state zip]
Types: [category1, category2]

Only include real businesses with real addresses. Do not make up any results.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Search service error", results: [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiResponse.json();
    const textParts =
      geminiData?.candidates?.[0]?.content?.parts || [];
    const fullText = textParts
      .filter((p: { text?: string }) => p.text)
      .map((p: { text: string }) => p.text)
      .join("\n");

    const results = parseGeminiResponse(fullText);

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
