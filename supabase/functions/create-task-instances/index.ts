import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Task {
  id: string
  family_id: string
  title: string
  value_cents: number
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
  active: boolean
}

interface Daughter {
  id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check if this is a manual request or automatic
    let body: any = null
    try {
      body = await req.json()
    } catch {
      // No body means automatic recurring task creation
    }

    if (body && body.task_id && body.daughter_ids && body.due_date) {
      // Manual creation of specific task instances
      return await createManualTaskInstances(supabaseClient, body)
    } else {
      // Automatic creation of recurring tasks
      return await createRecurringTaskInstances(supabaseClient)
    }

  } catch (error) {
    console.error('Error in create-task-instances:', error)
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

async function createManualTaskInstances(supabaseClient: any, body: any) {
  const { task_id, daughter_ids, due_date } = body

  if (!task_id || !daughter_ids || !Array.isArray(daughter_ids) || !due_date) {
    return new Response(
      JSON.stringify({ error: 'task_id, daughter_ids (array) e due_date são obrigatórios' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Verificar se a tarefa existe
  const { data: task, error: taskError } = await supabaseClient
    .from('tasks')
    .select('*')
    .eq('id', task_id)
    .single()

  if (taskError || !task) {
    return new Response(
      JSON.stringify({ error: 'Tarefa não encontrada' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Verificar se as filhas existem e pertencem à mesma família da tarefa
  const { data: daughters, error: daughtersError } = await supabaseClient
    .from('profiles')
    .select('id, family_id, role')
    .in('id', daughter_ids)
    .eq('role', 'child')
    .eq('family_id', task.family_id)

  if (daughtersError) {
    return new Response(
      JSON.stringify({ error: 'Erro ao verificar filhas' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  if (!daughters || daughters.length !== daughter_ids.length) {
    return new Response(
      JSON.stringify({ error: 'Uma ou mais filhas não foram encontradas ou não pertencem à família' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  // Criar instâncias da tarefa para cada filha
  const taskInstances = daughter_ids.map((daughter_id: string) => ({
    task_id,
    daughter_id,
    due_date,
    status: 'pending'
  }))

  const { data: createdInstances, error: createError } = await supabaseClient
    .from('task_instances')
    .insert(taskInstances)
    .select()

  if (createError) {
    console.error('Erro ao criar task instances:', createError)
    return new Response(
      JSON.stringify({ error: 'Erro ao criar instâncias das tarefas' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      created_instances: createdInstances,
      count: createdInstances?.length || 0
    }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

async function createRecurringTaskInstances(supabaseClient: any) {
  // Get all active recurring tasks
  const { data: tasks, error: tasksError } = await supabaseClient
    .from('tasks')
    .select('*')
    .eq('active', true)
    .neq('recurrence', 'none')

  if (tasksError) {
    throw tasksError
  }

  // Get all daughters
  const { data: daughters, error: daughtersError } = await supabaseClient
    .from('daughters')
    .select('id')

  if (daughtersError) {
    throw daughtersError
  }

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let createdInstances = 0

  for (const task of tasks as Task[]) {
    for (const daughter of daughters as Daughter[]) {
      let dueDate: Date | null = null

      // Calculate due date based on recurrence
      switch (task.recurrence) {
        case 'daily':
          dueDate = tomorrow
          break
        case 'weekly':
          dueDate = new Date(tomorrow)
          dueDate.setDate(tomorrow.getDate() + 7)
          break
        case 'monthly':
          dueDate = new Date(tomorrow)
          dueDate.setMonth(tomorrow.getMonth() + 1)
          break
      }

      if (!dueDate) continue

      // Check if instance already exists for this date
      const { data: existingInstance } = await supabaseClient
        .from('task_instances')
        .select('id')
        .eq('task_id', task.id)
        .eq('daughter_id', daughter.id)
        .eq('due_date', dueDate.toISOString().split('T')[0])
        .single()

      if (!existingInstance) {
        // Create new task instance
        const { error: instanceError } = await supabaseClient
          .from('task_instances')
          .insert({
            task_id: task.id,
            daughter_id: daughter.id,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending'
          })

        if (!instanceError) {
          createdInstances++
        }
      }
    }
  }

  return new Response(
    JSON.stringify({ 
      message: `Created ${createdInstances} recurring task instances`,
      created: createdInstances 
    }),
    { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      }
    }
  )
}