import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const documentText: string = body.documentText || "";
    const documentTitle: string = body.documentTitle || "Ontslagbrief-sjablonen";
    const hospitalId: string | null = body.hospitalId ?? null;

    if (!documentText || documentText.length < 100) {
      return json({ error: "Document text is leeg of te kort" }, 400);
    }

    // Get profile to verify admin / determine hospital
    const { data: profile } = await supabase.from("profiles")
      .select("hospital_id").eq("user_id", user.id).maybeSingle();

    const { data: roles } = await supabase.from("user_roles")
      .select("role").eq("user_id", user.id);
    const roleSet = new Set((roles || []).map(r => r.role));
    const isSuperAdmin = roleSet.has("super_admin");
    const isAdmin = roleSet.has("admin");

    if (!isSuperAdmin && !isAdmin) return json({ error: "Forbidden" }, 403);

    const targetHospitalId = isSuperAdmin && hospitalId === null
      ? null
      : (profile?.hospital_id ?? null);

    // Call Gemini to extract structured templates
    const prompt = `Je bent een medische tekstparser. Onderstaande tekst bevat standaardteksten voor ontslagbrieven in de oncologie, gegroepeerd per ziektebeeld/discipline.

Extraheer ELKE individuele standaardtekst (begint typisch met "Ter info:" of een sectietitel) en groepeer per discipline (hoofdstuktitel zoals "Borstkanker", "Prostaatkanker", "Urotheelcarcinoom", enz.).

Retourneer ENKEL valide JSON in dit exacte formaat:
{
  "templates": [
    {
      "discipline": "Borstkanker",
      "title": "EC dose-dense gevolgd door paclitaxel — adjuvant",
      "content": "Ter info: EC dose-dense gevolgd door paclitaxel — adjuvant\n---\n\nVolledige tekst van het sjabloon, inclusief 'Verwachte nevenwerkingen' en 'Indicaties tot verwijzing'."
    }
  ]
}

Regels:
- discipline = de hoofdstuktitel waar de tekst onder valt (zonder nummer, bv "Borstkanker" niet "1. Borstkanker")
- title = de naam na "Ter info:" (zonder de woorden "Ter info:")
- content = MOET ALTIJD beginnen met de volledige "Ter info:"-titelregel (bv "Ter info: EC dose-dense gevolgd door paclitaxel — adjuvant"), gevolgd door een onderstreping op een eigen regel met "---", daarna een lege regel, en daarna de volledige inhoud die bij dit sjabloon hoort (beschrijving + nevenwerkingen + verwijscriteria), behoud bullets met "•" of "-", behoud paragrafen met dubbele newlines
- Neem de "Ter info:"-regel en de "---"-onderstreping ALTIJD op bovenaan de content, ook al staat de onderstreping niet expliciet in de brontekst
- Geen markdown headers (##, ###) in content
- Geen toelichting buiten de JSON

TEKST:
${documentText.slice(0, 60000)}`;

    console.log(`Extracting templates: textLength=${documentText.length}, title=${documentTitle}`);
    const aiStart = Date.now();
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    console.log(`AI response in ${Date.now() - aiStart}ms, status=${aiResp.status}`);

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) return json({ error: "Rate limit. Probeer later opnieuw." }, 429);
      if (aiResp.status === 402) return json({ error: "AI credits uitgeput." }, 402);
      return json({ error: "AI extractie mislukt" }, 500);
    }

    const aiData = await aiResp.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: { templates?: Array<{ discipline: string; title: string; content: string }> };
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON from text
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { templates: [] };
    }

    const templates = (parsed.templates || []).filter(t =>
      t.discipline && t.title && t.content
    );

    if (templates.length === 0) {
      return json({ error: "Geen sjablonen kunnen extraheren uit dit document." }, 400);
    }

    // Use service role to do the destructive replace atomically
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Delete existing doc (cascades templates) for this hospital scope
    if (targetHospitalId === null) {
      await adminClient.from("discharge_letter_documents").delete().is("hospital_id", null);
    } else {
      await adminClient.from("discharge_letter_documents").delete().eq("hospital_id", targetHospitalId);
    }

    const { data: doc, error: docErr } = await adminClient
      .from("discharge_letter_documents")
      .insert({
        hospital_id: targetHospitalId,
        document_title: documentTitle,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docErr || !doc) {
      console.error("Insert doc error:", docErr);
      return json({ error: "Kon document niet opslaan" }, 500);
    }

    const rows = templates.map((t, idx) => ({
      document_id: doc.id,
      hospital_id: targetHospitalId,
      discipline: t.discipline.trim(),
      title: t.title.trim(),
      content: t.content.trim(),
      display_order: idx,
    }));

    const { error: tplErr } = await adminClient
      .from("discharge_letter_templates")
      .insert(rows);

    if (tplErr) {
      console.error("Insert templates error:", tplErr);
      return json({ error: "Kon sjablonen niet opslaan" }, 500);
    }

    return json({
      success: true,
      document: doc,
      count: rows.length,
      disciplines: [...new Set(rows.map(r => r.discipline))],
    });
  } catch (e) {
    console.error("Function error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
