import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { ArrowLeft, Plus, Copy, Trash2, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Invite {
  id: string;
  token: string;
  display_name: string;
  email: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export default function Invites() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    display_name: '',
    email: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.role === 'parent') {
      loadInvites();
    }
  }, [profile]);

  const loadInvites = async () => {
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites(data || []);
    } catch (error) {
      console.error('Error loading invites:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os convites.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.family_id) {
      toast({
        title: "Erro",
        description: "Família não encontrada.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const token = crypto.randomUUID();
      
      const { error } = await supabase
        .from('invites')
        .insert({
          token,
          family_id: profile.family_id,
          role: 'child',
          display_name: formData.display_name,
          email: formData.email
        });

      if (error) throw error;

      toast({
        title: "Convite criado!",
        description: "O convite foi gerado com sucesso.",
      });

      setFormData({ display_name: '', email: '' });
      setShowForm(false);
      loadInvites();
    } catch (error: any) {
      console.error('Error creating invite:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o convite.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/convite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Link copiado!",
      description: "O link do convite foi copiado para a área de transferência.",
    });
  };

  const deleteInvite = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Convite excluído",
        description: "O convite foi removido com sucesso.",
      });

      loadInvites();
    } catch (error: any) {
      console.error('Error deleting invite:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível excluir o convite.",
        variant: "destructive",
      });
    }
  };

  if (profile?.role !== 'parent') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>
              Apenas pais podem gerenciar convites.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/family')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Convites</h1>
              <p className="text-muted-foreground">
                Gerencie convites para adicionar filhas à família
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Convite
          </Button>
        </div>

        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Criar Novo Convite</CardTitle>
              <CardDescription>
                Gere um link de convite para uma nova filha se cadastrar na família
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generateInvite} className="space-y-4">
                <div>
                  <Label htmlFor="display_name">Nome da Filha</Label>
                  <Input
                    id="display_name"
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    required
                    placeholder="Ex: Maria Silva"
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="Ex: maria@exemplo.com"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Criando...
                      </>
                    ) : (
                      'Criar Convite'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {invites.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="text-muted-foreground">
                  <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum convite criado ainda</p>
                  <p className="text-sm">Clique em "Novo Convite" para começar</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            invites.map((invite) => (
              <Card key={invite.id}>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{invite.display_name}</h3>
                        {invite.used_at && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Usado
                          </span>
                        )}
                        {!invite.used_at && new Date(invite.expires_at) < new Date() && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                            Expirado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{invite.email}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Expira {formatDistanceToNow(new Date(invite.expires_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!invite.used_at && new Date(invite.expires_at) > new Date() && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyInviteLink(invite.token)}
                          className="gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Copiar Link
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteInvite(invite.id)}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      <MobileNav />
    </div>
  );
}