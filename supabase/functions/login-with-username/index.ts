import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.oncoinfo.be',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { username, password, hospital_id } = await req.json();

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Gebruikersnaam en wachtwoord zijn verplicht.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (username.length > 100 || password.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Ongeldige invoer.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // --- Rate limiting: max 5 attempts per 15 minutes per identifier ---
    const rateLimitIdentifier = `${username.trim().toLowerCase()}:${hospital_id || 'any'}`;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { count: attemptCount } = await supabaseAdmin
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('identifier', rateLimitIdentifier)
      .gte('attempted_at', fifteenMinutesAgo);

    if ((attemptCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: 'Te veel inlogpogingen. Probeer het over 15 minuten opnieuw.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this attempt
    await supabaseAdmin.from('login_attempts').insert({ identifier: rateLimitIdentifier });

    // Look up user by username, optionally filtering by hospital
    let query = supabaseAdmin
      .from('profiles')
      .select('email, hospital_id, user_id, default_language')
      .eq('username', username.trim());

    if (hospital_id) {
      query = query.eq('hospital_id', hospital_id);
    }

    const { data: profileData, error: lookupError } = await query.maybeSingle();

    if (lookupError || !profileData?.email) {
      // Generic error - never reveal whether username exists
      return new Response(
        JSON.stringify({ error: 'Gebruikersnaam of wachtwoord is onjuist.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Attempt sign-in with the looked-up email
    const { data: signInData, error: signInError } = await supabaseAuth.auth.signInWithPassword({
      email: profileData.email,
      password,
    });

    if (signInError || !signInData.session) {
      // Generic error - never reveal whether username exists
      return new Response(
        JSON.stringify({ error: 'Gebruikersnaam of wachtwoord is onjuist.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all hospitals this user is linked to
    const { data: userHospitals } = await supabaseAdmin
      .from('user_hospitals')
      .select('hospital_id, hospitals:hospital_id(id, name, slug, logo_url, is_active)')
      .eq('user_id', signInData.user.id);

    const hospitals = (userHospitals || [])
      .map((uh: any) => uh.hospitals)
      .filter((h: any) => h && h.is_active)
      .map((h: any) => ({ id: h.id, name: h.name, slug: h.slug, logo_url: h.logo_url }));

    // Log login to audit_log with hospital_id
    try {
      await supabaseAdmin.from('audit_log').insert({
        user_id: signInData.user.id,
        username: username.trim(),
        action: 'login',
        entity_type: 'session',
        entity_name: username.trim(),
        hospital_id: profileData.hospital_id || null,
        details: { ip: req.headers.get('x-forwarded-for') || 'unknown', hospital_id: hospital_id || null },
      });
    } catch (logErr) {
      console.error('Audit log error:', logErr);
    }

    // Resolve user language: profile > hospital > nl
    let userLanguage = profileData.default_language || null;
    if (!userLanguage && profileData.hospital_id) {
      const { data: hospLang } = await supabaseAdmin.from('hospitals').select('default_language').eq('id', profileData.hospital_id).maybeSingle();
      userLanguage = hospLang?.default_language || 'nl';
    }
    if (!userLanguage) userLanguage = 'nl';

    // Return session tokens, hospitals, and user language to the client
    return new Response(
      JSON.stringify({
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_in: signInData.session.expires_in,
          token_type: signInData.session.token_type,
        },
        hospitals,
        user_language: userLanguage,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Er is een onverwachte fout opgetreden.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
