import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { formatBRL } from '@/lib/currency';
import { Users, CheckSquare, AlertCircle, TrendingUp, LogOut, Plus } from 'lucide-react';

interface FamilyStats {
  totalBalance: number;
  pendingApprovals: number;
  overdueThisWeek: number;
  totalDaughters: number;
}

interface Daughter {
  id: string;
  monthly_allowance_cents: number;
  rewards_enabled: boolean;
  profile: {
    display_name: string;
  };
}

export function ParentDashboard() {
  const { profile, signOut } = useAuth();
  const [stats, setStats] = useState<FamilyStats>({
    totalBalance: 0,
    pendingApprovals: 0,
    overdueThisWeek: 0,
    totalDaughters: 0,
  });
  const [daughters, setDaughters] = useState<Daughter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!profile) return;

    try {
      // Load daughters with proper query  
      const { data: daughterData, error: daughterError } = await supabase
        .from('daughters')
        .select(`
          id,
          monthly_allowance_cents,
          rewards_enabled
        `);

      if (daughterError) {
        console.error('Error loading daughters:', daughterError);
        return;
      }

      // Get profile data for each daughter
      const daughtersWithProfiles = [];
      if (daughterData) {
        for (const daughter of daughterData) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, family_id')
            .eq('id', daughter.id)
            .eq('family_id', profile.family_id)
            .single();
          
          if (profileData) {
            daughtersWithProfiles.push({
              ...daughter,
              profile: profileData
            });
          }
        }
      }

      setDaughters(daughtersWithProfiles);
        // Calculate total balance for all daughters
        let totalBalance = 0;
        if (daughtersWithProfiles.length > 0) {
          for (const daughter of daughtersWithProfiles) {
            const { data: transactions } = await supabase
              .from('transactions')
              .select('amount_cents')
              .eq('daughter_id', daughter.id);
            
            const daughterBalance = transactions?.reduce((sum, t) => sum + t.amount_cents, 0) || 0;
            totalBalance += daughterBalance;
          }
        }

        // Load pending submissions (approvals needed)
        const { data: pendingSubmissions } = await supabase
          .from('submissions')
          .select('id, task_instance:task_instances!inner(daughter_id)')
          .eq('status', 'pending')
          .in('task_instance.daughter_id', daughtersWithProfiles.map(d => d.id));

        // Load overdue tasks from this week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data: overdueTasks } = await supabase
          .from('task_instances')
          .select('id')
          .eq('status', 'overdue')
          .in('daughter_id', daughtersWithProfiles.map(d => d.id))
          .gte('due_date', weekAgo.toISOString().split('T')[0]);

        setStats({
          totalBalance,
          pendingApprovals: pendingSubmissions?.length || 0,
          overdueThisWeek: overdueTasks?.length || 0,
          totalDaughters: daughtersWithProfiles.length,
        });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
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
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Painel da Família 👨‍👩‍👧‍👦
            </h1>
            <p className="text-sm text-muted-foreground">
              Gerencie tarefas e mesadas das suas filhas
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            title="Saldo Total"
            value={stats.totalBalance}
            icon={TrendingUp}
            subtitle="Todas as filhas"
            isMoney={true}
          />
          <KpiCard
            title="Filhas"
            value={stats.totalDaughters}
            icon={Users}
            subtitle="Na família"
          />
          <KpiCard
            title="Aguardando Aprovação"
            value={stats.pendingApprovals}
            icon={CheckSquare}
            subtitle="Tarefas enviadas"
          />
          <KpiCard
            title="Vencidas Esta Semana"
            value={stats.overdueThisWeek}
            icon={AlertCircle}
            subtitle="Precisam atenção"
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.location.href = '/tasks'}
            >
              <Plus className="w-6 h-6" />
              <span>Nova Tarefa</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 flex flex-col items-center gap-2"
              onClick={() => window.location.href = '/approvals'}
            >
              <CheckSquare className="w-6 h-6" />
              <span>Aprovar Tarefas</span>
            </Button>
          </CardContent>
        </Card>

        {/* Daughters Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Suas Filhas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {daughters.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Nenhuma filha cadastrada ainda
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Filha
                </Button>
              </div>
            ) : (
              daughters.map((daughter) => (
                <div
                  key={daughter.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <h4 className="font-medium">{daughter.profile.display_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Mesada: {formatBRL(daughter.monthly_allowance_cents)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {daughter.rewards_enabled && (
                      <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
                        Prêmios ativos
                      </span>
                    )}
                    <Button variant="outline" size="sm">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhuma atividade recente</p>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Mobile Navigation for Parents */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}