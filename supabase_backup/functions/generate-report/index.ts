// supabase/functions/generate-report/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface ReportRequest {
  type: 'MENSAL' | 'TRIMESTRAL' | 'ANUAL'
  year?: number
  month?: number
  quarter?: number
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { type, year, month, quarter }: ReportRequest = await req.json()
    
    const currentDate = new Date()
    const reportYear = year || currentDate.getFullYear()
    
    let startDate: Date
    let endDate: Date
    let periodLabel: string

    // Calcular período baseado no tipo
    switch (type) {
      case 'MENSAL':
        const reportMonth = month || currentDate.getMonth() // Mês anterior
        startDate = new Date(reportYear, reportMonth - 1, 1)
        endDate = new Date(reportYear, reportMonth, 0)
        periodLabel = startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        break
        
      case 'TRIMESTRAL':
        const reportQuarter = quarter || Math.ceil((currentDate.getMonth() + 1) / 3)
        const quarterStartMonth = (reportQuarter - 1) * 3
        startDate = new Date(reportYear, quarterStartMonth, 1)
        endDate = new Date(reportYear, quarterStartMonth + 3, 0)
        periodLabel = `${reportQuarter}º Trimestre de ${reportYear}`
        break
        
      case 'ANUAL':
        startDate = new Date(reportYear, 0, 1)
        endDate = new Date(reportYear, 11, 31)
        periodLabel = `Ano de ${reportYear}`
        break
        
      default:
        throw new Error('Tipo de relatório inválido')
    }

    // Buscar estatísticas
    const { data: stats, error: statsError } = await supabaseAdmin
      .rpc('get_report_statistics', {
        p_start_date: startDate.toISOString().split('T')[0],
        p_end_date: endDate.toISOString().split('T')[0]
      })

    if (statsError) throw statsError

    // Buscar lista de eventos do período
    const { data: events, error: eventsError } = await supabaseAdmin
      .from('events')
      .select(`
        *,
        created_by_profile:user_profiles!created_by(full_name)
      `)
      .gte('event_date', startDate.toISOString().split('T')[0])
      .lte('event_date', endDate.toISOString().split('T')[0])
      .order('event_date', { ascending: true })

    if (eventsError) throw eventsError

    // Buscar destinatários
    const { data: recipients, error: recipientsError } = await supabaseAdmin
      .from('user_profiles')
      .select('notification_email, full_name')
      .in('role', ['ADMIN', 'EDITOR'])
      .eq('receive_reports', true)

    if (recipientsError) throw recipientsError

    const recipientEmails = recipients
      .map(r => r.notification_email)
      .filter(Boolean)

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhum destinatário configurado' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      )
    }

    // Gerar e enviar e-mail
    const htmlContent = generateReportEmail(type, periodLabel, stats, events)

    const { error: emailError } = await resend.emails.send({
      from: "Sistema de Eventos <eventos@seudominio.com>",
      to: recipientEmails,
      subject: `📊 Relatório ${type} - ${periodLabel}`,
      html: htmlContent
    })

    if (emailError) throw emailError

    // Registrar log
    await supabaseAdmin.from('report_logs').insert({
      report_type: type,
      period_start: startDate.toISOString().split('T')[0],
      period_end: endDate.toISOString().split('T')[0],
      sent_to: recipientEmails,
      status: 'SENT'
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Relatório ${type} enviado com sucesso`,
        recipients: recipientEmails,
        period: periodLabel
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})

function generateReportEmail(
  type: string, 
  period: string, 
  stats: any, 
  events: any[]
): string {
  const totals = stats?.totals || {}
  const byStatus = stats?.by_status || {}
  const byMonth = stats?.by_month || []

  // Calcular métricas
  const taxaPagamento = totals.with_contract > 0 
    ? ((totals.paid / totals.with_contract) * 100).toFixed(1) 
    : 0

  // Encontrar melhor e pior mês
  const sortedMonths = [...(byMonth || [])].sort((a, b) => b.count - a.count)
  const bestMonth = sortedMonths[0]
  const worstMonth = sortedMonths[sortedMonths.length - 1]

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          line-height: 1.6; 
          color: #1f2937; 
          margin: 0;
          padding: 0;
          background: #f3f4f6;
        }
        .container { 
          max-width: 700px; 
          margin: 0 auto; 
          background: white;
        }
        .header { 
          background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); 
          color: white; 
          padding: 30px; 
          text-align: center;
        }
        .header h1 { margin: 0 0 10px 0; font-size: 24px; }
        .header p { margin: 0; opacity: 0.9; font-size: 16px; }
        
        .content { padding: 30px; }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          border: 1px solid #e5e7eb;
        }
        .stat-number {
          font-size: 32px;
          font-weight: bold;
          color: #3B82F6;
        }
        .stat-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .section { margin-bottom: 30px; }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .status-bar {
          display: flex;
          border-radius: 8px;
          overflow: hidden;
          height: 30px;
          margin-bottom: 10px;
        }
        .status-segment {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 500;
        }
        
        .legend {
          display: flex;
          gap: 20px;
          font-size: 12px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        .highlight-box {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }
        .highlight-card {
          flex: 1;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .highlight-card.success { background: #DEF7EC; color: #03543F; }
        .highlight-card.warning { background: #FEF3C7; color: #92400E; }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        tr:hover { background: #f9fafb; }
        
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
        }
        .badge-green { background: #DEF7EC; color: #03543F; }
        .badge-blue { background: #DBEAFE; color: #1E40AF; }
        .badge-gray { background: #F3F4F6; color: #374151; }
        .badge-red { background: #FEE2E2; color: #991B1B; }
        
        .footer {
          background: #1f2937;
          color: #9ca3af;
          padding: 20px;
          text-align: center;
          font-size: 12px;
        }
        
        @media (max-width: 600px) {
          .stats-grid { grid-template-columns: 1fr; }
          .highlight-box { flex-direction: column; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Relatório ${type}</h1>
          <p>${period}</p>
        </div>
        
        <div class="content">
          <!-- Estatísticas Principais -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${totals.total_events || 0}</div>
              <div class="stat-label">Total de Eventos</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${totals.with_contract || 0}</div>
              <div class="stat-label">Com Contrato</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${taxaPagamento}%</div>
              <div class="stat-label">Taxa de Pagamento</div>
            </div>
          </div>

          <!-- Por Tipo de Evento -->
          <div class="section">
            <div class="section-title">📌 Por Tipo de Evento</div>
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
              <div class="stat-card">
                <div class="stat-number" style="color: #8B5CF6;">${totals.marketing_events || 0}</div>
                <div class="stat-label">Marketing</div>
              </div>
              <div class="stat-card">
                <div class="stat-number" style="color: #F59E0B;">${totals.fundo_contrato_events || 0}</div>
                <div class="stat-label">Fundo de Contrato</div>
              </div>
            </div>
          </div>

          <!-- Status de Reserva -->
          <div class="section">
            <div class="section-title">📋 Status de Reservas</div>
            <div class="status-bar">
              ${byStatus.reserva_confirmada > 0 ? `
                <div class="status-segment" style="background: #22C55E; flex: ${byStatus.reserva_confirmada};">
                  ${byStatus.reserva_confirmada}
                </div>
              ` : ''}
              ${byStatus.pre_reserva > 0 ? `
                <div class="status-segment" style="background: #9CA3AF; flex: ${byStatus.pre_reserva};">
                  ${byStatus.pre_reserva}
                </div>
              ` : ''}
              ${byStatus.sem_reserva > 0 ? `
                <div class="status-segment" style="background: #E5E7EB; color: #374151; flex: ${byStatus.sem_reserva};">
                  ${byStatus.sem_reserva}
                </div>
              ` : ''}
            </div>
            <div class="legend">
              <div class="legend-item">
                <div class="legend-dot" style="background: #22C55E;"></div>
                Confirmadas (${byStatus.reserva_confirmada || 0})
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background: #9CA3AF;"></div>
                Pré-reserva (${byStatus.pre_reserva || 0})
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background: #E5E7EB;"></div>
                Sem reserva (${byStatus.sem_reserva || 0})
              </div>
            </div>
          </div>

          <!-- Pagamentos -->
          <div class="section">
            <div class="section-title">💰 Situação de Pagamentos</div>
            <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr);">
              <div class="stat-card" style="border-left: 4px solid #22C55E;">
                <div class="stat-number" style="color: #22C55E;">${totals.paid || 0}</div>
                <div class="stat-label">Pagos</div>
              </div>
              <div class="stat-card" style="border-left: 4px solid #EF4444;">
                <div class="stat-number" style="color: #EF4444;">${totals.pending_payment || 0}</div>
                <div class="stat-label">Pendentes</div>
              </div>
            </div>
          </div>

          <!-- Destaques -->
          ${bestMonth && worstMonth ? `
            <div class="section">
              <div class="section-title">🏆 Destaques do Período</div>
              <div class="highlight-box">
                <div class="highlight-card success">
                  <strong>Melhor Mês</strong><br>
                  ${formatMonth(bestMonth.month)}<br>
                  <span style="font-size: 24px; font-weight: bold;">${bestMonth.count}</span> eventos
                </div>
                <div class="highlight-card warning">
                  <strong>Menor Movimento</strong><br>
                  ${formatMonth(worstMonth.month)}<br>
                  <span style="font-size: 24px; font-weight: bold;">${worstMonth.count}</span> eventos
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Lista de Eventos -->
          ${events && events.length > 0 ? `
            <div class="section">
              <div class="section-title">📅 Eventos do Período (${events.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Evento</th>
                    <th>Tipo</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${events.slice(0, 20).map(event => `
                    <tr>
                      <td>${new Date(event.event_date).toLocaleDateString('pt-BR')}</td>
                      <td><strong>${event.name}</strong></td>
                      <td>
                        <span class="badge ${event.event_type === 'MARKETING' ? 'badge-blue' : 'badge-gray'}">
                          ${event.event_type === 'MARKETING' ? 'Marketing' : 'Fundo Contrato'}
                        </span>
                      </td>
                      <td>
                        ${event.is_paid ? '<span class="badge badge-green">Pago</span>' : 
                          event.has_contract ? '<span class="badge badge-red">Pendente</span>' : 
                          '<span class="badge badge-gray">Sem contrato</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${events.length > 20 ? `
                <p style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 10px;">
                  ... e mais ${events.length - 20} eventos
                </p>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p>Relatório gerado automaticamente em ${new Date().toLocaleString('pt-BR')}</p>
          <p>Sistema de Calendário de Eventos - Marketing</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}