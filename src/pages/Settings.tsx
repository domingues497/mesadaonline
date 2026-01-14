import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Bell, Shield, Calendar, Users } from 'lucide-react';

interface FamilySettings {
  id: string;
  family_id: string;
  weekly_close_weekday: number;
  penalty_on_miss: boolean;
  reminder_whatsapp: boolean;
}

interface FamilyInfo {
  id: string;
  name: string;
  created_at: string;
}

export default function Settings() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FamilySettings | null>(null);
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);

  useEffect(() => {
    loadSettings();
    loadFamilyInfo();
  }, [profile]);

  const loadSettings = async () => {
    if (!profile?.family_id) return;

    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('family_id', profile.family_id)
        .maybeSingle();

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettings(data as FamilySettings);
      } else {
        // Create default settings if none exist
        const { data: newSettings, error: createError } = await supabase
          .from('settings')
          .insert({
            family_id: profile.family_id,
            weekly_close_weekday: 0, // Sunday
            penalty_on_miss: true,
            reminder_whatsapp: true,
          })
          .select()
          .single();

        if (!createError && newSettings) {
          setSettings(newSettings as FamilySettings);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFamilyInfo = async () => {
    if (!profile?.family_id) return;

    try {
      const { data, error } = await supabase
        .from('families')
        .select('*')
        .eq('id', profile.family_id)
        .single();

      if (!error && data) {
        setFamilyInfo(data as FamilyInfo);
      }
    } catch (error) {
      console.error('Error loading family info:', error);
    }
  };

  const updateSettings = async (updates: Partial<FamilySettings>) => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) {
        toast({
          title: "Erro ao salvar",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setSettings({ ...settings, ...updates });
      toast({
        title: "Configurações salvas!",
        description: "As alterações foram aplicadas com sucesso.",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const getWeekdayLabel = (weekday: number) => {
    const days = [
      'Domingo',
      'Segunda-feira', 
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
    ];
    return days[weekday];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Erro ao carregar configurações</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Configurações</h1>
            <p className="text-muted-foreground">
              Configure as regras e preferências da família
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard'}
          >
            Voltar
          </Button>
        </div>

        {/* Family Information */}
        {familyInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Informações da Família
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <p className="font-medium">{familyInfo.name}</p>
                <p className="text-sm text-muted-foreground">
                  Criada em {new Date(familyInfo.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Configurações Financeiras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="weekday">Dia de fechamento semanal da mesada</Label>
              <Select
                value={settings.weekly_close_weekday.toString()}
                onValueChange={(value) => updateSettings({ weekly_close_weekday: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 7 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {getWeekdayLabel(i)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Dia da semana em que a mesada é creditada automaticamente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Penalty Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Penalidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="penalty">Aplicar penalidades por tarefas perdidas</Label>
                <p className="text-sm text-muted-foreground">
                  Quando habilitado, tarefas não completadas no prazo geram penalidade de 50% do valor
                </p>
              </div>
              <Switch
                id="penalty"
                checked={settings.penalty_on_miss}
                onCheckedChange={(checked) => updateSettings({ penalty_on_miss: checked })}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="whatsapp">Lembretes por WhatsApp</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar lembretes automáticos via WhatsApp (requer configuração adicional)
                </p>
              </div>
              <Switch
                id="whatsapp"
                checked={settings.reminder_whatsapp}
                onCheckedChange={(checked) => updateSettings({ reminder_whatsapp: checked })}
                disabled={saving}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Versão:</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Última atualização:</span>
              <span>Setembro 2025</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Modo:</span>
              <span>Produção</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Administrativas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              Estas ações afetam toda a família. Use com cuidado.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/test-functions'}
                className="justify-start"
              >
                Executar Funções de Teste
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/reports'}
                className="justify-start"
              >
                Ver Relatórios Detalhados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Mobile Navigation */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}