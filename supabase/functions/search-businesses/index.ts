import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PlaceResult {
  displayName?: { text?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  types?: string[];
  addressComponents?: {
    longText?: string;
    shortText?: string;
    types?: string[];
  }[];
}

function parseAddress(place: PlaceResult) {
  const components = place.addressComponents || [];
  const get = (type: string) =>
    components.find((c) => c.types?.includes(type))?.longText || "";
  const getShort = (type: string) =>
    components.find((c) => c.types?.includes(type))?.shortText || "";

  const streetNumber = get("street_number");
  const route = get("route");
  const address = streetNumber ? `${streetNumber} ${route}` : route;
  const city = get("locality") || get("sublocality");
  const state = getShort("administrative_area_level_1");
  const zip = get("postal_code");

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
        JSON.stringify({
          error: "API key not configured",
          results: generateFallbackResults(query, location),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const searchText = `${query || "businesses"} near ${location}`;

    const placesResponse = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.shortFormattedAddress,places.types,places.addressComponents",
        },
        body: JSON.stringify({
          textQuery: searchText,
          maxResultCount: 15,
        }),
      }
    );

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text();
      console.error("Places API error:", errorText);
      return new Response(
        JSON.stringify({
          error: "Search service error",
          results: generateFallbackResults(query, location),
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const placesData = await placesResponse.json();
    const places: PlaceResult[] = placesData.places || [];

    const results = places.map((place) => {
      const parsed = parseAddress(place);
      const displayTypes = (place.types || [])
        .filter(
          (t) =>
            !t.startsWith("point_of_interest") && !t.startsWith("establishment")
        )
        .slice(0, 3);

      return {
        name: place.displayName?.text || "Unknown",
        address: parsed.address || place.shortFormattedAddress || "",
        city: parsed.city || "",
        state: parsed.state || "IL",
        zip: parsed.zip || "",
        types: displayTypes,
      };
    });

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

function generateFallbackResults(query: string, location: string) {
  return [];
}
