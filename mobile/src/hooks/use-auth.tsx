import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Alert } from 'react-native';

export type UserRole = 'parent' | 'child';

export interface Profile {
  id: string;
  family_id: string;
  role: UserRole;
  display_name: string;
  phone?: string;
  username?: string;
  created_at: string;
}

export interface Daughter {
  id: string;
  monthly_allowance_cents: number;
  rewards_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  daughter: Daughter | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, role: UserRole, familyName?: string, phone?: string, familyEmail?: string, username?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  createFamily: (familyName: string, parentDisplayName: string, phone?: string) => Promise<{ error: string | null; familyId?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [daughter, setDaughter] = useState<Daughter | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        const code = (profileError as any).code;
        const message = (profileError as any).message as string | undefined;
        if (code === 'PGRST303' || message?.toLowerCase().includes('jwt expired')) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setProfile(null);
          setDaughter(null);
          Alert.alert('Sessão expirada', 'Por segurança, faça login novamente.');
        }
        return;
      }

      if (!profileData) {
        // Retry logic for potential race conditions during signup
        if (retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return fetchProfile(userId, retryCount + 1);
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId && user.user_metadata?.role === 'parent') {
          const meta = user.user_metadata;
          if (meta.family_name) {
            const { error: rpcError } = await supabase.rpc('create_family_and_parent', {
              family_name: meta.family_name,
              parent_display_name: meta.display_name || '',
              parent_phone: meta.phone || null,
              family_email: meta.family_email || user.email,
              parent_username: meta.username || null
            });

            if (!rpcError) {
              const { data: newProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

              if (newProfile) {
                setProfile(newProfile as Profile);
                return;
              }
            }
          }
        }

        setProfile(null);
        setDaughter(null);
        return;
      }

      setProfile(profileData as Profile);

      if (profileData.role === 'child') {
        const { data: daughterData, error: daughterError } = await supabase
          .from('daughters')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!daughterError && daughterData) {
          setDaughter({
            ...daughterData,
            rewards_enabled: daughterData.rewards_enabled ?? false
          });
        } else {
          setDaughter(null);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => {
          if (mounted) setLoading(false);
        });
      } else {
        if (mounted) setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setDaughter(null);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      Alert.alert('Erro no login', error.message);
      return { error: error.message };
    }
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, displayName: string, role: UserRole, familyName?: string, phone?: string, familyEmail?: string, username?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role,
          family_name: familyName,
          phone,
          family_email: familyEmail,
          username
        }
      }
    });

    if (error) {
      Alert.alert('Erro no cadastro', error.message);
      return { error: error.message };
    }

    // Se o login for automático e tivermos dados para criar a família
    if (data.session && data.user && role === 'parent' && familyName) {
      try {
        const { error: rpcError } = await supabase.rpc('create_family_and_parent', {
          family_name: familyName,
          parent_display_name: displayName,
          parent_phone: phone || null,
          family_email: familyEmail || email,
          parent_username: username || null
        });

        if (rpcError) throw rpcError;
      } catch (err: any) {
        console.error("Erro ao criar estrutura inicial:", err);
        // Não falha o signUp, pois o usuário foi criado. O fetchProfile/auto-fix tentará resolver.
      }
    }

    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setDaughter(null);
  };
  
  const createFamily = async (familyName: string, parentDisplayName: string, phone?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Usuário não autenticado" };

      // Tenta usar RPC primeiro (método preferido e mais seguro)
      const { data, error } = await supabase.rpc('create_family_and_parent', {
        family_name: familyName,
        parent_display_name: parentDisplayName,
        parent_phone: phone
      });

      if (error) {
        console.error("Erro RPC createFamily:", error);
        // Se falhar RPC (ex: não existe), tenta fallback manual (embora possa falhar por RLS)
        // Mas como vimos o erro RLS no insert direto, o RPC é a solução correta.
        return { error: error.message };
      }

      // Refresh profile
      await fetchProfile(user.id);

      return { error: null, familyId: data }; // RPC retorna o ID da família
    } catch (error: any) {
      console.error("Erro ao criar família:", error);
      return { error: error.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, daughter, loading, signIn, signUp, signOut, createFamily }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
