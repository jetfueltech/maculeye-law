import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

export type SystemRole = 'admin' | 'manager' | 'member';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_initials: string;
  avatar_url: string | null;
  username: string;
  system_role: SystemRole;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url' | 'avatar_initials'>>) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfile(data as UserProfile | null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setProfile(null);
      if (session?.user) {
        (async () => {
          await fetchProfile(session.user.id);
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string): Promise<{ error: string | null }> => {
    const { data: emailData, error: lookupError } = await supabase.rpc('get_email_by_username', { p_username: username });
    if (lookupError || !emailData) return { error: 'Invalid username or password.' };
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailData, password });
    if (error) return { error: error.message };
    if (data.user) {
      await fetchProfile(data.user.id);
    }
    return { error: null };
  };

  const updateProfile = async (updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url' | 'avatar_initials'>>): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) return { error: error.message };
    await fetchProfile(user.id);
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
