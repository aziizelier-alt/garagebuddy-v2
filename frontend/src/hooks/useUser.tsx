'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserContextType {
  user: User | null;
  userId: string | null;
  userName: string | null;
  userRole: 'admin' | 'mechanic' | 'guest' | null;
  garageId: string | null;
  userProfile: any | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'mechanic' | 'guest' | null>(null);
  const [garageId, setGarageId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sessionUser: User) => {
    const { data: userDoc } = await supabase
      .from('users')
      .select('*')
      .eq('id', sessionUser.id)
      .single();

    if (userDoc) {
      setGarageId(userDoc.garage_id);
      setUserRole(userDoc.role);
      setUserName(userDoc.full_name || sessionUser.email?.split('@')[0] || 'User');
      setUserProfile(userDoc);
    } else {
      setUserRole('guest');
      setUserName(sessionUser.email?.split('@')[0] || 'New User');
      setGarageId(null);
      setUserProfile(null);
    }
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setGarageId(null);
        setUserRole(null);
        setUserName(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      userId: user?.id ?? null, 
      userName, 
      userRole, 
      garageId, 
      userProfile, 
      loading,
      refreshProfile
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
