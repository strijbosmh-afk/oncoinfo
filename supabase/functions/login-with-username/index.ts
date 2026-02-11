import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

    // Look up user by username, optionally filtering by hospital
    let query = supabaseAdmin
      .from('profiles')
      .select('email, hospital_id')
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

    // Return session tokens to the client
    return new Response(
      JSON.stringify({
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_in: signInData.session.expires_in,
          token_type: signInData.session.token_type,
        },
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
