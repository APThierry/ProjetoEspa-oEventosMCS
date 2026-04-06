// app/api/email/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

// Tipos de e-mail suportados
type EmailType = 'contract_alert' | 'payment_reminder' | 'event_confirmation' | 'weekly_report' | 'test';

interface SendEmailRequest {
  type: EmailType;
  to: string | string[];
  cc?: string | string[];
  data?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body: SendEmailRequest = await request.json();
    const { type, to, cc, data } = body;

    // Validação básica
    if (!type || !to) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: type, to' },
        { status: 400 }
      );
    }

    // Gerar conteúdo do e-mail baseado no tipo
    const emailContent = getEmailContent(type, data);

    // Enviar e-mail usando Microsoft Graph
    const result = await sendEmail({
      to,
      cc,
      subject: emailContent.subject,
      html: emailContent.html,
      importance: type === 'contract_alert' ? 'high' : 'normal',
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Falha ao enviar e-mail', details: result.error },
        { status: 500 }
      );
    }

    // Log no banco
    await logEmailSent(supabase, {
      type,
      to: Array.isArray(to) ? to.join(', ') : to,
      messageId: result.messageId,
      sentBy: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'E-mail enviado com sucesso',
      messageId: result.messageId,
    });

  } catch (error: any) {
    console.error('Erro na API de e-mail:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error.message },
      { status: 500 }
    );
  }
}

// Função para gerar conteúdo do e-mail
function getEmailContent(type: EmailType, data?: Record<string, any>) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seu-app.vercel.app';
  
  switch (type) {
    case 'contract_alert':
      return {
        subject: `⚠️ Alerta: Contrato pendente - ${data?.eventName || 'Evento'}`,
        html: generateContractAlertHTML(data, baseUrl),
      };
    
    case 'payment_reminder':
      return {
        subject: `💰 Lembrete: Pagamento pendente - ${data?.eventName || 'Evento'}`,
        html: generatePaymentReminderHTML(data, baseUrl),
      };
    
    case 'event_confirmation':
      return {
        subject: `✅ Evento confirmado - ${data?.eventName || 'Evento'}`,
        html: generateEventConfirmationHTML(data, baseUrl),
      };

    case 'weekly_report':
      return {
        subject: `📊 Relatório Semanal de Eventos - ${data?.period || 'Esta semana'}`,
        html: generateWeeklyReportHTML(data, baseUrl),
      };
    
    case 'test':
      return {
        subject: '🧪 Teste de E-mail - Sistema de Eventos MCS',
        html: generateTestEmailHTML(baseUrl),
      };
    
    default:
      return {
        subject: 'Notificação - Sistema de Eventos',
        html: '<p>Você recebeu uma notificação do sistema.</p>',
      };
  }
}

// ============================================
// TEMPLATES DE E-MAIL
// ============================================

function generateContractAlertHTML(data?: Record<string, any>, baseUrl?: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Alerta de Contrato</h1>
          </td>
        </tr>
        
        <!-- Content -->
        <tr>
          <td style="padding: 30px;">
            <p style="margin: 0 0 20px;">Olá,</p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 0 0 20px; border-radius: 0 8px 8px 0;">
              <strong>Atenção:</strong> O contrato do evento abaixo precisa de ação.
            </div>
            
            <table width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Evento:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">${data?.eventName || 'Não informado'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Data do Evento:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">${data?.eventDate || 'Não informado'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Vencimento:</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600; text-align: right;">${data?.contractDueDate || 'Não informado'}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #6b7280;">Dias Restantes:</td>
                <td style="padding: 12px 0; font-weight: 600; text-align: right; color: #dc2626;">${data?.daysRemaining || 'N/A'} dias</td>
              </tr>
            </table>
            
            ${data?.observations ? `<p style="margin: 20px 0 0;"><strong>Observações:</strong> ${data.observations}</p>` : ''}
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${baseUrl}/eventos/${data?.eventId || ''}" style="display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Ver Evento no Sistema
              </a>
            </div>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0 0 5px; font-weight: 600;">Sistema Digital de Eventos</p>
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">Monte Carmo Shopping</p>
            <p style="color: #6b7280; margin: 15px 0 0; font-size: 11px;">Este é um e-mail automático. Por favor, não responda.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generatePaymentReminderHTML(data?: Record<string, any>, baseUrl?: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💰 Lembrete de Pagamento</h1>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 30px;">
            <p style="margin: 0 0 20px;">Olá,</p>
            
            <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; margin: 0 0 20px; border-radius: 0 8px 8px 0;">
              <strong>Lembrete:</strong> Existe um pagamento pendente para o evento abaixo.
            </div>
            
            <p><strong>Evento:</strong> ${data?.eventName || 'Não informado'}</p>
            <p><strong>Data do Evento:</strong> ${data?.eventDate || 'Não informado'}</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 36px; font-weight: 700; color: #1d4ed8; margin: 0;">R$ ${data?.pendingAmount || '0,00'}</p>
              <p style="color: #6b7280; margin: 5px 0 0;">Valor Pendente</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${baseUrl}/eventos/${data?.eventId || ''}" style="display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Ver Detalhes
              </a>
            </div>
          </td>
        </tr>
        
        <tr>
          <td style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0 0 5px; font-weight: 600;">Sistema Digital de Eventos</p>
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">Monte Carmo Shopping</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generateEventConfirmationHTML(data?: Record<string, any>, baseUrl?: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Evento Confirmado</h1>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 30px; text-align: center;">
            <div style="font-size: 64px; margin: 0 0 20px;">🎉</div>
            
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 0 0 20px; border-radius: 0 8px 8px 0; text-align: left;">
              <strong>Sucesso!</strong> O evento foi confirmado no sistema.
            </div>
            
            <div style="text-align: left;">
              <p><strong>Evento:</strong> ${data?.eventName || 'Não informado'}</p>
              <p><strong>Data:</strong> ${data?.eventDate || 'Não informado'}</p>
              <p><strong>Tipo:</strong> ${data?.eventType || 'Não informado'}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: 600;">Reserva Confirmada</span></p>
            </div>
          </td>
        </tr>
        
        <tr>
          <td style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0 0 5px; font-weight: 600;">Sistema Digital de Eventos</p>
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">Monte Carmo Shopping</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generateWeeklyReportHTML(data?: Record<string, any>, baseUrl?: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📊 Relatório Semanal</h1>
            <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">${data?.period || 'Esta semana'}</p>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 30px;">
            <h2 style="margin: 0 0 20px; color: #1f2937;">Resumo da Semana</h2>
            
            <table width="100%" style="border-collapse: collapse; margin-bottom: 30px;">
              <tr>
                <td style="padding: 15px; background: #f0fdf4; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="font-size: 28px; font-weight: 700; color: #10b981;">${data?.totalEvents || 0}</div>
                  <div style="color: #6b7280; font-size: 12px;">Eventos</div>
                </td>
                <td style="padding: 15px; background: #eff6ff; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="font-size: 28px; font-weight: 700; color: #3b82f6;">${data?.confirmedEvents || 0}</div>
                  <div style="color: #6b7280; font-size: 12px;">Confirmados</div>
                </td>
                <td style="padding: 15px; background: #fef3c7; border-radius: 8px; text-align: center; width: 33%;">
                  <div style="font-size: 28px; font-weight: 700; color: #f59e0b;">${data?.pendingContracts || 0}</div>
                  <div style="color: #6b7280; font-size: 12px;">Contratos Pendentes</div>
                </td>
              </tr>
            </table>
            
            <div style="text-align: center;">
              <a href="${baseUrl}/relatorios" style="display: inline-block; background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Ver Relatório Completo
              </a>
            </div>
          </td>
        </tr>
        
        <tr>
          <td style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0 0 5px; font-weight: 600;">Sistema Digital de Eventos</p>
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">Monte Carmo Shopping</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function generateTestEmailHTML(baseUrl?: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f3f4f6;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <tr>
          <td style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🧪 Teste de E-mail</h1>
          </td>
        </tr>
        
        <tr>
          <td style="padding: 40px; text-align: center;">
            <div style="font-size: 72px; margin: 0 0 20px;">✅</div>
            <h2 style="color: #10b981; margin: 0 0 10px;">Funcionando Perfeitamente!</h2>
            <p style="color: #6b7280; margin: 0;">O sistema de e-mails está configurado corretamente com o Microsoft 365.</p>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>Data/Hora do Teste:</strong><br>
                ${new Date().toLocaleString('pt-BR', { 
                  dateStyle: 'full', 
                  timeStyle: 'medium',
                  timeZone: 'America/Sao_Paulo'
                })}
              </p>
            </div>

            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Enviado via Microsoft Graph API
            </p>
          </td>
        </tr>
        
        <tr>
          <td style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #ffffff; margin: 0 0 5px; font-weight: 600;">Sistema Digital de Eventos</p>
            <p style="color: #9ca3af; margin: 0; font-size: 14px;">Monte Carmo Shopping</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Função para registrar log no banco
async function logEmailSent(
  supabase: any, 
  data: { type: string; to: string; messageId?: string; sentBy?: string }
) {
  try {
    await supabase.from('alert_logs').insert({
      alert_type: `email_${data.type}`,
      sent_to: data.to,
      status: 'SENT',
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao registrar log de e-mail:', error);
  }
}