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
  recurrence_day?: number | null
  recurrence_time?: string | null
  active: boolean
  description?: string | null
  assignees?: string[] | null
}

interface Daughter {
  id: string
  family_id: string // Needed for safety check
}

serve(async (req: Request) => {
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

  } catch (error: any) {
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

  // Get all daughters with their family_id to map correctly
  // We need to know which family each daughter belongs to
  const { data: daughtersData, error: daughtersError } = await supabaseClient
    .from('daughters')
    .select(`
      id,
      profiles!inner(family_id)
    `)

  if (daughtersError) {
    throw daughtersError
  }

  // Flatten the structure for easier access
  const allDaughters = daughtersData.map((d: any) => ({
    id: d.id,
    family_id: d.profiles.family_id
  }));

  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  let createdInstances = 0

  for (const task of tasks as Task[]) {
    const scheduledWeekday = task.recurrence_day ?? null

    // Determine target daughters for this task
    let targetDaughters: { id: string }[] = [];

    if (task.assignees && task.assignees.length > 0) {
      // Use specific assignees
      // Validate they belong to the same family (optional safety, but good practice)
      targetDaughters = allDaughters.filter((d: any) => 
        task.assignees!.includes(d.id) && d.family_id === task.family_id
      );
    } else {
      // Fallback: All daughters of the family
      targetDaughters = allDaughters.filter((d: any) => d.family_id === task.family_id);
    }

    for (const daughter of targetDaughters) {
      let dueDate: Date | null = null

      // Calculate due date based on recurrence
      switch (task.recurrence) {
        case 'daily':
          // If a specific day is selected for daily, strictly follow it (acting as weekly)
          // Otherwise, run every day
          if (scheduledWeekday !== null) {
            const target = new Date(tomorrow)
            // Check if tomorrow matches the scheduled day
            if (target.getDay() === scheduledWeekday) {
              dueDate = target
            }
          } else {
            dueDate = tomorrow
          }
          break
        case 'weekly':
          if (scheduledWeekday !== null) {
            const target = new Date(tomorrow)
            for (let i = 0; i < 14; i++) {
              if (target.getDay() === scheduledWeekday) {
                dueDate = target
                break
              }
              target.setDate(target.getDate() + 1)
            }
          } else {
            // Fallback to exactly one week from now if no day specified
            dueDate = new Date(tomorrow)
            dueDate.setDate(tomorrow.getDate() + 7)
          }
          break
        case 'monthly':
          // Only create if tomorrow is the same day of the month as created_at (or recurrence_day if we supported it)
          // User said "monthly doesn't need, one time", so we use created_at date or just 1st of month?
          // Let's use created_at day of month to spread load
          // Note: This assumes task.created_at exists (it should for Supabase)
          // We need to fetch created_at in the select query!
          // But wait, "Task" interface doesn't have created_at. I need to add it.
          // And update the select query.
          // Fallback: If we don't have created_at, maybe use 1st of month?
          // Existing logic was: dueDate = new Date(tomorrow); dueDate.setMonth(tomorrow.getMonth() + 1);
          // I will use a safe approach:
          // Check if tomorrow's date matches the recurrence_day (if provided) or created_at (if I can get it).
          // Since I can't easily change the select * right now without verifying, I'll assume I can add created_at to interface.
          // 'select *' returns everything, so created_at is there.
          {
             const creationDate = (task as any).created_at ? new Date((task as any).created_at) : new Date();
             if (tomorrow.getDate() === creationDate.getDate()) {
               dueDate = tomorrow; // Due tomorrow (which is the monthly anniversary)
             }
          }
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
