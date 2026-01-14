import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { formatBRL } from '@/lib/currency';
import { Calendar, Camera, Send } from 'lucide-react';
import { TaskInstance } from '@/types';

interface TaskSubmissionProps {
  taskInstance: TaskInstance;
  onSubmitted: () => void;
}

export function TaskSubmission({ taskInstance, onSubmitted }: TaskSubmissionProps) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }
      setProofFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!taskInstance.task) return;

    // Check if proof is required but not provided
    if (taskInstance.task.attachment_required && !proofFile) {
      toast({
        title: "Prova obrigatória",
        description: "Esta tarefa exige o envio de uma foto como prova.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      let proofUrl = null;

      // Upload proof file if provided
      if (proofFile) {
        const fileName = `${taskInstance.id}_${Date.now()}.${proofFile.name.split('.').pop()}`;
        const { error: uploadError } = await supabase.storage
          .from('task-proofs')
          .upload(fileName, proofFile);

        if (uploadError) {
          toast({
            title: "Erro no upload",
            description: "Não foi possível enviar a foto. Tente novamente.",
            variant: "destructive",
          });
          return;
        }

        const { data } = supabase.storage
          .from('task-proofs')
          .getPublicUrl(fileName);
        
        proofUrl = data.publicUrl;
      }

      // Create submission
      const { error } = await supabase
        .from('submissions')
        .insert({
          task_instance_id: taskInstance.id,
          submitted_by: taskInstance.daughter_id,
          note: note.trim() || null,
          proof_url: proofUrl,
          status: 'pending',
        });

      if (error) {
        toast({
          title: "Erro ao enviar tarefa",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Update task instance status
      await supabase
        .from('task_instances')
        .update({ status: 'submitted' })
        .eq('id', taskInstance.id);

      toast({
        title: "Tarefa enviada!",
        description: "Sua tarefa foi enviada para aprovação.",
      });

      onSubmitted();
    } catch (error) {
      console.error('Error submitting task:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao enviar a tarefa.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Marcar como Concluída
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <h3 className="font-semibold mb-1">{taskInstance.task?.title}</h3>
          <p className="text-sm text-success font-medium">
            Recompensa: {formatBRL(taskInstance.task?.value_cents || 0)}
          </p>
          {taskInstance.task?.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {taskInstance.task.description}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Observações (opcional)</Label>
          <Textarea
            id="note"
            placeholder="Conte como você executou a tarefa..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
          />
        </div>

        {taskInstance.task?.attachment_required && (
          <div className="space-y-2">
            <Label htmlFor="proof">
              Foto da tarefa concluída *
            </Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
              <input
                id="proof"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={submitting}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('proof')?.click()}
                disabled={submitting}
                className="mb-2"
              >
                <Camera className="w-4 h-4 mr-2" />
                {proofFile ? 'Trocar Foto' : 'Tirar Foto'}
              </Button>
              {proofFile && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {proofFile.name}
                </p>
              )}
            </div>
          </div>
        )}

        {!taskInstance.task?.attachment_required && (
          <div className="space-y-2">
            <Label htmlFor="proof-optional">
              Foto (opcional)
            </Label>
            <div className="border border-muted-foreground/25 rounded-lg p-4 text-center">
              <input
                id="proof-optional"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={submitting}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('proof-optional')?.click()}
                disabled={submitting}
                className="mb-2"
              >
                <Camera className="w-4 h-4 mr-2" />
                {proofFile ? 'Trocar Foto' : 'Adicionar Foto'}
              </Button>
              {proofFile && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {proofFile.name}
                </p>
              )}
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Marcar como Feita
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}