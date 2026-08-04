import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  // Scoped-access role — see supabase/migrations/20260723130000. Undefined
  // until resolved so callers can distinguish "still checking" from "no".
  isAuditor: boolean | undefined;
  // Whether the authenticated user has ANY recognized Hub role
  // (admin/moderator/auditor). 'client' and 'user' do not count — being
  // authenticated with Supabase Auth is not enough to enter the Hub, since
  // Auth is shared with torii-portal. Undefined until resolved.
  hasAccess: boolean | undefined;
  // Strictly admin (user_roles), not moderator/auditor. Needed for
  // Academia: its academy.* RLS policies gate on profiles.role='admin' via
  // academy.is_portal_admin(), which has no concept of 'moderator' — so the
  // Hub route is gated to this narrower flag instead of hasAccess, to avoid
  // silently-empty screens for a moderator who lacks that profiles.role.
  isAdmin: boolean | undefined;
}

const HUB_ACCESS_ROLES = new Set(['admin', 'moderator', 'auditor']);

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditor, setIsAuditor] = useState<boolean | undefined>(undefined);
  const [hasAccess, setHasAccess] = useState<boolean | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState<boolean | undefined>(undefined);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
    return data.map(r => r.role as string);
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id).then(setProfile);
            fetchRoles(session.user.id).then(roles => {
              setIsAuditor(roles.includes('auditor'));
              setHasAccess(roles.some(r => HUB_ACCESS_ROLES.has(r)));
              setIsAdmin(roles.includes('admin'));
            });
          }, 0);
        } else {
          setProfile(null);
          setIsAuditor(undefined);
          setHasAccess(undefined);
          setIsAdmin(undefined);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
        fetchRoles(session.user.id).then(roles => {
          setIsAuditor(roles.includes('auditor'));
          setHasAccess(roles.some(r => HUB_ACCESS_ROLES.has(r)));
          setIsAdmin(roles.includes('admin'));
        });
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name: name || email,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAuditor(undefined);
    setHasAccess(undefined);
    setIsAdmin(undefined);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!session,
        isAuditor,
        hasAccess,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
