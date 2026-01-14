import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  // Fetch user profile data
  const fetchProfile = async (userId: string) => {
    try {
      console.log('fetchProfile called for userId:', userId);
      
      // Add a small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('Profile fetch result:', { profileData, profileError });

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return;
      }

      if (!profileData) {
        // No profile found - user needs to complete setup
        console.log('No profile found for user:', userId);
        setProfile(null);
        setDaughter(null);
        return;
      }

      console.log('Setting profile:', profileData);
      setProfile(profileData as Profile);

      // If user is a child, fetch daughter data
      if (profileData.role === 'child') {
        const { data: daughterData, error: daughterError } = await supabase
          .from('daughters')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!daughterError && daughterData) {
          setDaughter(daughterData);
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
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, !!session?.user);
        
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only fetch profile if we have a user
        if (session?.user) {
          // Defer Supabase calls with setTimeout to avoid deadlock
          setTimeout(() => {
            if (!mounted) return;
            
            fetchProfile(session.user.id).then(() => {
              // After fetching, check if we need to create family
              supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle()
                .then(({ data: profileCheck }) => {
                  if (!profileCheck && session.user.user_metadata) {
                    const role = session.user.user_metadata.role;
                    const familyName = session.user.user_metadata.family_name;
                    const displayName = session.user.user_metadata.display_name;
                    const phone = session.user.user_metadata.phone;
                    const familyEmail = session.user.user_metadata.family_email;
                    const username = session.user.user_metadata.username;
                    
                    if (role === 'parent' && familyName && familyEmail) {
                      console.log('Creating family after email confirmation...');
                      
                      // Create family with email
                      supabase
                        .from('families')
                        .insert({ 
                          name: familyName,
                          email: familyEmail.toLowerCase().trim()
                        })
                        .select()
                        .single()
                        .then(({ data: newFamily, error: insertFamilyError }) => {
                          if (insertFamilyError) {
                            console.error('Error creating family:', insertFamilyError);
                            return;
                          }

                          // Create profile
                          supabase
                            .from('profiles')
                            .insert({
                              id: session.user.id,
                              family_id: newFamily.id,
                              role: 'parent',
                              display_name: displayName,
                              phone: phone || null,
                              username: username?.toLowerCase() || null,
                            })
                            .then(({ error: profileError }) => {
                              if (profileError) {
                                console.error('Error creating profile:', profileError);
                                return;
                              }

                              // Create settings
                              supabase
                                .from('settings')
                                .insert({ family_id: newFamily.id })
                                .then(() => {
                                  console.log('Family created, refreshing profile...');
                                  // Multiple retries to ensure profile is loaded
                                  let retries = 0;
                                  const maxRetries = 5;
                                  const retryFetch = () => {
                                    fetchProfile(session.user.id).then(() => {
                                      supabase
                                        .from('profiles')
                                        .select('*')
                                        .eq('id', session.user.id)
                                        .maybeSingle()
                                        .then(({ data: checkAgain }) => {
                                          if (!checkAgain && retries < maxRetries) {
                                            retries++;
                                            console.log(`Profile not ready, retry ${retries}/${maxRetries}`);
                                            setTimeout(retryFetch, 1000 * retries);
                                          } else if (checkAgain) {
                                            console.log('Profile loaded successfully!');
                                          }
                                        });
                                    });
                                  };
                                  retryFetch();
                                });
                            });
                        });
                    }
                  }
                });
            });
          }, 0);
        } else {
          setProfile(null);
          setDaughter(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      console.log('Initial session check:', !!session?.user);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          if (mounted) {
            fetchProfile(session.user.id);
          }
        }, 0);
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // Remove profile dependency to avoid infinite loops

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    familyName?: string,
    phone?: string,
    familyEmail?: string,
    username?: string
  ) => {
    try {
      // Redirect to setup page after email confirmation
      const redirectUrl = `${window.location.origin}/setup`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: displayName,
            role: role,
            family_name: familyName,
            phone: phone,
            family_email: familyEmail,
            username: username,
          }
        }
      });

      if (authError) {
        return { error: authError.message };
      }

      if (authData.user && !authData.session) {
        // Email confirmation is enabled - user needs to check their email
        return { error: null };
      }

      // If session exists immediately (email confirmation disabled), create family
      if (role === 'parent' && familyName && familyEmail && authData.session) {
        console.log('Parent signup - creating family...');
        
        // Create family with email
        const { data: newFamily, error: insertFamilyError } = await supabase
          .from('families')
          .insert({ 
            name: familyName,
            email: familyEmail.toLowerCase().trim()
          })
          .select()
          .single();

        if (insertFamilyError) {
          console.error('Error creating family:', insertFamilyError);
          return { error: `Erro ao criar família: ${insertFamilyError.message}` };
        }

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            family_id: newFamily.id,
            role: 'parent',
            display_name: displayName,
            phone: phone || null,
            username: username?.toLowerCase() || null,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          return { error: `Erro ao criar perfil: ${profileError.message}` };
        }

        // Create settings
        await supabase
          .from('settings')
          .insert({ family_id: newFamily.id });

        console.log('Family created successfully');
        
        toast({
          title: "Bem-vindo!",
          description: "Sua família foi configurada com sucesso.",
        });
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Erro inesperado ao criar conta' };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Erro inesperado ao fazer login' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setDaughter(null);
      
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const createFamily = async (familyName: string, parentDisplayName: string, phone?: string) => {
    try {
      console.log('createFamily called with:', { familyName, parentDisplayName, phone });
      console.log('Current user:', user);
      console.log('User ID:', user?.id);

      if (!user?.id) {
        return { error: 'Usuário não autenticado' };
      }

      const { data, error } = await supabase.rpc('create_family_and_parent', {
        family_name: familyName,
        parent_display_name: parentDisplayName,
        parent_phone: phone
      });

      console.log('RPC result:', { data, error });

      if (error) {
        console.error('RPC error:', error);
        return { error: error.message };
      }

      // Refresh profile data with retry logic
      console.log('Attempting to refresh profile...');
      let retries = 0;
      const maxRetries = 5;
      
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (retries + 1))); // Exponential backoff
        await fetchProfile(user.id);
        
        // Check if profile was loaded (we need to get the current state)
        const { data: profileCheck } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileCheck) {
          console.log('Profile successfully loaded after', retries + 1, 'attempts');
          break;
        }
        
        retries++;
        console.log(`Profile not loaded yet, retry ${retries}/${maxRetries}`);
      }

      return { error: null, familyId: data };
    } catch (error: any) {
      console.error('createFamily catch error:', error);
      return { error: error.message || 'Erro ao criar família' };
    }
  };

  const value = {
    user,
    session,
    profile,
    daughter,
    loading,
    signUp,
    signIn,
    signOut,
    createFamily,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}