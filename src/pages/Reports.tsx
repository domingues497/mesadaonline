import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { BarChart3, TrendingUp, Users, Plus, DollarSign, Target } from 'lucide-react';

interface DaughterReport {
  id: string;
  display_name: string;
  monthly_allowance_cents: number;
  current_balance: number;
  tasks_completed: number;
  tasks_pending: number;
  total_earned: number;
  completion_rate: number;
}

interface FamilyStats {
  total_daughters: number;
  total_balance: number;
  total_tasks_completed: number;
  total_tasks_pending: number;
  average_completion_rate: number;
}

export default function Reports() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [daughterReports, setDaughterReports] = useState<DaughterReport[]>([]);
  const [familyStats, setFamilyStats] = useState<FamilyStats | null>(null);
  const [selectedDaughter, setSelectedDaughter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    daughter_id: '',
    amount: '',
    memo: '',
  });

  // Set default date range (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadReports();
    }
  }, [profile, dateFrom, dateTo, selectedDaughter]);

  const loadReports = async () => {
    if (!profile?.family_id) return;

    setLoading(true);
    try {
      // Get all daughters in the family
      const { data: daughters } = await supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          daughters!inner (
            monthly_allowance_cents
          )
        `)
        .eq('family_id', profile.family_id)
        .eq('role', 'child');

      if (!daughters) return;

      const reports: DaughterReport[] = [];
      let totalBalance = 0;
      let totalTasksCompleted = 0;
      let totalTasksPending = 0;

      for (const daughter of daughters) {
        const daughterId = daughter.id;

        // Get current balance
        const { data: transactions } = await supabase
          .from('transactions')
          .select('amount_cents')
          .eq('daughter_id', daughterId);

        const currentBalance = transactions?.reduce((sum, t) => sum + t.amount_cents, 0) || 0;

        // Get tasks in period
        const { data: completedTasks } = await supabase
          .from('task_instances')
          .select('task:tasks(value_cents)')
          .eq('daughter_id', daughterId)
          .eq('status', 'approved')
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo + 'T23:59:59');

        const { data: pendingTasks } = await supabase
          .from('task_instances')
          .select('*')
          .eq('daughter_id', daughterId)
          .in('status', ['pending', 'submitted'])
          .gte('created_at', dateFrom)
          .lte('created_at', dateTo + 'T23:59:59');

        const tasksCompletedCount = completedTasks?.length || 0;
        const tasksPendingCount = pendingTasks?.length || 0;
        const totalEarned = completedTasks?.reduce((sum, task) => sum + (task.task?.value_cents || 0), 0) || 0;
        const completionRate = (tasksCompletedCount + tasksPendingCount) > 0 
          ? (tasksCompletedCount / (tasksCompletedCount + tasksPendingCount)) * 100 
          : 0;

        reports.push({
          id: daughterId,
          display_name: daughter.display_name,
          monthly_allowance_cents: daughter.daughters.monthly_allowance_cents,
          current_balance: currentBalance,
          tasks_completed: tasksCompletedCount,
          tasks_pending: tasksPendingCount,
          total_earned: totalEarned,
          completion_rate: completionRate,
        });

        totalBalance += currentBalance;
        totalTasksCompleted += tasksCompletedCount;
        totalTasksPending += tasksPendingCount;
      }

      setDaughterReports(reports);
      setFamilyStats({
        total_daughters: daughters.length,
        total_balance: totalBalance,
        total_tasks_completed: totalTasksCompleted,
        total_tasks_pending: totalTasksPending,
        average_completion_rate: reports.length > 0 
          ? reports.reduce((sum, r) => sum + r.completion_rate, 0) / reports.length 
          : 0,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adjustmentData.daughter_id || !adjustmentData.amount) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a filha e informe o valor do ajuste.",
        variant: "destructive",
      });
      return;
    }

    try {
      const amountCents = Math.round(parseFloat(adjustmentData.amount) * 100);

      const { error } = await supabase
        .from('transactions')
        .insert({
          daughter_id: adjustmentData.daughter_id,
          amount_cents: amountCents,
          kind: 'adjustment',
          memo: adjustmentData.memo || 'Ajuste manual do saldo',
        });

      if (error) {
        toast({
          title: "Erro ao criar ajuste",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Ajuste realizado!",
        description: "O saldo foi ajustado com sucesso.",
      });

      setAdjustmentData({ daughter_id: '', amount: '', memo: '' });
      setAdjustmentOpen(false);
      loadReports();
    } catch (error) {
      console.error('Error creating adjustment:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Relatórios e Ajustes</h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho da família e faça ajustes necessários
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajuste Manual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajuste Manual de Saldo</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAdjustment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="daughterSelect">Filha *</Label>
                    <Select
                      value={adjustmentData.daughter_id}
                      onValueChange={(value) => setAdjustmentData({ ...adjustmentData, daughter_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma filha" />
                      </SelectTrigger>
                      <SelectContent>
                        {daughterReports.map((daughter) => (
                          <SelectItem key={daughter.id} value={daughter.id}>
                            {daughter.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor (R$) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="Digite o valor (positivo para crédito, negativo para débito)"
                      value={adjustmentData.amount}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, amount: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="memo">Motivo</Label>
                    <Textarea
                      id="memo"
                      placeholder="Descreva o motivo do ajuste..."
                      value={adjustmentData.memo}
                      onChange={(e) => setAdjustmentData({ ...adjustmentData, memo: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setAdjustmentOpen(false)} className="flex-1">
                      Cancelar
                    </Button>
                    <Button type="submit" className="flex-1">
                      Aplicar Ajuste
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
            >
              Voltar
            </Button>
          </div>
        </div>

        {/* Period Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Período do Relatório</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Data de início</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Data de fim</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Family Stats */}
        {familyStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Filhas</p>
                    <p className="text-2xl font-bold">{familyStats.total_daughters}</p>
                  </div>
                  <Users className="w-8 h-8 text-primary/60" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Total</p>
                    <p className={`text-2xl font-bold ${familyStats.total_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatBRL(familyStats.total_balance)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary/60" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tarefas Completas</p>
                    <p className="text-2xl font-bold text-success">{familyStats.total_tasks_completed}</p>
                  </div>
                  <Target className="w-8 h-8 text-primary/60" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa Média</p>
                    <p className="text-2xl font-bold">{familyStats.average_completion_rate.toFixed(1)}%</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary/60" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Individual Reports */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Relatório Individual por Filha
            </CardTitle>
          </CardHeader>
          <CardContent>
            {daughterReports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma filha cadastrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {daughterReports.map((report) => (
                  <div
                    key={report.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{report.display_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Mesada: {formatBRL(report.monthly_allowance_cents)}
                        </p>
                      </div>
                      <Badge variant={report.completion_rate >= 80 ? 'default' : report.completion_rate >= 60 ? 'secondary' : 'destructive'}>
                        {report.completion_rate.toFixed(1)}% conclusão
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Saldo Atual</p>
                        <p className={`font-semibold ${report.current_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {formatBRL(report.current_balance)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Ganho no Período</p>
                        <p className="font-semibold text-success">
                          {formatBRL(report.total_earned)}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Tarefas Completas</p>
                        <p className="font-semibold">
                          {report.tasks_completed}
                        </p>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Tarefas Pendentes</p>
                        <p className="font-semibold text-amber-600">
                          {report.tasks_pending}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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