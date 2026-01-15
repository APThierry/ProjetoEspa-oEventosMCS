// supabase/functions/check-alerts/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { Resend } from "https://esm.sh/resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface PendingContract {
  id: string
  name: string
  event_date: string
  contract_due_date: string
  days_until_due: number
  created_by: string
  created_by_name: string
  created_by_email: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Criar cliente Supabase com service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Buscar contratos que vencem em 10 dias
    const { data: alertsIn10Days, error: error10Days } = await supabaseAdmin
      .rpc("get_contracts_due_in_days", { days: 10 })

    if (error10Days) throw error10Days

    // 2. Buscar contratos vencidos
    const { data: overdueContracts, error: errorOverdue } = await supabaseAdmin
      .rpc("get_overdue_contracts")

    if (errorOverdue) throw errorOverdue

    // 3. Buscar admins para notificar
    const { data: admins, error: adminError } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id, full_name, notification_email")
      .eq("role", "ADMIN")
      .eq("receive_alerts", true)

    if (adminError) throw adminError

    const results = {
      alerts_10_days: [] as string[],
      overdue_alerts: [] as string[],
      errors: [] as string[]
    }

    // 4. Enviar alertas de 10 dias
    for (const contract of alertsIn10Days || []) {
      // Verificar se já foi enviado hoje
      const { data: existingAlert } = await supabaseAdmin
        .from("alert_logs")
        .select("id")
        .eq("event_id", contract.id)
        .eq("alert_type", "VENCIMENTO_10_DIAS")
        .gte("sent_at", new Date().toISOString().split("T")[0])
        .single()

      if (existingAlert) continue // Já enviado hoje

      // Montar lista de destinatários
      const recipients = [
        ...admins.map(a => a.notification_email).filter(Boolean),
        contract.created_by_email
      ].filter((v, i, a) => a.indexOf(v) === i) // Remove duplicados

      try {
        // Enviar e-mail
        const { error: emailError } = await resend.emails.send({
          from: "Sistema de Eventos <eventos@seudominio.com>",
          to: recipients,
          subject: `⚠️ Contrato vence em 10 dias: ${contract.name}`,
          html: generateAlertEmail(contract, "10_DIAS")
        })

        if (emailError) throw emailError

        // Registrar log
        await supabaseAdmin.from("alert_logs").insert({
          event_id: contract.id,
          alert_type: "VENCIMENTO_10_DIAS",
          sent_to: recipients.join(", "),
          status: "SENT"
        })

        results.alerts_10_days.push(contract.name)
      } catch (e) {
        results.errors.push(`Erro ao enviar alerta 10 dias para ${contract.name}: ${e.message}`)
        
        await supabaseAdmin.from("alert_logs").insert({
          event_id: contract.id,
          alert_type: "VENCIMENTO_10_DIAS",
          sent_to: recipients.join(", "),
          status: "FAILED",
          error_message: e.message
        })
      }
    }

    // 5. Enviar alertas de vencidos
    for (const contract of overdueContracts || []) {
      // Verificar se já foi enviado hoje
      const { data: existingAlert } = await supabaseAdmin
        .from("alert_logs")
        .select("id")
        .eq("event_id", contract.id)
        .eq("alert_type", "VENCIMENTO_EXPIRADO")
        .gte("sent_at", new Date().toISOString().split("T")[0])
        .single()

      if (existingAlert) continue

      const recipients = [
        ...admins.map(a => a.notification_email).filter(Boolean),
        contract.created_by_email
      ].filter((v, i, a) => a.indexOf(v) === i)

      try {
        const { error: emailError } = await resend.emails.send({
          from: "Sistema de Eventos <eventos@seudominio.com>",
          to: recipients,
          subject: `🚨 URGENTE: Contrato VENCIDO - ${contract.name}`,
          html: generateAlertEmail(contract, "VENCIDO")
        })

        if (emailError) throw emailError

        await supabaseAdmin.from("alert_logs").insert({
          event_id: contract.id,
          alert_type: "VENCIMENTO_EXPIRADO",
          sent_to: recipients.join(", "),
          status: "SENT"
        })

        results.overdue_alerts.push(contract.name)
      } catch (e) {
        results.errors.push(`Erro ao enviar alerta vencido para ${contract.name}: ${e.message}`)
        
        await supabaseAdmin.from("alert_logs").insert({
          event_id: contract.id,
          alert_type: "VENCIMENTO_EXPIRADO",
          sent_to: recipients.join(", "),
          status: "FAILED",
          error_message: e.message
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Alertas processados",
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    )
  }
})

function generateAlertEmail(contract: PendingContract, type: "10_DIAS" | "VENCIDO"): string {
  const isOverdue = type === "VENCIDO"
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${isOverdue ? '#EF4444' : '#F59E0B'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
        .footer { background: #374151; color: white; padding: 15px; border-radius: 0 0 8px 8px; font-size: 12px; }
        .info-row { display: flex; border-bottom: 1px solid #e5e7eb; padding: 10px 0; }
        .info-label { font-weight: bold; width: 150px; }
        .btn { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${isOverdue ? '🚨 Contrato Vencido!' : '⚠️ Contrato Vencendo em 10 dias'}</h1>
        </div>
        <div class="content">
          <p>${isOverdue 
            ? 'O seguinte contrato está <strong>VENCIDO</strong> e precisa de atenção imediata:' 
            : 'O seguinte contrato vence em <strong>10 dias</strong>:'}</p>
          
          <div class="info-row">
            <span class="info-label">Evento:</span>
            <span>${contract.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data do Evento:</span>
            <span>${new Date(contract.event_date).toLocaleDateString('pt-BR')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Vencimento:</span>
            <span>${new Date(contract.contract_due_date).toLocaleDateString('pt-BR')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Criado por:</span>
            <span>${contract.created_by_name}</span>
          </div>
          
          <a href="${Deno.env.get('APP_URL')}/eventos/${contract.id}" class="btn">
            Ver Detalhes do Evento
          </a>
        </div>
        <div class="footer">
          <p>Este é um e-mail automático do Sistema de Calendário de Eventos.</p>
          <p>Em caso de dúvidas, entre em contato com o administrador.</p>
        </div>
      </div>
    </body>
    </html>
  `
}