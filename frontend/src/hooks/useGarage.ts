'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useGarage() {
  const [garageId, setGarageId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSession() {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        console.error("Auth Error:", authError.message);
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUserId(session.user.id);
        console.log("Logged in as:", session.user.email, "ID:", session.user.id);
        
        const { data: userDoc, error: docError } = await supabase
          .from('users')
          .select('garage_id, role')
          .eq('id', session.user.id)
          .maybeSingle(); // Use maybeSingle to avoid 406 errors
          
        if (docError) {
          console.error("User Profile Error:", docError.message);
        }

        if (userDoc) {
          console.log("User Profile Found:", userDoc);
          setGarageId(userDoc.garage_id);
          setUserRole(userDoc.role);
        } else {
          console.warn("No profile found in public.users for this ID.");
          // Fallback for first-time login if needed
        }
      } else {
        console.warn("No active session found.");
      }
      setLoading(false);
    }
    
    getSession();
  }, []);

  return { garageId, userRole, userId, loading };
}
