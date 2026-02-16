import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface Hospital {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  branding: {
    primary_color?: string;
    [key: string]: unknown;
  } | null;
  is_active: boolean;
  default_language: string;
  billing_country: string | null;
}

interface HospitalContextType {
  hospital: Hospital | null;
  loading: boolean;
}

const HospitalContext = createContext<HospitalContextType>({
  hospital: null,
  loading: true,
});

export function HospitalProvider({ children }: { children: ReactNode }) {
  const { user, profile, isSuperAdmin, loading: authLoading } = useAuth();
  const { i18n } = useTranslation();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user || !profile?.hospital_id) {
      setHospital(null);
      setLoading(false);
      return;
    }

    const fetchHospital = async () => {
      // Use hospitals_public view to avoid exposing billing data to non-admin users
      const { data, error } = await supabase
        .from('hospitals_public')
        .select('*')
        .eq('id', profile.hospital_id)
        .maybeSingle();

      if (!error && data) {
        const h: Hospital = {
          id: data.id!,
          name: data.name!,
          slug: data.slug!,
          logo_url: data.logo_url,
          branding: data.branding as Hospital['branding'],
          is_active: data.is_active!,
          default_language: data.default_language || 'nl',
          billing_country: null,
        };
        setHospital(h);

        // Set language based on hospital — super admins always stay Dutch
        // Only auto-set if user hasn't manually chosen a language
        const userChoseLanguage = localStorage.getItem('user-chose-language');
        if (!isSuperAdmin && h.default_language && !userChoseLanguage) {
          i18n.changeLanguage(h.default_language);
        }
      }
      setLoading(false);
    };

    fetchHospital();
  }, [user, profile?.hospital_id, authLoading, i18n, isSuperAdmin]);

  return (
    <HospitalContext.Provider value={{ hospital, loading }}>
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospital() {
  return useContext(HospitalContext);
}
