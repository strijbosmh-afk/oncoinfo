import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import i18n from '@/i18n';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  function: string | null;
  role: 'admin' | 'viewer';
  password_changed: boolean;
  created_at: string;
  hospital_id: string | null;
  dedicated_nurse_id: string | null;
  phone_number: string | null;
}

export interface UserPermissions {
  is_physician: boolean;
  can_add_treatments: boolean;
  can_delete_treatments: boolean;
  can_modify_treatments: boolean;
}

export interface UserHospital {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApotheker, setIsApotheker] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [userHospitals, setUserHospitals] = useState<UserHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  }, []);

  const fetchPermissions = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('is_physician, can_add_treatments, can_delete_treatments, can_modify_treatments')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching permissions:', error);
      return null;
    }
    return data as UserPermissions | null;
  }, []);

  const checkRoles = useCallback(async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking roles:', error);
      // Return null so callers can preserve previously-loaded role state
      // instead of incorrectly collapsing the UI on a transient failure.
      return null;
    }
    const roles = (data || []).map((r: any) => r.role);
    return {
      admin: roles.includes('admin'),
      apotheker: roles.includes('apotheker'),
      superAdmin: roles.includes('super_admin'),
    };
  }, []);

  const fetchUserHospitals = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_hospitals')
      .select('hospital_id')
      .eq('user_id', userId);

    if (error || !data) {
      console.error('Error fetching user hospitals:', error);
      return [];
    }

    // Fetch hospital details for each linked hospital
    const hospitalIds = data.map((uh: any) => uh.hospital_id);
    if (hospitalIds.length === 0) return [];

    const { data: hospitals } = await supabase
      .from('hospitals_public')
      .select('id, name, slug, logo_url, is_active')
      .in('id', hospitalIds);

    return (hospitals || [])
      .filter((h: any) => h.is_active)
      .map((h: any) => ({ id: h.id!, name: h.name!, slug: h.slug!, logo_url: h.logo_url }));
  }, []);

  // Auto-logoff after 15 minutes of inactivity
  useEffect(() => {
    if (!user) return;

    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Set flag so login page can show the notice
        sessionStorage.setItem('logged_out_inactivity', 'true');
        signOut();
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    // Listener for ONGOING auth changes (does NOT control loading)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id).then(p => { if (isMounted) setProfile(p); });
          fetchPermissions(session.user.id).then(p => { if (isMounted) setPermissions(p); });
          checkRoles(session.user.id).then(r => {
            if (isMounted) {
              setIsAdmin(r.admin);
              setIsApotheker(r.apotheker);
              setIsSuperAdmin(r.superAdmin);
            }
          });
          fetchUserHospitals(session.user.id).then(h => { if (isMounted) setUserHospitals(h); });
        } else {
          setProfile(null);
          setPermissions(null);
          setIsAdmin(false);
          setIsApotheker(false);
          setIsSuperAdmin(false);
          setUserHospitals([]);
        }
      }
    );

    // INITIAL load (controls loading state)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const [p, r, perm, hospitals] = await Promise.all([
            fetchProfile(session.user.id),
            checkRoles(session.user.id),
            fetchPermissions(session.user.id),
            fetchUserHospitals(session.user.id),
          ]);
          if (isMounted) {
            setProfile(p);
            setIsAdmin(r.admin);
            setIsApotheker(r.apotheker);
            setIsSuperAdmin(r.superAdmin);
            setPermissions(perm);
            setUserHospitals(hospitals);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile, checkRoles, fetchPermissions, fetchUserHospitals]);

  const switchHospital = useCallback(async (hospitalId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ hospital_id: hospitalId })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: i18n.t('common.error'), description: i18n.t('userMgmt.hospitalSwitchError'), variant: 'destructive' });
      return;
    }

    // Reload to refresh all hospital-dependent data
    window.location.reload();
  }, [user, toast]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      toast({
        title: 'Login failed',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
    
    toast({
      title: 'Welcome back!',
      description: 'You have successfully logged in.'
    });
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    
    if (error) {
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive'
      });
      throw error;
    }
    
    toast({
      title: 'Account created!',
      description: 'You can now log in with your credentials.'
    });
  };

  const signOut = async () => {
    // Clear all Supabase auth storage manually to guarantee logout
    const storageKeys = Object.keys(localStorage).filter(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    storageKeys.forEach((key) => localStorage.removeItem(key));

    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // Server signout may fail if session doesn't exist server-side
    }

    // Clear language preference so hospital default applies on next login
    localStorage.removeItem('user-chose-language');

    // Force reload to clear all component state and redirect to login
    window.location.href = '/';
  };

  return {
    user,
    session,
    profile,
    permissions,
    loading,
    isAdmin,
    isApotheker,
    isSuperAdmin,
    userHospitals,
    switchHospital,
    signIn,
    signUp,
    signOut
  };
}
