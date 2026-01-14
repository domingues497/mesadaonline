import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth, type Profile } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Heart, Users, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Login flow steps
  const [loginStep, setLoginStep] = useState<'email' | 'member' | 'password'>('email');
  const [familyEmail, setFamilyEmail] = useState('');
  const [familyMembers, setFamilyMembers] = useState<Profile[]>([]);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [password, setPassword] = useState('');

  // Signup form state
  const [signupFamilyEmail, setSignupFamilyEmail] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [phone, setPhone] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Step 1: Search family by email
  const handleSearchFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyEmail) {
      toast({
        title: "Campo obrigatório",
        description: "Digite o email da família.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Search for family with this email
      const { data: family, error: familyError } = await supabase
        .from('families')
        .select('id')
        .eq('email', familyEmail.toLowerCase().trim())
        .maybeSingle();

      if (familyError) throw familyError;

      if (!family) {
        toast({
          title: "Família não encontrada",
          description: "Não existe uma família cadastrada com este email.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', family.id);

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        toast({
          title: "Erro",
          description: "Nenhum membro encontrado para esta família.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setFamilyMembers(members as Profile[]);
      setLoginStep('member');
    } catch (error) {
      console.error('Error searching family:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar família. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Select member
  const handleSelectMember = (member: Profile) => {
    setSelectedMember(member);
    setLoginStep('password');
  };

  // Step 3: Login with password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !selectedMember) {
      toast({
        title: "Campo obrigatório",
        description: "Digite sua senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // Build email: familyEmail + username
    const loginEmail = selectedMember.username 
      ? `${familyEmail.split('@')[0]}+${selectedMember.username}@${familyEmail.split('@')[1]}`
      : familyEmail;

    const { error } = await signIn(loginEmail, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro no login",
        description: error,
        variant: "destructive",
      });
      // Reset to password step to allow retry
      setPassword('');
    }
  };

  // Reset login flow
  const resetLoginFlow = () => {
    setLoginStep('email');
    setFamilyEmail('');
    setFamilyMembers([]);
    setSelectedMember(null);
    setPassword('');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupFamilyEmail || !signupUsername || !signupPassword || !displayName || !familyName) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas são diferentes.",
        variant: "destructive",
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    // Validate username format (only letters, numbers, underscore, dash)
    if (!/^[a-z0-9_-]+$/i.test(signupUsername)) {
      toast({
        title: "Nome de usuário inválido",
        description: "Use apenas letras, números, _ ou -",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    // Create email with username alias: familyemail+username@domain.com
    const emailParts = signupFamilyEmail.toLowerCase().trim().split('@');
    const userEmail = `${emailParts[0]}+${signupUsername.toLowerCase()}@${emailParts[1]}`;

    const { error } = await signUp(
      userEmail, 
      signupPassword, 
      displayName, 
      'parent', 
      familyName, 
      phone,
      signupFamilyEmail.toLowerCase().trim(),
      signupUsername.toLowerCase()
    );
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para confirmar sua conta e acessar o sistema.",
        duration: 6000,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg">
      <Card className="w-full max-w-md gradient-card">
        <CardHeader className="text-center">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl">Tarefas & Mesada</CardTitle>
          <CardDescription>
            Gerencie tarefas e mesadas da sua família
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              {loginStep === 'email' && (
                <form onSubmit={handleSearchFamily} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="family-email">Email da Família</Label>
                    <Input
                      id="family-email"
                      type="email"
                      value={familyEmail}
                      onChange={(e) => setFamilyEmail(e.target.value)}
                      placeholder="familia@email.com"
                      required
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Digite o email cadastrado da sua família
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? <LoadingSpinner /> : "Continuar"}
                  </Button>
                </form>
              )}

              {loginStep === 'member' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetLoginFlow}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <p className="text-sm font-medium">Selecione seu nome</p>
                      <p className="text-xs text-muted-foreground">{familyEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {familyMembers.map((member) => (
                      <Button
                        key={member.id}
                        type="button"
                        variant="outline"
                        className="w-full justify-start h-auto py-3"
                        onClick={() => handleSelectMember(member)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium">{member.display_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {member.role === 'parent' ? 'Pai/Mãe' : 'Filho(a)'}
                            </p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {loginStep === 'password' && selectedMember && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setLoginStep('member');
                        setPassword('');
                        setSelectedMember(null);
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                      <p className="text-sm font-medium">{selectedMember.display_name}</p>
                      <p className="text-xs text-muted-foreground">{familyEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? <LoadingSpinner /> : "Entrar"}
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignup} className="space-y-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Crie o painel da sua família em minutos
                </p>

                <div className="space-y-2">
                  <Label htmlFor="signup-family-email">Email da Família *</Label>
                  <Input
                    id="signup-family-email"
                    type="email"
                    value={signupFamilyEmail}
                    onChange={(e) => setSignupFamilyEmail(e.target.value)}
                    placeholder="familia@email.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Este será o email principal para login
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-username">Nome de Usuário *</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    placeholder="pai, mae, joao..."
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Apenas letras, números, _ ou -
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name">Nome Completo *</Label>
                  <Input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="family-name">Nome da Família *</Label>
                  <Input
                    id="family-name"
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="Ex: Família Silva"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone (opcional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Senha *</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? <LoadingSpinner /> : "Criar Família"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}