// supabase/functions/check-alerts/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar contratos com vencimento próximo (10 dias)
    const today = new Date()
    const tenDaysFromNow = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)
    
    const { data: pendingInstallments, error } = await supabase
      .from('contract_installments')
      .select(`
        *,
        event:events(*)
      `)
      .eq('payment_status', 'NAO_PAGO')
      .lte('due_date', tenDaysFromNow.toISOString().split('T')[0])
      .gte('due_date', today.toISOString().split('T')[0])

    if (error) throw error

    // TODO: Enviar alertas por email/WhatsApp
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsCount: pendingInstallments?.length || 0,
        installments: pendingInstallments 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})