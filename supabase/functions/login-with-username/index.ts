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
    const { username, password } = await req.json();

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Gebruikersnaam en wachtwoord zijn verplicht.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Basic input validation
    if (username.length > 100 || password.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Ongeldige invoer.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Service role client for profile lookup (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    // Anon client for auth sign-in (service role doesn't work for signInWithPassword)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

    // Look up email by username server-side (never exposed to client)
    const { data: profileData, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('username', username.trim())
      .maybeSingle();

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
