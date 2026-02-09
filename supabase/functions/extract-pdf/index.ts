import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    // Decode base64 to binary
    const binaryString = atob(pdf_base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Extract text from PDF by parsing the raw content
    // We look for text between BT (begin text) and ET (end text) operators
    // and also extract readable strings from the PDF stream
    const rawText = new TextDecoder("latin1").decode(bytes);
    
    const extractedTexts: string[] = [];
    
    // Method 1: Extract text from BT...ET blocks (PDF text objects)
    const btEtRegex = /BT\s([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(rawText)) !== null) {
      const block = match[1];
      // Extract text from Tj and TJ operators
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const text = tjMatch[1].replace(/\\([nrt\\()])/g, (_, c) => {
          switch (c) {
            case 'n': return '\n';
            case 'r': return '\r';
            case 't': return '\t';
            default: return c;
          }
        });
        if (text.trim()) extractedTexts.push(text);
      }
      
      // Extract text from TJ arrays
      const tjArrayRegex = /\[(.*?)\]\s*TJ/g;
      let tjArrMatch;
      while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
        const innerRegex = /\(([^)]*)\)/g;
        let innerMatch;
        let lineText = '';
        while ((innerMatch = innerRegex.exec(tjArrMatch[1])) !== null) {
          lineText += innerMatch[1];
        }
        if (lineText.trim()) extractedTexts.push(lineText);
      }
    }

    // Method 2: If BT/ET extraction yields little, try extracting readable strings
    if (extractedTexts.join('').length < 100) {
      // Find stream objects and decode them
      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      while ((match = streamRegex.exec(rawText)) !== null) {
        const streamContent = match[1];
        // Try to find readable ASCII text sequences
        const readableRegex = /[A-Za-z0-9\s.,;:!?()@#$%&*\-+='"\/\\]{10,}/g;
        let readableMatch;
        while ((readableMatch = readableRegex.exec(streamContent)) !== null) {
          const cleaned = readableMatch[0].trim();
          if (cleaned.length > 10 && /[a-zA-Z]{3,}/.test(cleaned)) {
            extractedTexts.push(cleaned);
          }
        }
      }
    }

    // Count approximate pages
    const pageCount = (rawText.match(/\/Type\s*\/Page[^s]/g) || []).length;

    const resultText = extractedTexts.join('\n').trim();

    if (!resultText) {
      return new Response(
        JSON.stringify({
          text: "Kon geen tekst extraheren uit deze PDF. Het bestand bevat mogelijk alleen gescande afbeeldingen. Probeer een PDF met doorzoekbare tekst.",
          pages: pageCount,
          filename: filename || "unknown.pdf",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        text: resultText.slice(0, 50000), // Limit output size
        pages: pageCount,
        filename: filename || "unknown.pdf",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PDF extraction error:", error);
    return new Response(
      JSON.stringify({ error: `Fout bij verwerken PDF: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
