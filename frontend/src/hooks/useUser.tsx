'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface UserProfile {
  full_name: string;
  role: string;
  garage_id: string;
}

interface UserContextType {
  userId: string | null;
  garageId: string | null;
  userRole: string | null;
  loading: boolean;
  userName: string | null;
  userProfile: UserProfile | null;
}

const UserContext = createContext<UserContextType>({
  userId: null,
  garageId: null,
  userRole: null,
  loading: true,
  userName: null,
  userProfile: null,
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [garageId, setGarageId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initUser() {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUserId(session.user.id);

        const { data: userDoc } = await supabase
          .from('users')
          .select('garage_id, role, full_name')
          .eq('id', session.user.id)
          .maybeSingle();

        if (userDoc) {
          setGarageId(userDoc.garage_id);
          setUserRole(userDoc.role);
          setUserName(userDoc.full_name || session.user.email?.split('@')[0] || 'User');
          setUserProfile(userDoc);
        }
      }
      setLoading(false);
    }

    initUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setUserId(session.user.id);
        initUser();
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setGarageId(null);
        setUserRole(null);
        setUserName(null);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ userId, garageId, userRole, loading, userName, userProfile }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
