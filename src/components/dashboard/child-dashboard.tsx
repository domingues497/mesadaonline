import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { TaskStatusBadge } from '@/components/ui/task-status-badge';
import { TaskSubmission } from '@/components/tasks/task-submission';
import { MobileNav } from '@/components/layout/mobile-nav';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { formatBRL } from '@/lib/currency';
import { formatDate } from '@/lib/date';
import { Coins, CheckSquare, Clock, TrendingUp, LogOut } from 'lucide-react';
import { TaskStatus, TaskInstance, Transaction } from '@/types';

interface OldTaskInstance {
  id: string;
  due_date: string;
  status: TaskStatus;
  task: {
    id: string;
    title: string;
    description: string;
    value_cents: number;
    attachment_required: boolean;
  };
}

interface OldTransaction {
  id: string;
  amount_cents: number;
  kind: string;
  memo: string;
  created_at: string;
}

export function ChildDashboard() {
  const { profile, daughter, signOut } = useAuth();
  const [tasks, setTasks] = useState<OldTaskInstance[]>([]);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<OldTransaction[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskInstance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    if (!profile || !daughter) return;

    try {
      // Load task instances
      const { data: taskData, error: taskError } = await supabase
        .from('task_instances')
        .select(`
          id,
          due_date,
          status,
          task:tasks (
            id,
            title,
            description,
            value_cents,
            attachment_required
          )
        `)
        .eq('daughter_id', profile.id)
        .order('due_date', { ascending: true })
        .limit(10);

      if (taskError) {
        console.error('Error loading tasks:', taskError);
      } else {
        setTasks((taskData || []) as OldTaskInstance[]);
      }

      // Load transactions for balance calculation
      const { data: transactionData, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('daughter_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionError) {
        console.error('Error loading transactions:', transactionError);
      } else {
        setTransactions(transactionData || []);
        
        // Calculate balance
        const totalBalance = transactionData?.reduce((sum, transaction) => {
          return sum + transaction.amount_cents;
        }, 0) || 0;
        setBalance(totalBalance);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (task: OldTaskInstance) => {
    if (task.status === 'pending') {
      // Convert to the expected TaskInstance format for submission
      const taskInstance: TaskInstance = {
        id: task.id,
        task_id: task.task.id,
        daughter_id: profile?.id || '',
        due_date: task.due_date,
        status: task.status as any,
        created_at: '',
        updated_at: '',
        task: {
          id: task.task.id,
          family_id: '',
          title: task.task.title,
          description: task.task.description || '',
          value_cents: task.task.value_cents,
          recurrence: 'none',
          attachment_required: task.task.attachment_required,
          active: true,
        }
      };
      setSelectedTask(taskInstance);
    }
  };

  const handleTaskSubmitted = () => {
    setSelectedTask(null);
    loadDashboardData();
  };
  
  const pendingTasks = tasks.filter(task => task.status === 'pending');
  const todayTasks = tasks.filter(task => {
    const dueDate = new Date(task.due_date);
    const today = new Date();
    return dueDate.toDateString() === today.toDateString() && task.status === 'pending';
  });

  if (selectedTask) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto">
          <div className="mb-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedTask(null)}
              className="mb-4"
            >
              ← Voltar
            </Button>
          </div>
          <TaskSubmission
            taskInstance={selectedTask}
            onSubmitted={handleTaskSubmitted}
          />
        </div>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Olá, {profile?.display_name}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Vamos completar suas tarefas hoje?
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
      <main className="p-4 pb-20 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            title="Saldo Atual"
            value={balance}
            icon={Coins}
            subtitle="Sua mesada"
            isMoney={true}
          />
          <KpiCard
            title="Tarefas Pendentes"
            value={pendingTasks.length}
            icon={CheckSquare}
            subtitle="Para completar"
          />
        </div>

        {/* Today's Tasks */}
        {todayTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Tarefas de Hoje
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayTasks.map((taskInstance) => (
                <div
                  key={taskInstance.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{taskInstance.task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatBRL(taskInstance.task.value_cents)}
                    </p>
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => handleTaskClick(taskInstance)}
                  >
                    Fazer Agora
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* All Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              Minhas Tarefas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma tarefa encontrada
              </p>
            ) : (
              tasks.map((taskInstance) => (
                <div
                  key={taskInstance.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{taskInstance.task.title}</h4>
                      <TaskStatusBadge status={taskInstance.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {taskInstance.task.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatBRL(taskInstance.task.value_cents)}</span>
                      <span>Vence: {formatDate(taskInstance.due_date)}</span>
                      {taskInstance.task.attachment_required && (
                        <Badge variant="outline" className="text-xs">
                          Foto obrigatória
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    {taskInstance.status === 'pending' && (
                      <Button 
                        size="sm"
                        onClick={() => handleTaskClick(taskInstance)}
                      >
                        Completar
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Extrato Recente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </p>
            ) : (
              transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">
                      {transaction.memo || `Transação ${transaction.kind}`}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>
                  <div className={`font-medium ${transaction.amount_cents > 0 ? 'text-success' : 'text-destructive'}`}>
                    {transaction.amount_cents > 0 ? '+' : ''}{formatBRL(transaction.amount_cents)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}