import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
  const { user, profile, loading: authLoading } = useAuth();
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
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', profile.hospital_id)
        .maybeSingle();

      if (!error && data) {
        setHospital({
          id: data.id,
          name: data.name,
          slug: data.slug,
          logo_url: data.logo_url,
          branding: data.branding as Hospital['branding'],
          is_active: data.is_active,
        });
      }
      setLoading(false);
    };

    fetchHospital();
  }, [user, profile?.hospital_id, authLoading]);

  return (
    <HospitalContext.Provider value={{ hospital, loading }}>
      {children}
    </HospitalContext.Provider>
  );
}

export function useHospital() {
  return useContext(HospitalContext);
}
