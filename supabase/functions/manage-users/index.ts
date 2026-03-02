import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.oncoinfo.be',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyAdmin(supabase: ReturnType<typeof createClient>, authHeader: string) {
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw { message: 'Unauthorized', status: 401 };
  }

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'super_admin']);

  if (!roleData || roleData.length === 0) {
    throw { message: 'Forbidden: Admin access required', status: 403 };
  }

  return user;
}

async function getAdminHospitalId(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('hospital_id')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.hospital_id || null;
}

async function isSuperAdmin(supabase: ReturnType<typeof createClient>, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'super_admin')
    .maybeSingle();
  return !!data;
}

/**
 * Verify that the target user belongs to the caller's hospital.
 * Super admins are exempt. Throws 403 if isolation is violated.
 */
async function enforceHospitalIsolation(
  supabase: ReturnType<typeof createClient>,
  callerId: string,
  targetUserId: string
): Promise<void> {
  if (await isSuperAdmin(supabase, callerId)) return;

  const callerHospitalId = await getAdminHospitalId(supabase, callerId);
  if (!callerHospitalId) {
    throw { message: 'Uw account is niet aan een ziekenhuis gekoppeld', status: 403 };
  }

  const targetHospitalId = await getAdminHospitalId(supabase, targetUserId);
  if (targetHospitalId !== callerHospitalId) {
    throw { message: 'U heeft geen toegang tot gebruikers van een ander ziekenhuis', status: 403 };
  }
}

async function sendCredentialsEmail(email: string, username: string, password: string, loginUrl: string, hospitalName = 'RZ Tienen', primaryColor = '#6b2d5b', lang = 'nl') {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) throw new Error('RESEND_API_KEY niet geconfigureerd');

  const { Resend } = await import("npm:resend@2.0.0");
  const resend = new Resend(resendApiKey);
  const t = getT(lang);

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${primaryColor}; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">OncoInfo</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">${hospitalName} - Oncologie</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">${t.credentialsTitle}</h2>
        <p style="color: #555; line-height: 1.6;">${t.credentialsBody}</p>
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px;"><strong>${t.credentialsUsername}:</strong> ${username}</p>
          <p style="margin: 0 0 10px;"><strong>${t.credentialsPassword}:</strong> ${password}</p>
          <p style="margin: 0;"><strong>${t.credentialsLogin}:</strong> <a href="${loginUrl}" style="color: ${primaryColor};">${loginUrl}</a></p>
        </div>
        <p style="color: #555; line-height: 1.6;">${t.credentialsSafe}</p>
        <div style="text-align: center; margin-top: 25px;">
          <a href="${loginUrl}" style="background: ${primaryColor}; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500;">${t.credentialsCta}</a>
        </div>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 15px;">${t.autoMessage}</p>
    </div>
  `;

  console.log('Attempting to send credentials email to:', email);
  const result = await resend.emails.send({
    from: 'OncoInfo <admin@oncoinfo.be>',
    to: [email],
    subject: t.credentialsSubject,
    html: htmlContent,
  });

  console.log('Resend result:', JSON.stringify(result));
  if (result.error) {
    console.error('Resend error:', JSON.stringify(result.error));
    throw new Error(`E-mail versturen mislukt: ${result.error.message}`);
  }
  return result;
}

async function sendResetEmail(email: string, username: string, password: string, loginUrl: string, hospitalName = 'OncoInfo', primaryColor = '#6b2d5b', lang = 'nl') {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) throw new Error('RESEND_API_KEY niet geconfigureerd');
  const { Resend } = await import("npm:resend@2.0.0");
  const resend = new Resend(resendApiKey);
  const t = getT(lang);
  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${primaryColor}; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">OncoInfo</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">${hospitalName} - Oncologie</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">${t.resetTitle}</h2>
        <p style="color: #555; line-height: 1.6;">${t.resetBody}</p>
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px;"><strong>${t.credentialsUsername}:</strong> ${username}</p>
          <p style="margin: 0 0 10px;"><strong>${t.credentialsPassword}:</strong> ${password}</p>
          <p style="margin: 0;"><strong>${t.credentialsLogin}:</strong> <a href="${loginUrl}" style="color: ${primaryColor};">${loginUrl}</a></p>
        </div>
        <p style="color: #555; line-height: 1.6;">${t.credentialsSafe}</p>
        <p style="color: #d32f2f; font-weight: 500; line-height: 1.6;">${t.resetWarning}</p>
        <div style="text-align: center; margin-top: 25px;">
          <a href="${loginUrl}" style="background: ${primaryColor}; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500;">${t.credentialsCta}</a>
        </div>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 15px;">${t.autoMessage}</p>
    </div>
  `;
  console.log('Attempting to send reset email to:', email);
  const result = await resend.emails.send({ from: 'OncoInfo <admin@oncoinfo.be>', to: [email], subject: t.resetSubject, html: htmlContent });
  console.log('Resend reset result:', JSON.stringify(result));
  if (result.error) { console.error('Resend error:', JSON.stringify(result.error)); throw new Error(`E-mail versturen mislukt: ${result.error.message}`); }
  return result;
}

async function getCallerUsername(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('username').eq('user_id', userId).maybeSingle();
  return data?.username || null;
}

async function getUserLanguage(supabase: ReturnType<typeof createClient>, userId: string): Promise<string> {
  const { data: profile } = await supabase.from('profiles').select('default_language, hospital_id').eq('user_id', userId).maybeSingle();
  if (profile?.default_language) return profile.default_language;
  if (profile?.hospital_id) {
    const { data: hospital } = await supabase.from('hospitals').select('default_language').eq('id', profile.hospital_id).maybeSingle();
    if (hospital?.default_language) return hospital.default_language;
  }
  return 'nl';
}

const emailTranslations: Record<string, Record<string, string>> = {
  nl: {
    roleChangeSubject: 'OncoInfo - Uw rol en rechten zijn gewijzigd',
    roleChangeTitle: 'Uw rechten zijn gewijzigd',
    roleChangeGreeting: 'Beste',
    roleChangeBody: 'Een beheerder heeft uw rol en/of rechten aangepast in OncoInfo. Uw inloggegevens (gebruikersnaam en wachtwoord) blijven ongewijzigd.',
    roleChangeSection: 'Rolwijziging',
    previousRole: 'Vorige rol',
    newRole: 'Nieuwe rol',
    permissionsTitle: 'Uw huidige bewerkrechten',
    permRight: 'Recht',
    permStatus: 'Status',
    permAdd: 'Therapieën toevoegen',
    permModify: 'Therapieën bewerken',
    permDelete: 'Therapieën verwijderen',
    yes: 'Ja',
    no: 'Nee',
    contactAdmin: 'Bij vragen kunt u contact opnemen met uw beheerder.',
    autoMessage: 'Dit is een automatisch gegenereerd bericht vanuit OncoInfo.',
    credentialsSubject: 'Uw OncoInfo account - Inloggegevens',
    credentialsTitle: 'Welkom bij OncoInfo',
    credentialsBody: 'Er is een account voor u aangemaakt op OncoInfo. Hieronder vindt u uw inloggegevens:',
    credentialsUsername: 'Gebruikersnaam',
    credentialsPassword: 'Wachtwoord',
    credentialsLogin: 'Inloggen',
    credentialsSafe: 'Bewaar deze gegevens veilig en deel ze niet met anderen.',
    credentialsCta: 'Inloggen op OncoInfo',
    resetSubject: 'OncoInfo - Uw wachtwoord is gereset',
    resetTitle: 'Uw OncoInfo inloggegevens',
    resetBody: 'Uw wachtwoord is gereset door een beheerder. Hieronder vindt u uw nieuwe inloggegevens:',
    resetWarning: '⚠️ U wordt bij uw eerstvolgende login gevraagd om een nieuw wachtwoord in te stellen.',
  },
  fr: {
    roleChangeSubject: 'OncoInfo - Votre rôle et vos droits ont été modifiés',
    roleChangeTitle: 'Vos droits ont été modifiés',
    roleChangeGreeting: 'Cher/Chère',
    roleChangeBody: 'Un administrateur a modifié votre rôle et/ou vos droits dans OncoInfo. Vos identifiants de connexion (nom d\'utilisateur et mot de passe) restent inchangés.',
    roleChangeSection: 'Changement de rôle',
    previousRole: 'Rôle précédent',
    newRole: 'Nouveau rôle',
    permissionsTitle: 'Vos droits d\'édition actuels',
    permRight: 'Droit',
    permStatus: 'Statut',
    permAdd: 'Ajouter des thérapies',
    permModify: 'Modifier des thérapies',
    permDelete: 'Supprimer des thérapies',
    yes: 'Oui',
    no: 'Non',
    contactAdmin: 'Pour toute question, veuillez contacter votre administrateur.',
    autoMessage: 'Ceci est un message généré automatiquement par OncoInfo.',
    credentialsSubject: 'Votre compte OncoInfo - Identifiants',
    credentialsTitle: 'Bienvenue sur OncoInfo',
    credentialsBody: 'Un compte a été créé pour vous sur OncoInfo. Voici vos identifiants de connexion :',
    credentialsUsername: 'Nom d\'utilisateur',
    credentialsPassword: 'Mot de passe',
    credentialsLogin: 'Se connecter',
    credentialsSafe: 'Conservez ces informations en lieu sûr et ne les partagez pas.',
    credentialsCta: 'Se connecter à OncoInfo',
    resetSubject: 'OncoInfo - Votre mot de passe a été réinitialisé',
    resetTitle: 'Vos identifiants OncoInfo',
    resetBody: 'Votre mot de passe a été réinitialisé par un administrateur. Voici vos nouveaux identifiants :',
    resetWarning: '⚠️ Lors de votre prochaine connexion, il vous sera demandé de définir un nouveau mot de passe.',
  },
  de: {
    roleChangeSubject: 'OncoInfo - Ihre Rolle und Rechte wurden geändert',
    roleChangeTitle: 'Ihre Rechte wurden geändert',
    roleChangeGreeting: 'Sehr geehrte/r',
    roleChangeBody: 'Ein Administrator hat Ihre Rolle und/oder Rechte in OncoInfo angepasst. Ihre Anmeldedaten (Benutzername und Passwort) bleiben unverändert.',
    roleChangeSection: 'Rollenänderung',
    previousRole: 'Vorherige Rolle',
    newRole: 'Neue Rolle',
    permissionsTitle: 'Ihre aktuellen Bearbeitungsrechte',
    permRight: 'Recht',
    permStatus: 'Status',
    permAdd: 'Therapien hinzufügen',
    permModify: 'Therapien bearbeiten',
    permDelete: 'Therapien löschen',
    yes: 'Ja',
    no: 'Nein',
    contactAdmin: 'Bei Fragen wenden Sie sich bitte an Ihren Administrator.',
    autoMessage: 'Dies ist eine automatisch generierte Nachricht von OncoInfo.',
    credentialsSubject: 'Ihr OncoInfo-Konto - Anmeldedaten',
    credentialsTitle: 'Willkommen bei OncoInfo',
    credentialsBody: 'Für Sie wurde ein Konto bei OncoInfo erstellt. Hier sind Ihre Anmeldedaten:',
    credentialsUsername: 'Benutzername',
    credentialsPassword: 'Passwort',
    credentialsLogin: 'Anmelden',
    credentialsSafe: 'Bewahren Sie diese Daten sicher auf und teilen Sie sie nicht mit anderen.',
    credentialsCta: 'Bei OncoInfo anmelden',
    resetSubject: 'OncoInfo - Ihr Passwort wurde zurückgesetzt',
    resetTitle: 'Ihre OncoInfo-Anmeldedaten',
    resetBody: 'Ihr Passwort wurde von einem Administrator zurückgesetzt. Hier sind Ihre neuen Anmeldedaten:',
    resetWarning: '⚠️ Bei Ihrer nächsten Anmeldung werden Sie aufgefordert, ein neues Passwort festzulegen.',
  },
  en: {
    roleChangeSubject: 'OncoInfo - Your role and permissions have been changed',
    roleChangeTitle: 'Your permissions have been changed',
    roleChangeGreeting: 'Dear',
    roleChangeBody: 'An administrator has changed your role and/or permissions in OncoInfo. Your login credentials (username and password) remain unchanged.',
    roleChangeSection: 'Role change',
    previousRole: 'Previous role',
    newRole: 'New role',
    permissionsTitle: 'Your current editing permissions',
    permRight: 'Permission',
    permStatus: 'Status',
    permAdd: 'Add therapies',
    permModify: 'Edit therapies',
    permDelete: 'Delete therapies',
    yes: 'Yes',
    no: 'No',
    contactAdmin: 'If you have questions, please contact your administrator.',
    autoMessage: 'This is an automatically generated message from OncoInfo.',
    credentialsSubject: 'Your OncoInfo account - Login credentials',
    credentialsTitle: 'Welcome to OncoInfo',
    credentialsBody: 'An account has been created for you on OncoInfo. Here are your login credentials:',
    credentialsUsername: 'Username',
    credentialsPassword: 'Password',
    credentialsLogin: 'Login',
    credentialsSafe: 'Keep these credentials safe and do not share them.',
    credentialsCta: 'Log in to OncoInfo',
    resetSubject: 'OncoInfo - Your password has been reset',
    resetTitle: 'Your OncoInfo credentials',
    resetBody: 'Your password has been reset by an administrator. Here are your new credentials:',
    resetWarning: '⚠️ You will be asked to set a new password upon your next login.',
  },
};

function getT(lang: string): Record<string, string> {
  return emailTranslations[lang] || emailTranslations['nl'];
}
function getRoleLabel(role: string): string {
  switch (role) {
    case 'super_admin': return 'Super Admin';
    case 'admin': return 'Admin';
    case 'apotheker': return 'Apotheker';
    default: return 'Viewer';
  }
}

async function sendRoleChangeEmail(
  recipientEmail: string,
  username: string,
  oldRole: string,
  newRole: string,
  permissions: { can_add: boolean; can_modify: boolean; can_delete: boolean },
  hospitalName = 'OncoInfo',
  primaryColor = '#6b2d5b',
  lang = 'nl'
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) throw new Error('RESEND_API_KEY niet geconfigureerd');

  const { Resend } = await import("npm:resend@2.0.0");
  const resend = new Resend(resendApiKey);
  const t = getT(lang);

  const permRow = (label: string, enabled: boolean) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center;">${enabled ? '✅ ' + t.yes : '❌ ' + t.no}</td></tr>`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${primaryColor}; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">OncoInfo</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">${hospitalName} - Oncologie</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">${t.roleChangeTitle}</h2>
        <p style="color: #555; line-height: 1.6;">${t.roleChangeGreeting} ${username},</p>
        <p style="color: #555; line-height: 1.6;">${t.roleChangeBody}</p>

        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top:0; color: #333; font-size: 16px;">${t.roleChangeSection}</h3>
          <table style="width:100%; border-collapse: collapse;">
            <tr>
              <td style="padding:8px 12px; background: #fee2e2; border-radius: 4px; color: #991b1b;">
                <strong>${t.previousRole}:</strong> ${getRoleLabel(oldRole)}
              </td>
            </tr>
            <tr><td style="padding:4px;"></td></tr>
            <tr>
              <td style="padding:8px 12px; background: #dcfce7; border-radius: 4px; color: #166534;">
                <strong>${t.newRole}:</strong> ${getRoleLabel(newRole)}
              </td>
            </tr>
          </table>
        </div>

        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top:0; color: #333; font-size: 16px;">${t.permissionsTitle}</h3>
          <table style="width:100%; border-collapse: collapse;">
            <thead><tr><th style="text-align:left; padding:6px 12px; border-bottom:2px solid #ddd;">${t.permRight}</th><th style="padding:6px 12px; border-bottom:2px solid #ddd;">${t.permStatus}</th></tr></thead>
            <tbody>
              ${permRow(t.permAdd, permissions.can_add)}
              ${permRow(t.permModify, permissions.can_modify)}
              ${permRow(t.permDelete, permissions.can_delete)}
            </tbody>
          </table>
        </div>

        <p style="color: #555; line-height: 1.6;">${t.contactAdmin}</p>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 15px;">
        ${t.autoMessage}
      </p>
    </div>
  `;

  const result = await resend.emails.send({
    from: 'OncoInfo <admin@oncoinfo.be>',
    to: [recipientEmail],
    subject: t.roleChangeSubject,
    html: htmlContent,
  });

  if (result.error) {
    console.error('Role change email error:', JSON.stringify(result.error));
    throw new Error(`E-mail versturen mislukt: ${result.error.message}`);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization header required' }, 401);
    }

    const adminUser = await verifyAdmin(supabase, authHeader);
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'list': {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const { data: profiles } = await supabase.from('profiles').select('*');
        const { data: roles } = await supabase.from('user_roles').select('*');
        const { data: permissions } = await supabase.from('user_permissions').select('*');
        const { data: hospitals } = await supabase.from('hospitals').select('id, name, branding');

        const hospitalMap = new Map((hospitals || []).map((h: any) => [h.id, { name: h.name, color: h.branding?.primary_color || null }]));

        const callerIsSuperAdmin = await isSuperAdmin(supabase, adminUser.id);
        const callerHospitalId = await getAdminHospitalId(supabase, adminUser.id);

        // Fetch user_hospitals links
        const { data: userHospitalsData } = await supabase.from('user_hospitals').select('user_id, hospital_id');

        const enrichedUsers = users
          .map((u: any) => {
            const profile = profiles?.find((p: any) => p.user_id === u.id);
            const userRoles = roles?.filter((r: any) => r.user_id === u.id).map((r: any) => r.role) || [];
            const perm = permissions?.find((p: any) => p.user_id === u.id);
            const isSA = userRoles.includes('super_admin');
            const hospId = profile?.hospital_id || null;
            // Resolve dedicated nurse name
            const nurseId = profile?.dedicated_nurse_id || null;
            const nurseProfile = nurseId ? profiles?.find((p: any) => p.id === nurseId) : null;
            // Get linked hospitals
            const linkedHospitalIds = (userHospitalsData || [])
              .filter((uh: any) => uh.user_id === u.id)
              .map((uh: any) => uh.hospital_id);
            return {
              id: u.id,
              email: u.email,
              username: profile?.username || null,
              first_name: profile?.first_name || null,
              last_name: profile?.last_name || null,
              function: profile?.function || null,
              discipline: profile?.discipline || null,
              hospital_id: hospId,
              hospital_name: hospId ? (hospitalMap.get(hospId)?.name || null) : null,
              hospital_color: hospId ? (hospitalMap.get(hospId)?.color || null) : null,
              created_at: u.created_at,
              last_sign_in_at: u.last_sign_in_at,
              role: isSA ? 'super_admin' : userRoles.includes('admin') ? 'admin' : userRoles.includes('apotheker') ? 'apotheker' : 'viewer',
              profile_id: profile?.id,
              is_physician: perm?.is_physician ?? false,
              can_add_treatments: perm?.can_add_treatments ?? false,
              can_delete_treatments: perm?.can_delete_treatments ?? false,
              can_modify_treatments: perm?.can_modify_treatments ?? false,
              is_super_admin: isSA,
              dedicated_nurse_id: nurseId,
              dedicated_nurse_name: nurseProfile ? `${nurseProfile.first_name || ''} ${nurseProfile.last_name || ''}`.trim() : null,
              phone_number: profile?.phone_number || null,
              linked_hospital_ids: linkedHospitalIds,
              default_language: profile?.default_language || null,
            };
          })
          // Hide super_admin from non-super-admin callers
          .filter((u: any) => callerIsSuperAdmin || !u.is_super_admin)
          // Hospital admins only see users from their own hospital
          .filter((u: any) => callerIsSuperAdmin || !callerHospitalId || u.hospital_id === callerHospitalId);

        return jsonResponse({ users: enrichedUsers });
      }

      case 'create': {
        const { email, username, password, role, send_email, login_url,
          first_name, last_name, function: userFunction, discipline, hospital_id,
          is_physician, can_add_treatments, can_delete_treatments, can_modify_treatments,
          dedicated_nurse_id, phone_number, default_language } = params;

        if (!email || !username || !password || !role) {
          return jsonResponse({ error: 'email, username, password en role zijn verplicht' }, 400);
        }

        // Create user via Admin API (auto-confirms email)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError) {
          const msg = createError.message?.includes('already been registered')
            ? 'Er bestaat al een gebruiker met dit e-mailadres.'
            : createError.message || 'Fout bij aanmaken gebruiker';
          return jsonResponse({ error: msg }, 400);
        }

        // Set username, name fields and hospital_id in profiles
        const profileData: Record<string, any> = { username };
        if (first_name !== undefined) profileData.first_name = first_name;
        if (last_name !== undefined) profileData.last_name = last_name;
        if (userFunction !== undefined) profileData.function = userFunction;
        if (discipline !== undefined) profileData.discipline = discipline;
        // Assign hospital: use provided hospital_id, or caller's hospital
        const callerHospitalId = await getAdminHospitalId(supabase, adminUser.id);
        const callerIsSuper = await isSuperAdmin(supabase, adminUser.id);
        // Non-super-admins can only create users in their own hospital
        const targetHospitalId = hospital_id || callerHospitalId;
        if (!callerIsSuper && targetHospitalId !== callerHospitalId) {
          return jsonResponse({ error: 'U kunt alleen gebruikers aanmaken in uw eigen ziekenhuis' }, 403);
        }
        profileData.hospital_id = targetHospitalId;
        if (dedicated_nurse_id) profileData.dedicated_nurse_id = dedicated_nurse_id;
        if (phone_number !== undefined) profileData.phone_number = phone_number;
        if (default_language !== undefined) profileData.default_language = default_language;
        await supabase.from('profiles').update(profileData).eq('user_id', newUser.user.id);

        const assignedRole = role === 'super_admin' || role === 'admin' || role === 'apotheker' ? role : 'viewer';

        // Only super_admin callers can assign super_admin role
        if (assignedRole === 'super_admin' && !(await isSuperAdmin(supabase, adminUser.id))) {
          return jsonResponse({ error: 'Alleen super admins kunnen de super admin rol toewijzen' }, 403);
        }

        if (assignedRole !== 'viewer') {
          await supabase.from('user_roles').delete().eq('user_id', newUser.user.id);
          await supabase.from('user_roles').insert({ user_id: newUser.user.id, role: assignedRole });
          await supabase.from('profiles').update({ role: assignedRole === 'super_admin' ? 'admin' : assignedRole }).eq('user_id', newUser.user.id);
        }

        // Create or update permissions
        await supabase.from('user_permissions').upsert({
          user_id: newUser.user.id,
          is_physician: is_physician ?? false,
          can_add_treatments: can_add_treatments ?? false,
          can_delete_treatments: can_delete_treatments ?? false,
          can_modify_treatments: can_modify_treatments ?? false,
        }, { onConflict: 'user_id' });

        // Auto-add primary hospital to user_hospitals
        if (targetHospitalId) {
          await supabase.from('user_hospitals').upsert(
            { user_id: newUser.user.id, hospital_id: targetHospitalId },
            { onConflict: 'user_id,hospital_id' }
          );
        }

        // Send credentials email if requested
        let emailSent = false;
        let emailError = null;
        if (send_email && login_url) {
          try {
            // Fetch hospital branding for email
            const newUserHospitalId = profileData.hospital_id;
            let hName = 'OncoInfo';
            let hColor = '#6b2d5b';
            if (newUserHospitalId) {
              const { data: h } = await supabase.from('hospitals').select('name, branding').eq('id', newUserHospitalId).maybeSingle();
              if (h) {
                hName = h.name;
                hColor = (h.branding as any)?.primary_color || '#6b2d5b';
              }
            }
            const userLang = default_language || (newUserHospitalId ? (await supabase.from('hospitals').select('default_language').eq('id', newUserHospitalId).maybeSingle())?.data?.default_language : null) || 'nl';
            await sendCredentialsEmail(email, username, password, login_url, hName, hColor, userLang);
            emailSent = true;

            // Audit log for email sent
            const callerUsername = await getCallerUsername(supabase, adminUser.id);
            const callerHospId = await getAdminHospitalId(supabase, adminUser.id);
            await supabase.from('audit_log').insert({
              user_id: adminUser.id,
              username: callerUsername,
              action: 'email_sent',
              entity_type: 'user',
              entity_id: newUser.user.id,
              entity_name: username,
              hospital_id: callerHospId,
              details: { email_type: 'credentials', recipient: email },
            });
          } catch (err: any) {
            console.error('Failed to send credentials email:', err);
            emailError = err.message;
          }
        }

        return jsonResponse({
          user: { id: newUser.user.id, email: newUser.user.email, username },
          email_sent: emailSent,
          email_error: emailError,
        });
      }

      case 'update': {
        const { user_id, email, username, password, role, hospital_id,
          first_name, last_name, function: userFunction, discipline,
          is_physician, can_add_treatments, can_delete_treatments, can_modify_treatments,
          dedicated_nurse_id, phone_number, default_language } = params;

        if (!user_id) {
          return jsonResponse({ error: 'user_id is verplicht' }, 400);
        }

        // Enforce hospital isolation
        await enforceHospitalIsolation(supabase, adminUser.id, user_id);

        // Capture old role and permissions BEFORE making changes
        const { data: oldRoleData } = await supabase.from('user_roles').select('role').eq('user_id', user_id);
        const oldRoles = (oldRoleData || []).map((r: any) => r.role);
        const oldRole = oldRoles.includes('super_admin') ? 'super_admin' : oldRoles.includes('admin') ? 'admin' : oldRoles.includes('apotheker') ? 'apotheker' : 'viewer';

        const { data: oldPermData } = await supabase.from('user_permissions').select('*').eq('user_id', user_id).maybeSingle();
        const oldPerms = {
          can_add: oldPermData?.can_add_treatments ?? false,
          can_modify: oldPermData?.can_modify_treatments ?? false,
          can_delete: oldPermData?.can_delete_treatments ?? false,
        };

        // Block modifications to super_admin accounts by non-super-admins
        const callerIsSuper = await isSuperAdmin(supabase, adminUser.id);
        const targetIsSuper = await isSuperAdmin(supabase, user_id);
        if (targetIsSuper && !callerIsSuper) {
          return jsonResponse({ error: 'Het super admin account kan niet worden gewijzigd' }, 403);
        }

        // Prevent self-demotion
        if (user_id === adminUser.id && role === 'viewer') {
          return jsonResponse({ error: 'U kunt uw eigen admin-rol niet verwijderen' }, 400);
        }

        // Update auth user if email or password changed
        const updateData: Record<string, string> = {};
        if (email) updateData.email = email;
        if (password) updateData.password = password;

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, updateData);
          if (updateError) throw updateError;
        }

        // Update profile fields
        const profileUpdate: Record<string, any> = {};
        if (email) profileUpdate.email = email;
        if (username) profileUpdate.username = username;
        if (role) profileUpdate.role = role;
        if (first_name !== undefined) profileUpdate.first_name = first_name;
        if (last_name !== undefined) profileUpdate.last_name = last_name;
        if (userFunction !== undefined) profileUpdate.function = userFunction;
        if (discipline !== undefined) profileUpdate.discipline = discipline || null;
        if (hospital_id !== undefined) {
          // Non-super-admins cannot move users to another hospital
          if (!callerIsSuper && hospital_id !== await getAdminHospitalId(supabase, adminUser.id)) {
            return jsonResponse({ error: 'U kunt gebruikers niet verplaatsen naar een ander ziekenhuis' }, 403);
          }
          profileUpdate.hospital_id = hospital_id;
        }
        if (dedicated_nurse_id !== undefined) profileUpdate.dedicated_nurse_id = dedicated_nurse_id || null;
        if (phone_number !== undefined) profileUpdate.phone_number = phone_number || null;
        if (default_language !== undefined) profileUpdate.default_language = default_language;

        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from('profiles').update(profileUpdate).eq('user_id', user_id);
        }

        // Update role if changed
        if (role) {
          // Only super_admin callers can assign super_admin role
          if (role === 'super_admin' && !callerIsSuper) {
            return jsonResponse({ error: 'Alleen super admins kunnen de super admin rol toewijzen' }, 403);
          }
          await supabase.from('user_roles').delete().eq('user_id', user_id);
          await supabase.from('user_roles').insert({ user_id, role });
        }

        // Update permissions if any provided
        if (is_physician !== undefined || can_add_treatments !== undefined || can_delete_treatments !== undefined || can_modify_treatments !== undefined) {
          const permUpdate: Record<string, boolean> = {};
          if (is_physician !== undefined) permUpdate.is_physician = is_physician;
          if (can_add_treatments !== undefined) permUpdate.can_add_treatments = can_add_treatments;
          if (can_delete_treatments !== undefined) permUpdate.can_delete_treatments = can_delete_treatments;
          if (can_modify_treatments !== undefined) permUpdate.can_modify_treatments = can_modify_treatments;

          // Upsert to handle users that don't have a permissions row yet
          await supabase.from('user_permissions').upsert({
            user_id,
            ...permUpdate,
          }, { onConflict: 'user_id' });
        }

        // Determine new role and permissions after update
        const newRole = role || oldRole;
        const newPerms = {
          can_add: can_add_treatments ?? oldPerms.can_add,
          can_modify: can_modify_treatments ?? oldPerms.can_modify,
          can_delete: can_delete_treatments ?? oldPerms.can_delete,
        };

        // Send role/permissions change email if anything changed
        const roleChanged = newRole !== oldRole;
        const permsChanged = newPerms.can_add !== oldPerms.can_add || newPerms.can_modify !== oldPerms.can_modify || newPerms.can_delete !== oldPerms.can_delete;

        let roleEmailSent = false;
        let roleEmailError = null;
        if (roleChanged || permsChanged) {
          try {
            // Get target user's email and username
            const { data: targetProfile } = await supabase.from('profiles').select('email, username, hospital_id').eq('user_id', user_id).maybeSingle();
            if (targetProfile?.email) {
              let hName = 'OncoInfo';
              let hColor = '#6b2d5b';
              if (targetProfile.hospital_id) {
                const { data: h } = await supabase.from('hospitals').select('name, branding').eq('id', targetProfile.hospital_id).maybeSingle();
                if (h) { hName = h.name; hColor = (h.branding as any)?.primary_color || '#6b2d5b'; }
              }
              const targetLang = await getUserLanguage(supabase, user_id);
              await sendRoleChangeEmail(
                targetProfile.email,
                targetProfile.username || targetProfile.email,
                oldRole,
                newRole,
                newPerms,
                hName,
                hColor,
                targetLang
              );
              roleEmailSent = true;

              // Audit log
              const callerUn = await getCallerUsername(supabase, adminUser.id);
              const callerHospId = await getAdminHospitalId(supabase, adminUser.id);
              await supabase.from('audit_log').insert({
                user_id: adminUser.id,
                username: callerUn,
                action: 'email_sent',
                entity_type: 'user',
                entity_id: user_id,
                entity_name: targetProfile.username || targetProfile.email,
                hospital_id: callerHospId,
                details: { email_type: 'role_change', old_role: oldRole, new_role: newRole, permissions: newPerms },
              });
            }
          } catch (err: any) {
            console.error('Failed to send role change email:', err);
            roleEmailError = err.message;
          }
        }

        return jsonResponse({ success: true, role_email_sent: roleEmailSent, role_email_error: roleEmailError });
      }

      case 'delete': {
        const { user_id } = params;

        if (!user_id) {
          return jsonResponse({ error: 'user_id is verplicht' }, 400);
        }

        if (user_id === adminUser.id) {
          return jsonResponse({ error: 'U kunt uw eigen account niet verwijderen' }, 400);
        }

        // Enforce hospital isolation
        await enforceHospitalIsolation(supabase, adminUser.id, user_id);

        // Block deletion of super_admin account
        if (await isSuperAdmin(supabase, user_id)) {
          return jsonResponse({ error: 'Het super admin account kan niet worden verwijderd' }, 403);
        }

        // Clean up profiles and roles first
        await supabase.from('user_roles').delete().eq('user_id', user_id);
        await supabase.from('profiles').delete().eq('user_id', user_id);

        // Delete auth user
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);
        if (deleteError) throw deleteError;

        return jsonResponse({ success: true });
      }

      case 'send-credentials': {
        const { user_id, email, username, password, login_url } = params;

        if (!email || !password || !login_url) {
          return jsonResponse({ error: 'email, password en login_url zijn verplicht' }, 400);
        }

        // Enforce hospital isolation
        if (user_id) {
          await enforceHospitalIsolation(supabase, adminUser.id, user_id);
        }

        // Also update the password so it matches what we send
        if (user_id) {
          const { error: pwError } = await supabase.auth.admin.updateUserById(user_id, { password });
          if (pwError) throw pwError;
        }

        // Fetch hospital branding for email
        let hName = 'OncoInfo';
        let hColor = '#6b2d5b';
        if (user_id) {
          const { data: profile } = await supabase.from('profiles').select('hospital_id').eq('user_id', user_id).maybeSingle();
          if (profile?.hospital_id) {
            const { data: h } = await supabase.from('hospitals').select('name, branding').eq('id', profile.hospital_id).maybeSingle();
            if (h) { hName = h.name; hColor = (h.branding as any)?.primary_color || '#6b2d5b'; }
          }
        }

        const sendLang = user_id ? await getUserLanguage(supabase, user_id) : 'nl';
        await sendCredentialsEmail(email, username || '', password, login_url, hName, hColor, sendLang);

        // Audit log for email sent
        const callerUsername2 = await getCallerUsername(supabase, adminUser.id);
        const callerHospId2 = await getAdminHospitalId(supabase, adminUser.id);
        await supabase.from('audit_log').insert({
          user_id: adminUser.id,
          username: callerUsername2,
          action: 'email_sent',
          entity_type: 'user',
          entity_id: user_id || null,
          entity_name: username || email,
          hospital_id: callerHospId2,
          details: { email_type: 'credentials', recipient: email },
        });

        return jsonResponse({ success: true, email_sent: true });
      }

      case 'reset-password': {
        const { user_id } = params;

        if (!user_id) {
          return jsonResponse({ error: 'user_id is verplicht' }, 400);
        }

        // Enforce hospital isolation
        await enforceHospitalIsolation(supabase, adminUser.id, user_id);

        // Block reset of super_admin by non-super-admin
        const callerIsSuper2 = await isSuperAdmin(supabase, adminUser.id);
        const targetIsSuper2 = await isSuperAdmin(supabase, user_id);
        if (targetIsSuper2 && !callerIsSuper2) {
          return jsonResponse({ error: 'Wachtwoord van super admin kan niet worden gereset' }, 403);
        }

        // Generate a random password: 12 chars, mixed case + digits + special
        // Each character class is guaranteed to appear at a random position
        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lower = 'abcdefghjkmnpqrstuvwxyz';
        const digits = '23456789';
        const special = '!@#$%';
        const all = upper + lower + digits + special;

        const randomBytes = new Uint8Array(16);
        crypto.getRandomValues(randomBytes);

        // Build 12 fully random chars
        const passwordChars: string[] = Array.from({ length: 12 }, (_, i) =>
          all[randomBytes[i] % all.length]
        );

        // Pick 4 distinct random positions to guarantee one of each class
        const positions = Array.from({ length: 12 }, (_, i) => i)
          .sort((a, b) => randomBytes[12 + (a % 4)] - randomBytes[12 + (b % 4)])
          .slice(0, 4);

        passwordChars[positions[0]] = upper[randomBytes[0] % upper.length];
        passwordChars[positions[1]] = lower[randomBytes[1] % lower.length];
        passwordChars[positions[2]] = digits[randomBytes[2] % digits.length];
        passwordChars[positions[3]] = special[randomBytes[3] % special.length];

        const newPassword = passwordChars.join('');

        // Update password
        const { error: pwError } = await supabase.auth.admin.updateUserById(user_id, { password: newPassword });
        if (pwError) throw pwError;

        // Set password_changed = false to force change on next login
        await supabase.from('profiles').update({ password_changed: false }).eq('user_id', user_id);

        // Get user info for email
        const { data: profile } = await supabase.from('profiles').select('email, username, hospital_id').eq('user_id', user_id).maybeSingle();
        if (!profile?.email) {
          return jsonResponse({ error: 'Gebruikersprofiel niet gevonden' }, 404);
        }

        // Fetch hospital branding
        let hName = 'OncoInfo';
        let hColor = '#6b2d5b';
        if (profile.hospital_id) {
          const { data: h } = await supabase.from('hospitals').select('name, branding').eq('id', profile.hospital_id).maybeSingle();
          if (h) { hName = h.name; hColor = (h.branding as any)?.primary_color || '#6b2d5b'; }
        }

        // Send reset email
        const loginUrl = 'https://www.oncoinfo.be';
        const resetLang = await getUserLanguage(supabase, user_id);
        await sendResetEmail(profile.email, profile.username || '', newPassword, loginUrl, hName, hColor, resetLang);

        // Audit log for password reset + email sent
        const callerUsername = await getCallerUsername(supabase, adminUser.id);
        await supabase.from('audit_log').insert([
          {
            user_id: adminUser.id,
            username: callerUsername,
            action: 'password_reset',
            entity_type: 'user',
            entity_id: user_id,
            entity_name: profile.username || profile.email,
            hospital_id: profile.hospital_id,
            details: { initiated_by: callerUsername },
          },
          {
            user_id: adminUser.id,
            username: callerUsername,
            action: 'email_sent',
            entity_type: 'user',
            entity_id: user_id,
            entity_name: profile.username || profile.email,
            hospital_id: profile.hospital_id,
            details: { email_type: 'password_reset', recipient: profile.email },
          },
        ]);

        return jsonResponse({ success: true, email_sent: true });
      }

      case 'update-hospitals': {
        const { user_id, hospital_ids } = params;
        if (!user_id || !Array.isArray(hospital_ids)) {
          return jsonResponse({ error: 'user_id en hospital_ids zijn verplicht' }, 400);
        }

        // Only super admins can manage hospital links
        if (!(await isSuperAdmin(supabase, adminUser.id))) {
          return jsonResponse({ error: 'Alleen platform admins kunnen ziekenhuiskoppelingen beheren' }, 403);
        }

        // Delete existing links and insert new ones
        await supabase.from('user_hospitals').delete().eq('user_id', user_id);
        if (hospital_ids.length > 0) {
          await supabase.from('user_hospitals').insert(
            hospital_ids.map((hid: string) => ({ user_id, hospital_id: hid }))
          );
        }

        // Ensure primary hospital is in the list
        const { data: prof } = await supabase.from('profiles').select('hospital_id').eq('user_id', user_id).maybeSingle();
        if (prof?.hospital_id && !hospital_ids.includes(prof.hospital_id)) {
          // If primary hospital removed, update to first linked hospital
          if (hospital_ids.length > 0) {
            await supabase.from('profiles').update({ hospital_id: hospital_ids[0] }).eq('user_id', user_id);
          }
        }

        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse({ error: `Onbekende actie: ${action}` }, 400);
    }
  } catch (error: any) {
    console.error('Error in manage-users:', error);
    const status = error.status || 500;
    return jsonResponse({ error: error.message || 'Interne serverfout' }, status);
  }
});
