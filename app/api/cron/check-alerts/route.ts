// app/api/cron/check-alerts/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Criar cliente Supabase diretamente aqui
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Buscar parcelas com vencimento nos próximos 10 dias
    const today = new Date()
    const tenDaysFromNow = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000)
    
    const { data: pendingInstallments, error } = await supabase
      .from('contract_installments')
      .select(`
        *,
        event:events(name, event_date)
      `)
      .eq('payment_status', 'NAO_PAGO')
      .lte('due_date', tenDaysFromNow.toISOString().split('T')[0])
      .gte('due_date', today.toISOString().split('T')[0])

    if (error) throw error

    // Buscar usuários que recebem alertas
    const { data: usersToAlert } = await supabase
      .from('user_profiles')
      .select('notification_email, full_name')
      .eq('receive_alerts', true)
      .not('notification_email', 'is', null)

    // Log dos alertas (você pode integrar com Resend/email depois)
    console.log(`Encontradas ${pendingInstallments?.length || 0} parcelas pendentes`)
    console.log(`Usuários para alertar: ${usersToAlert?.length || 0}`)

    // TODO: Integrar com serviço de email (Resend)
    // TODO: Registrar alertas enviados na tabela alert_logs

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      pendingCount: pendingInstallments?.length || 0,
      usersToAlert: usersToAlert?.length || 0,
      installments: pendingInstallments
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('CRON Error:', errorMessage)
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 })
  }
}