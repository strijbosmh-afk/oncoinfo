import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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

async function sendCredentialsEmail(email: string, username: string, password: string, loginUrl: string, hospitalName = 'RZ Tienen', primaryColor = '#6b2d5b') {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY niet geconfigureerd');
  }

  const { Resend } = await import("npm:resend@2.0.0");
  const resend = new Resend(resendApiKey);

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${primaryColor}; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">OncoInfo</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">${hospitalName} - Oncologie</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Welkom bij OncoInfo</h2>
        <p style="color: #555; line-height: 1.6;">Er is een account voor u aangemaakt op OncoInfo. Hieronder vindt u uw inloggegevens:</p>
        
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px;"><strong>Gebruikersnaam:</strong> ${username}</p>
          <p style="margin: 0 0 10px;"><strong>Wachtwoord:</strong> ${password}</p>
          <p style="margin: 0;"><strong>Inloggen:</strong> <a href="${loginUrl}" style="color: ${primaryColor};">${loginUrl}</a></p>
        </div>

        <p style="color: #555; line-height: 1.6;">Bewaar deze gegevens veilig en deel ze niet met anderen.</p>
        
        <div style="text-align: center; margin-top: 25px;">
          <a href="${loginUrl}" style="background: ${primaryColor}; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500;">Inloggen op OncoInfo</a>
        </div>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 15px;">
        Dit is een automatisch gegenereerd bericht vanuit OncoInfo.
      </p>
    </div>
  `;

  console.log('Attempting to send credentials email to:', email);
  const result = await resend.emails.send({
    from: 'OncoInfo <admin@oncoinfo.be>',
    to: [email],
    subject: 'Uw OncoInfo account - Inloggegevens',
    html: htmlContent,
  });

  console.log('Resend result:', JSON.stringify(result));

  if (result.error) {
    console.error('Resend error:', JSON.stringify(result.error));
    throw new Error(`E-mail versturen mislukt: ${result.error.message}`);
  }

  return result;
}

async function sendResetEmail(email: string, username: string, password: string, loginUrl: string, hospitalName = 'OncoInfo', primaryColor = '#6b2d5b') {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (!resendApiKey) throw new Error('RESEND_API_KEY niet geconfigureerd');

  const { Resend } = await import("npm:resend@2.0.0");
  const resend = new Resend(resendApiKey);

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: ${primaryColor}; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">OncoInfo</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">${hospitalName} - Oncologie</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Uw OncoInfo inloggegevens</h2>
        <p style="color: #555; line-height: 1.6;">Uw wachtwoord is gereset door een beheerder. Hieronder vindt u uw nieuwe inloggegevens:</p>
        
        <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0 0 10px;"><strong>Gebruikersnaam:</strong> ${username}</p>
          <p style="margin: 0 0 10px;"><strong>Wachtwoord:</strong> ${password}</p>
          <p style="margin: 0;"><strong>Inloggen:</strong> <a href="${loginUrl}" style="color: ${primaryColor};">${loginUrl}</a></p>
        </div>

        <p style="color: #555; line-height: 1.6;">Bewaar deze gegevens veilig en deel ze niet met anderen.</p>
        <p style="color: #d32f2f; font-weight: 500; line-height: 1.6;">⚠️ U wordt bij uw eerstvolgende login gevraagd om een nieuw wachtwoord in te stellen.</p>
        
        <div style="text-align: center; margin-top: 25px;">
          <a href="${loginUrl}" style="background: ${primaryColor}; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 500;">Inloggen op OncoInfo</a>
        </div>
      </div>
      <p style="color: #999; font-size: 12px; text-align: center; margin-top: 15px;">
        Dit is een automatisch gegenereerd bericht vanuit OncoInfo.
      </p>
    </div>
  `;

  console.log('Attempting to send reset email to:', email);
  const result = await resend.emails.send({
    from: 'OncoInfo <admin@oncoinfo.be>',
    to: [email],
    subject: 'OncoInfo - Uw wachtwoord is gereset',
    html: htmlContent,
  });

  console.log('Resend reset result:', JSON.stringify(result));

  if (result.error) {
    console.error('Resend error:', JSON.stringify(result.error));
    throw new Error(`E-mail versturen mislukt: ${result.error.message}`);
  }
  return result;
}

async function getCallerUsername(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('username').eq('user_id', userId).maybeSingle();
  return data?.username || null;
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
          dedicated_nurse_id, phone_number } = params;

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
            await sendCredentialsEmail(email, username, password, login_url, hName, hColor);
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
          dedicated_nurse_id, phone_number } = params;

        if (!user_id) {
          return jsonResponse({ error: 'user_id is verplicht' }, 400);
        }

        // Enforce hospital isolation
        await enforceHospitalIsolation(supabase, adminUser.id, user_id);

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

        return jsonResponse({ success: true });
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

        await sendCredentialsEmail(email, username || '', password, login_url, hName, hColor);

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
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
        let newPassword = '';
        const randomBytes = new Uint8Array(12);
        crypto.getRandomValues(randomBytes);
        for (let i = 0; i < 12; i++) {
          newPassword += chars[randomBytes[i] % chars.length];
        }
        // Ensure at least one uppercase, one lowercase, one digit, one special
        newPassword = newPassword.slice(0, 8) + 'A' + 'a' + '3' + '!';

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
        await sendResetEmail(profile.email, profile.username || '', newPassword, loginUrl, hName, hColor);

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
