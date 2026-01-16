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

  const fetchProfile = async (userId: string) => {
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
        // Auto-correção: Se não tiver perfil mas tiver metadados de pai, tenta criar
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id === userId && user.user_metadata?.role === 'parent') {
          const meta = user.user_metadata;
          // Verifica se tem dados mínimos para criar família (nome da família)
          // Se o usuário veio do fluxo mobile antigo, talvez não tenha family_name no metadata se o signUp não salvou.
          // Mas vamos assumir que o signUp vai salvar daqui pra frente.
          // Para o usuário atual, se o signUp antigo não salvou family_name no metadata, não temos como recuperar.
          // O signUp antigo salvava: display_name, role. Só.
          // O código antigo: options: { data: { display_name: displayName, role } }
          // Então o usuário atual NÃO TEM family_name no metadata. Ferrou.
          
          // Se não tiver family_name, não dá pra criar família.
          // Mas o usuário digitou isso no form. Perdeu-se.
          
          // Solução de contorno para o usuário atual: 
          // Se ele tentar logar e cair aqui, e não tiver family_name, ele vai ter que sair e criar conta de novo (com o signUp novo).
          // Ou podemos permitir que ele preencha os dados de novo? Não, a UI não suporta isso agora.
          
          // Vamos implementar o fix para futuros e para quem tiver metadados.
          if (meta.family_name) {
             const { data: family, error: famError } = await supabase
              .from('families')
              .insert({ name: meta.family_name, email: meta.family_email || user.email })
              .select()
              .single();
             
             if (!famError && family) {
               await supabase.from('profiles').insert({
                 id: userId,
                 family_id: family.id,
                 role: 'parent',
                 display_name: meta.display_name,
                 phone: meta.phone,
                 username: meta.username
               });
               await supabase.from('settings').insert({ family_id: family.id });
               
               // Busca novamente
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(() => setLoading(false));
      } else {
        setProfile(null);
        setDaughter(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
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
        const { data: family, error: famError } = await supabase
          .from('families')
          .insert({ name: familyName, email: familyEmail || email })
          .select()
          .single();
        
        if (famError) throw famError;

        const { error: profError } = await supabase.from('profiles').insert({
          id: data.user.id,
          family_id: family.id,
          role: 'parent',
          display_name: displayName,
          phone: phone || null,
          username: username || null,
        });

        if (profError) throw profError;

        await supabase.from('settings').insert({ family_id: family.id });
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
