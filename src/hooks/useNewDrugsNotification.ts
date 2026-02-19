import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NewDrugInfo {
  id: string;
  generic_name: string;
  drug_class: string;
  disease_areas: string[];
  created_at: string;
}

export function useNewDrugsNotification(userId: string | undefined) {
  const [newDrugs, setNewDrugs] = useState<NewDrugInfo[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const checkNewDrugs = async () => {
      setLoading(true);
      try {
        // Fetch user's last login time
        const { data: profile } = await supabase
          .from('profiles')
          .select('last_login_at')
          .eq('user_id', userId)
          .single();

        const lastLogin = profile?.last_login_at;

        // Update last_login_at to now
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', userId);

        // If user has never logged in before, don't show popup
        if (!lastLogin) return;

        // Query drugs created since last login
        const { data: drugs } = await supabase
          .from('drugs')
          .select('id, generic_name, drug_class, disease_areas, created_at')
          .eq('is_archived', false)
          .gt('created_at', lastLogin)
          .order('created_at', { ascending: false });

        if (drugs && drugs.length > 0) {
          setNewDrugs(drugs.map(d => ({
            id: d.id,
            generic_name: d.generic_name,
            drug_class: d.drug_class,
            disease_areas: d.disease_areas || [],
            created_at: d.created_at,
          })));
          setShowPopup(true);
        }
      } catch (err) {
        console.error('Error checking new drugs:', err);
      } finally {
        setLoading(false);
      }
    };

    checkNewDrugs();
  }, [userId]);

  const dismissPopup = () => setShowPopup(false);

  return { newDrugs, showPopup, dismissPopup, loading };
}
