import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/currency';
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { Task, TaskRecurrence } from '@/types';
import { useNavigate } from 'react-router-dom';

export default function Tasks() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value_cents: '',
    recurrence: 'none' as TaskRecurrence,
    attachment_required: false,
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', profile.family_id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading tasks:', error);
        return;
      }

      setTasks((data as Task[]) || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.family_id) {
      toast({
        title: "Erro",
        description: "Família não encontrada. Faça logout e login novamente.",
        variant: "destructive",
      });
      return;
    }

    if (profile.role !== 'parent') {
      toast({
        title: "Erro",
        description: "Apenas pais podem criar tarefas.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da tarefa é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    const valueCents = Math.round(parseFloat(formData.value_cents || '0') * 100);

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          family_id: profile.family_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          value_cents: valueCents,
          recurrence: formData.recurrence,
          attachment_required: formData.attachment_required,
        });

      if (error) {
        console.error('Error creating task:', error);
        toast({
          title: "Erro ao criar tarefa",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Tarefa criada!",
        description: "A tarefa foi criada com sucesso.",
      });

      setFormData({
        title: '',
        description: '',
        value_cents: '',
        recurrence: 'none',
        attachment_required: false,
      });
      setShowForm(false);
      loadTasks();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast({
        title: "Erro ao criar tarefa",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const getRecurrenceLabel = (recurrence: TaskRecurrence) => {
    const labels = {
      none: 'Única',
      daily: 'Diária',
      weekly: 'Semanal',
      monthly: 'Mensal',
    };
    return labels[recurrence];
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
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gerenciar Tarefas</h1>
            <p className="text-muted-foreground">
              Configure tarefas e recompensas para suas filhas
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
            >
              Voltar
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Tarefa
            </Button>
            <Button onClick={() => navigate('/task-instances')}>
              <Calendar className="w-4 h-4 mr-2" />
              Atribuir Tarefas
            </Button>
          </div>
        </div>

        {/* Task Creation Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>Criar Nova Tarefa</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título da Tarefa *</Label>
                    <Input
                      id="title"
                      type="text"
                      placeholder="Ex: Arrumar a cama"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="value">Valor da Recompensa (R$)</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formData.value_cents}
                      onChange={(e) => setFormData({ ...formData, value_cents: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva como a tarefa deve ser executada..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recurrence">Recorrência</Label>
                    <Select
                      value={formData.recurrence}
                      onValueChange={(value) => setFormData({ ...formData, recurrence: value as TaskRecurrence })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Tarefa única</SelectItem>
                        <SelectItem value="daily">Diária</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 mt-6">
                    <Switch
                      id="attachment_required"
                      checked={formData.attachment_required}
                      onCheckedChange={(checked) => setFormData({ ...formData, attachment_required: checked })}
                    />
                    <Label htmlFor="attachment_required">Exigir foto como prova</Label>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Tarefa
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tasks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Tarefas Ativas ({tasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma tarefa criada ainda.</p>
                <p>Clique em "Nova Tarefa" para começar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge variant="outline">
                          {getRecurrenceLabel(task.recurrence)}
                        </Badge>
                        {task.attachment_required && (
                          <Badge variant="secondary">📷 Prova obrigatória</Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {task.description}
                        </p>
                      )}
                      <p className="text-sm font-medium text-success">
                        Recompensa: {formatBRL(task.value_cents)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Mobile Navigation for Parents */}
      <div className="block md:hidden">
        <MobileNav />
      </div>
    </div>
  );
}