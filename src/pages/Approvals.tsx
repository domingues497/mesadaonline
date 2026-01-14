import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/currency';
import { formatDistance } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, XCircle, Clock, User, Camera } from 'lucide-react';

interface SubmissionWithDetails {
  id: string;
  note?: string;
  proof_url?: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  task_instance: {
    id: string;
    due_date: string;
    daughter_id: string;
    task: {
      title: string;
      value_cents: number;
    };
  };
  daughter_profile: {
    display_name: string;
  };
}

export default function Approvals() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          note,
          proof_url,
          created_at,
          status,
          task_instance:task_instances (
            id,
            due_date,
            daughter_id,
            task:tasks (
              title,
              value_cents
            )
          ),
          daughter_profile:profiles!submissions_submitted_by_fkey (
            display_name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading submissions:', error);
        return;
      }

      setSubmissions((data as SubmissionWithDetails[]) || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (submissionId: string, approved: boolean) => {
    try {
      // Use edge function for approval
      const { data, error } = await supabase.functions.invoke('approve-submission', {
        body: {
          submission_id: submissionId,
          approved: approved
        }
      });

      if (error) {
        console.error('Error in approval function:', error);
        toast({
          title: "Erro ao processar aprovação",
          description: error.message || "Ocorreu um erro inesperado.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: approved ? "Tarefa aprovada!" : "Tarefa rejeitada",
        description: data?.message || (approved ? "Recompensa adicionada ao saldo." : "A tarefa foi rejeitada."),
      });

      // Reload submissions
      loadSubmissions();
    } catch (error: any) {
      console.error('Error processing approval:', error);
      toast({
        title: "Erro ao processar aprovação",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
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
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Aprovar Tarefas</h1>
            <p className="text-muted-foreground">
              Revise as tarefas enviadas pelas suas filhas
            </p>
          </div>
          <Button 
            variant="outline"
            onClick={() => window.location.href = '/dashboard'}
          >
            Voltar
          </Button>
        </div>

        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Aguardando Aprovação ({submissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma tarefa aguardando aprovação.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="border rounded-lg p-4 space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {submission.daughter_profile.display_name}
                          </span>
                          <Badge variant="outline">
                            {formatDistance(new Date(submission.created_at), new Date(), { 
                              addSuffix: true,
                              locale: ptBR 
                            })}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold mb-1">
                          {submission.task_instance.task.title}
                        </h3>
                        <p className="text-sm text-success font-medium">
                          Recompensa: {formatBRL(submission.task_instance.task.value_cents)}
                        </p>
                      </div>
                    </div>

                    {/* Submission Details */}
                    {submission.note && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm">
                          <strong>Observação:</strong> {submission.note}
                        </p>
                      </div>
                    )}

                    {submission.proof_url && (
                      <div className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Prova enviada:</span>
                        </div>
                        <img
                          src={submission.proof_url}
                          alt="Prova da tarefa"
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleApproval(submission.id, true)}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleApproval(submission.id, false)}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rejeitar
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