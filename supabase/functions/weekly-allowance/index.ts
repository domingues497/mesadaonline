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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting weekly allowance processing...')

    // Get current day of week (0 = Sunday, 1 = Monday, etc.)
    const today = new Date()
    const currentWeekday = today.getDay()

    console.log('Current weekday:', currentWeekday)

    // Find families that have weekly close on this weekday
    const { data: settings, error: settingsError } = await supabaseClient
      .from('settings')
      .select(`
        family_id,
        families:family_id (name)
      `)
      .eq('weekly_close_weekday', currentWeekday)

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      throw settingsError
    }

    console.log('Found families for processing:', settings?.length || 0)

    let processedDaughters = 0
    let totalCredits = 0

    for (const setting of settings || []) {
      console.log(`Processing family: ${setting.families?.name}`)

      // Get all daughters in this family
      const { data: daughters, error: daughtersError } = await supabaseClient
        .from('daughters')
        .select(`
          id,
          monthly_allowance_cents,
          profiles:id (
            display_name,
            family_id
          )
        `)
        .eq('profiles.family_id', setting.family_id)

      if (daughtersError) {
        console.error('Error fetching daughters:', daughtersError)
        continue
      }

      for (const daughter of daughters || []) {
        // Calculate weekly allowance (monthly allowance / 4)
        const weeklyAllowanceCents = Math.round(daughter.monthly_allowance_cents / 4)

        if (weeklyAllowanceCents > 0) {
          // Create allowance transaction
          const { error: transactionError } = await supabaseClient
            .from('transactions')
            .insert({
              daughter_id: daughter.id,
              amount_cents: weeklyAllowanceCents,
              kind: 'allowance',
              memo: `Mesada semanal - ${today.toISOString().split('T')[0]}`
            })

          if (transactionError) {
            console.error('Error creating transaction for daughter:', daughter.id, transactionError)
            continue
          }

          console.log(`Created allowance for ${daughter.profiles?.display_name}: R$ ${(weeklyAllowanceCents / 100).toFixed(2)}`)
          processedDaughters++
          totalCredits += weeklyAllowanceCents
        }
      }
    }

    console.log('Weekly allowance processing completed')
    console.log('Processed daughters:', processedDaughters)
    console.log('Total credits:', totalCredits / 100)

    return new Response(
      JSON.stringify({ 
        message: `Weekly allowance processed successfully`,
        processed_daughters: processedDaughters,
        total_credits_cents: totalCredits,
        families_processed: settings?.length || 0
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    )

  } catch (error) {
    console.error('Error in weekly allowance processing:', error)
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