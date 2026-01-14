import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { Play, Calendar, AlertTriangle, DollarSign } from 'lucide-react';

export default function TestFunctions() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<{[key: string]: any}>({});

  const runFunction = async (functionName: string, payload = {}) => {
    setLoading(functionName);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload
      });

      if (error) {
        toast({
          title: `Erro em ${functionName}`,
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      setResults(prev => ({ ...prev, [functionName]: data }));
      
      toast({
        title: `${functionName} executado!`,
        description: data.message || 'Função executada com sucesso',
      });
    } catch (error: any) {
      toast({
        title: "Erro inesperado",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Funções do Sistema</h1>
            <p className="text-muted-foreground">
              Teste as rotinas automáticas do sistema
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard'}
          >
            Voltar ao Dashboard
          </Button>
        </div>

        {/* Test Functions */}
        <div className="grid gap-6">
          {/* Seed Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-primary" />
                Criar Tarefas de Exemplo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Cria tarefas de exemplo para testar o sistema (arrumar cama, lavar louça, etc.)
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => runFunction('seed-tasks')}
                  disabled={loading === 'seed-tasks'}
                >
                  {loading === 'seed-tasks' ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Criar Tarefas
                    </>
                  )}
                </Button>
              </div>
              {results['seed-tasks'] && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Resultado:</strong> {results['seed-tasks'].message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Task Instances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Criar Instâncias de Tarefas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Gera instâncias de tarefas recorrentes para os próximos dias. 
                Esta função normalmente roda automaticamente todos os dias.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => runFunction('create-task-instances')}
                  disabled={loading === 'create-task-instances'}
                >
                  {loading === 'create-task-instances' ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Executar
                    </>
                  )}
                </Button>
              </div>
              {results['create-task-instances'] && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Resultado:</strong> {results['create-task-instances'].message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Instâncias criadas: {results['create-task-instances'].created}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Allowance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Processar Mesada Semanal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Credita a mesada semanal (1/4 da mensal) para filhas em famílias configuradas 
                para fechamento no dia atual da semana.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => runFunction('weekly-allowance')}
                  disabled={loading === 'weekly-allowance'}
                  variant="outline"
                >
                  {loading === 'weekly-allowance' ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Processar
                    </>
                  )}
                </Button>
              </div>
              {results['weekly-allowance'] && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Resultado:</strong> {results['weekly-allowance'].message}
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Filhas processadas: {results['weekly-allowance'].processed_daughters}</p>
                    <p>Famílias processadas: {results['weekly-allowance'].families_processed}</p>
                    <p>Total creditado: R$ {((results['weekly-allowance'].total_credits_cents || 0) / 100).toFixed(2)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Handle Overdue Tasks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Processar Tarefas Vencidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Identifica tarefas que passaram do prazo e aplica penalidades (se habilitadas). 
                Esta função normalmente roda automaticamente todos os dias.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => runFunction('handle-overdue-tasks')}
                  disabled={loading === 'handle-overdue-tasks'}
                  variant="outline"
                >
                  {loading === 'handle-overdue-tasks' ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Executar
                    </>
                  )}
                </Button>
              </div>
              {results['handle-overdue-tasks'] && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">
                    <strong>Resultado:</strong> {results['handle-overdue-tasks'].message}
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Tarefas processadas: {results['handle-overdue-tasks'].processed}</p>
                    <p>Penalidades aplicadas: {results['handle-overdue-tasks'].penalties}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Como funciona o sistema automático</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">🔄 Criação de Instâncias</h4>
              <p className="text-sm text-muted-foreground">
                Diariamente, o sistema cria automaticamente instâncias de tarefas recorrentes 
                (diárias, semanais, mensais) para cada filha da família.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">⏰ Controle de Vencimentos</h4>
              <p className="text-sm text-muted-foreground">
                Tarefas não completadas no prazo são marcadas como "vencidas" e podem gerar 
                penalidades automáticas no saldo da filha (configurável por família).
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">💰 Sistema de Recompensas</h4>
              <p className="text-sm text-muted-foreground">
                Quando os pais aprovam uma tarefa, o valor da recompensa é automaticamente 
                creditado no saldo da filha.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}