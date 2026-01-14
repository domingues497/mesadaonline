import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0]

    // Find all pending tasks that are overdue
    const { data: overdueTasks, error: overdueError } = await supabaseClient
      .from('task_instances')
      .select(`
        id,
        daughter_id,
        task:tasks(
          id,
          title,
          value_cents,
          family_id
        )
      `)
      .eq('status', 'pending')
      .lt('due_date', today)

    if (overdueError) {
      throw overdueError
    }

    let processedTasks = 0
    let penaltiesApplied = 0

    for (const taskInstance of overdueTasks || []) {
      // Update task status to overdue
      const { error: updateError } = await supabaseClient
        .from('task_instances')
        .update({ status: 'overdue' })
        .eq('id', taskInstance.id)

      if (updateError) {
        console.error('Error updating task instance:', updateError)
        continue
      }

      processedTasks++

      // Check if penalties are enabled for this family
      const { data: settings } = await supabaseClient
        .from('settings')
        .select('penalty_on_miss')
        .eq('family_id', taskInstance.task.family_id)
        .single()

      if (settings?.penalty_on_miss) {
        // Apply penalty (negative transaction)
        const penaltyAmount = Math.floor(taskInstance.task.value_cents * 0.5) // 50% penalty
        
        const { error: transactionError } = await supabaseClient
          .from('transactions')
          .insert({
            daughter_id: taskInstance.daughter_id,
            amount_cents: -penaltyAmount,
            kind: 'task_missed',
            memo: `Penalidade por tarefa não feita: ${taskInstance.task.title}`
          })

        if (!transactionError) {
          penaltiesApplied++
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${processedTasks} overdue tasks, applied ${penaltiesApplied} penalties`,
        processed: processedTasks,
        penalties: penaltiesApplied
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )

  } catch (error) {
    console.error('Error handling overdue tasks:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})