import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/currency';
import { ArrowLeft, Plus, Calendar, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Task {
  id: string;
  title: string;
  value_cents: number;
  recurrence: string;
}

interface Daughter {
  id: string;
  profile: {
    display_name: string;
  };
}

export default function TaskInstances() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [daughters, setDaughters] = useState<Daughter[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState('');
  const [selectedDaughters, setSelectedDaughters] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    if (profile?.role === 'parent') {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    if (!profile?.family_id) return;

    try {
      // Carregar tarefas ativas
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', profile.family_id)
        .eq('active', true)
        .order('title');

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Carregar filhas com seus profiles
      const { data: daughtersData, error: daughtersError } = await supabase
        .from('daughters')
        .select(`
          id,
          profiles!inner(display_name, family_id)
        `)
        .eq('profiles.family_id', profile.family_id);

      if (daughtersError) throw daughtersError;
      
      const formattedDaughters = daughtersData?.map(d => ({
        id: d.id,
        profile: {
          display_name: (d.profiles as any).display_name
        }
      })) || [];
      
      setDaughters(formattedDaughters);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTask || selectedDaughters.length === 0 || !dueDate) {
      toast({
        title: "Erro",
        description: "Selecione uma tarefa, pelo menos uma filha e defina a data.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-task-instances', {
        body: {
          task_id: selectedTask,
          daughter_ids: selectedDaughters,
          due_date: dueDate
        }
      });

      if (error) throw error;

      toast({
        title: "Tarefas atribuídas!",
        description: `${data.count} tarefas foram criadas com sucesso.`,
      });

      // Reset form
      setSelectedTask('');
      setSelectedDaughters([]);
      setDueDate(new Date().toISOString().split('T')[0]);

    } catch (error: any) {
      console.error('Error creating task instances:', error);
      toast({
        title: "Erro ao atribuir tarefas",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDaughter = (daughterId: string) => {
    setSelectedDaughters(prev => 
      prev.includes(daughterId)
        ? prev.filter(id => id !== daughterId)
        : [...prev, daughterId]
    );
  };

  if (profile?.role !== 'parent') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Apenas pais podem atribuir tarefas.</p>
          </CardContent>
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
              onClick={() => navigate('/tasks')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Atribuir Tarefas</h1>
              <p className="text-muted-foreground">
                Crie instâncias de tarefas para suas filhas
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Nova Atribuição de Tarefa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="task">Selecionar Tarefa *</Label>
                <Select value={selectedTask} onValueChange={setSelectedTask}>
                  <SelectTrigger id="task">
                    <SelectValue placeholder="Escolha uma tarefa" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title} - {formatBRL(task.value_cents)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Selecionar Filhas *</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  {daughters.map((daughter) => (
                    <div
                      key={daughter.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDaughters.includes(daughter.id)
                          ? 'bg-primary/10 border-primary'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => toggleDaughter(daughter.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{daughter.profile.display_name}</span>
                        {selectedDaughters.includes(daughter.id) && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {daughters.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhuma filha encontrada. Adicione filhas primeiro.
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="due_date">Data de Vencimento *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} className="gap-2">
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Atribuir Tarefas
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/tasks')}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      <MobileNav />
    </div>
  );
}