import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface InviteData {
  id: string;
  token: string;
  family_id: string;
  role: string;
  display_name: string;
  email: string;
  expires_at: string;
  used_at: string | null;
}

export default function InviteSignup() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      // Se já está logado, redireciona para o dashboard
      navigate('/dashboard');
      return;
    }
    
    if (token) {
      loadInvite();
    }
  }, [token, user, navigate]);

  const loadInvite = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Convite não encontrado",
          description: "Este convite não existe ou foi removido.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      if (data.used_at) {
        toast({
          title: "Convite já usado",
          description: "Este convite já foi utilizado.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        toast({
          title: "Convite expirado",
          description: "Este convite expirou. Solicite um novo convite.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      setInvite(data);
      setFormData(prev => ({ ...prev, email: data.email }));
    } catch (error: any) {
      console.error('Error loading invite:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o convite.",
        variant: "destructive",
      });
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invite) return;

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Criar conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            display_name: invite.display_name,
            role: invite.role,
            family_id: invite.family_id
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Falha ao criar usuário');
      }

      // 2. Criar profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          family_id: invite.family_id,
          role: invite.role,
          display_name: invite.display_name
        });

      if (profileError) throw profileError;

      // 3. Se for filha, criar registro em daughters
      if (invite.role === 'child') {
        const { error: daughterError } = await supabase
          .from('daughters')
          .insert({
            id: authData.user.id,
            monthly_allowance_cents: 0,
            rewards_enabled: true
          });

        if (daughterError) throw daughterError;
      }

      // 4. Marcar convite como usado
      const { error: updateError } = await supabase
        .from('invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id);

      if (updateError) throw updateError;

      toast({
        title: "Conta criada com sucesso!",
        description: authData.session 
          ? "Você foi logado automaticamente."
          : "Verifique seu e-mail para confirmar sua conta.",
      });

      if (authData.session) {
        navigate('/dashboard');
      } else {
        navigate('/auth');
      }

    } catch (error: any) {
      console.error('Error during signup:', error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle>Convite Inválido</CardTitle>
            <CardDescription>
              Este convite não é válido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
            >
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UserPlus className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle>Bem-vinda à Família!</CardTitle>
          <CardDescription>
            Você foi convidada para se juntar à família como <strong>{invite.display_name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                readOnly
                className="bg-muted"
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Crie uma senha (min. 6 caracteres)"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                placeholder="Confirme sua senha"
              />
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Criando conta...
                </>
              ) : (
                'Criar Minha Conta'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{' '}
              <button
                onClick={() => navigate('/auth')}
                className="text-primary hover:underline"
              >
                Fazer login
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}