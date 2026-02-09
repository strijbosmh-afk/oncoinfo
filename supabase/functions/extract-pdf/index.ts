const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdf_base64, filename } = await req.json();

    if (!pdf_base64) {
      return new Response(
        JSON.stringify({ error: "Geen PDF data ontvangen" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing PDF: ${filename || "unknown.pdf"}, base64 length: ${pdf_base64.length}`);

    // Use Gemini Flash to extract text from the PDF via vision
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text content from this PDF document. Return the complete text as-is, preserving the structure (headings, paragraphs, tables, lists). Do not summarize or interpret - just extract the raw text faithfully. If there are tables, format them as readable text. Include all sections: title, authors, abstract, methods, results, discussion, references, etc.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdf_base64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken, probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Krediet op, voeg tegoed toe aan je workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("PDF extractie via AI mislukt");
    }

    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";

    if (!extractedText || extractedText.length < 20) {
      return new Response(
        JSON.stringify({
          text: "Kon geen tekst extraheren uit deze PDF.",
          pages: 0,
          filename: filename || "unknown.pdf",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Extracted ${extractedText.length} chars from PDF`);

    return new Response(
      JSON.stringify({
        text: extractedText.slice(0, 50000),
        pages: Math.max(1, Math.ceil(extractedText.length / 3000)), // Approximate page count
        filename: filename || "unknown.pdf",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("PDF extraction error:", error);
    const msg = error instanceof Error ? error.message : "Onbekende fout";
    return new Response(
      JSON.stringify({ error: `Fout bij verwerken PDF: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
