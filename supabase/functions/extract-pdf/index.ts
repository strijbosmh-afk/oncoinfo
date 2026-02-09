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

    // Limit PDF size - base64 over ~1MB (750KB binary) risks timeout
    const MAX_BASE64_LENGTH = 1_400_000;
    const truncated = pdf_base64.length > MAX_BASE64_LENGTH;
    const base64ToSend = truncated ? pdf_base64.slice(0, MAX_BASE64_LENGTH) : pdf_base64;

    console.log(`Processing PDF: ${filename || "unknown.pdf"}, size: ${Math.round(pdf_base64.length / 1024)}KB base64${truncated ? " (truncated)" : ""}`);

    // Use AbortController for timeout (90s to stay within edge function limits)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract ALL text content from this PDF document. Return the complete text preserving structure (headings, paragraphs, tables, lists). Do not summarize - extract the raw text faithfully. Include title, authors, abstract, methods, results, discussion, references. For tables, format as readable text.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64ToSend}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      clearTimeout(timeoutId);

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
            text: "Kon geen tekst extraheren uit deze PDF. Probeer een ander bestand.",
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
          pages: Math.max(1, Math.ceil(extractedText.length / 3000)),
          filename: filename || "unknown.pdf",
          truncated,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") {
        console.error("PDF extraction timed out after 90s");
        return new Response(
          JSON.stringify({ error: "PDF extractie duurde te lang. Probeer een kleiner bestand (max ~10 pagina's)." }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchError;
    }
  } catch (error: unknown) {
    console.error("PDF extraction error:", error);
    const msg = error instanceof Error ? error.message : "Onbekende fout";
    return new Response(
      JSON.stringify({ error: `Fout bij verwerken PDF: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
