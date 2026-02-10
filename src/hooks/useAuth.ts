import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'viewer';
  password_changed: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApotheker, setIsApotheker] = useState(false);
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

  const checkRoles = useCallback(async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking roles:', error);
      return { admin: false, apotheker: false };
    }
    const roles = (data || []).map((r: any) => r.role);
    return {
      admin: roles.includes('admin'),
      apotheker: roles.includes('apotheker'),
    };
  }, []);

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
          checkRoles(session.user.id).then(r => {
            if (isMounted) {
              setIsAdmin(r.admin);
              setIsApotheker(r.apotheker);
            }
          });
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsApotheker(false);
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
          const [p, r] = await Promise.all([
            fetchProfile(session.user.id),
            checkRoles(session.user.id),
          ]);
          if (isMounted) {
            setProfile(p);
            setIsAdmin(r.admin);
            setIsApotheker(r.apotheker);
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
  }, [fetchProfile, checkRoles]);

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

    // Force reload to clear all component state and redirect to login
    window.location.href = '/';
  };

  return {
    user,
    session,
    profile,
    loading,
    isAdmin,
    isApotheker,
    signIn,
    signUp,
    signOut
  };
}