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
    // Get authenticated user from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Authorization header required')
    }

    // Create Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Get user's profile to get family_id
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('family_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      throw new Error('Profile not found')
    }

    if (profile.role !== 'parent') {
      throw new Error('Only parents can seed tasks')
    }

    // Sample tasks to create
    const sampleTasks = [
      {
        title: 'Arrumar a cama',
        description: 'Arrumar a cama todos os dias pela manhã',
        value_cents: 200, // R$ 2,00
        recurrence: 'daily',
        attachment_required: false,
        family_id: profile.family_id,
        active: true
      },
      {
        title: 'Lavar a louça',
        description: 'Lavar e secar toda a louça após as refeições',
        value_cents: 500, // R$ 5,00
        recurrence: 'daily',
        attachment_required: true,
        family_id: profile.family_id,
        active: true
      },
      {
        title: 'Organizar o quarto',
        description: 'Organizar e limpar completamente o quarto',
        value_cents: 1000, // R$ 10,00
        recurrence: 'weekly',
        attachment_required: true,
        family_id: profile.family_id,
        active: true
      },
      {
        title: 'Estudar matemática',
        description: 'Dedicar 1 hora aos estudos de matemática',
        value_cents: 300, // R$ 3,00
        recurrence: 'daily',
        attachment_required: false,
        family_id: profile.family_id,
        active: true
      },
      {
        title: 'Regar as plantas',
        description: 'Regar todas as plantas do jardim',
        value_cents: 150, // R$ 1,50
        recurrence: 'weekly',
        attachment_required: false,
        family_id: profile.family_id,
        active: true
      }
    ]

    // Insert sample tasks
    const { data: insertedTasks, error: insertError } = await supabaseClient
      .from('tasks')
      .insert(sampleTasks)
      .select()

    if (insertError) {
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        message: `Created ${insertedTasks?.length || 0} sample tasks successfully`,
        tasks: insertedTasks
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )

  } catch (error) {
    console.error('Error seeding tasks:', error)
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