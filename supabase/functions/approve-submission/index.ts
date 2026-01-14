import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { submission_id, approved } = await req.json()

    if (!submission_id || typeof approved !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'submission_id e approved são obrigatórios' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Buscar submissão com dados relacionados
    const { data: submission, error: submissionError } = await supabaseClient
      .from('submissions')
      .select(`
        *,
        task_instances (
          *,
          tasks (*),
          daughters (*)
        )
      `)
      .eq('id', submission_id)
      .single()

    if (submissionError || !submission) {
      console.error('Erro ao buscar submissão:', submissionError)
      return new Response(
        JSON.stringify({ error: 'Submissão não encontrada' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const taskInstance = submission.task_instances
    const task = taskInstance.tasks
    const daughter = taskInstance.daughters

    // Atualizar status da submissão
    const newStatus = approved ? 'approved' : 'rejected'
    const { error: updateSubmissionError } = await supabaseClient
      .from('submissions')
      .update({ status: newStatus })
      .eq('id', submission_id)

    if (updateSubmissionError) {
      console.error('Erro ao atualizar submissão:', updateSubmissionError)
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar submissão' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Atualizar status da task_instance
    const taskStatus = approved ? 'approved' : 'rejected'
    const { error: updateTaskError } = await supabaseClient
      .from('task_instances')
      .update({ 
        status: taskStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskInstance.id)

    if (updateTaskError) {
      console.error('Erro ao atualizar task instance:', updateTaskError)
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar status da tarefa' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Se aprovado e rewards_enabled, criar transação positiva
    if (approved && daughter.rewards_enabled && task.value_cents > 0) {
      const { error: transactionError } = await supabaseClient
        .from('transactions')
        .insert({
          daughter_id: taskInstance.daughter_id,
          amount_cents: task.value_cents,
          kind: 'task_approved',
          memo: `Tarefa aprovada: ${task.title}`
        })

      if (transactionError) {
        console.error('Erro ao criar transação:', transactionError)
        return new Response(
          JSON.stringify({ error: 'Erro ao registrar recompensa' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: approved ? 'Submissão aprovada com sucesso' : 'Submissão rejeitada'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro na função approve-submission:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})