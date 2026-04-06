// lib/email.ts
import { ClientSecretCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';

// Configuração das credenciais Azure
const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);

// Provider de autenticação
const authProvider = new TokenCredentialAuthenticationProvider(credential, {
  scopes: ['https://graph.microsoft.com/.default'],
});

// Cliente do Microsoft Graph
const graphClient = Client.initWithMiddleware({
  authProvider,
});

// Tipos
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  importance?: 'low' | 'normal' | 'high';
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Função principal de envio de e-mail
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const fromEmail = process.env.EMAIL_FROM || 'suporte@montecarmoshopping.com.br';
    
    // Preparar destinatários
    const toRecipients = (Array.isArray(options.to) ? options.to : [options.to]).map(email => ({
      emailAddress: { address: email }
    }));

    // Preparar CC (opcional)
    const ccRecipients = options.cc 
      ? (Array.isArray(options.cc) ? options.cc : [options.cc]).map(email => ({
          emailAddress: { address: email }
        }))
      : [];

    // Preparar BCC (opcional)
    const bccRecipients = options.bcc
      ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]).map(email => ({
          emailAddress: { address: email }
        }))
      : [];

    // Construir mensagem
    const message = {
      subject: options.subject,
      body: {
        contentType: 'HTML',
        content: options.html,
      },
      toRecipients,
      ccRecipients,
      bccRecipients,
      importance: options.importance || 'normal',
    };

    // Enviar e-mail usando Graph API
    // Envia "em nome de" o email configurado
    await graphClient
      .api(`/users/${fromEmail}/sendMail`)
      .post({
        message,
        saveToSentItems: true, // Salvar em "Itens Enviados"
      });

    console.log(`✅ E-mail enviado com sucesso para: ${options.to}`);
    
    return { 
      success: true, 
      messageId: `graph-${Date.now()}` 
    };

  } catch (error: any) {
    console.error('❌ Erro ao enviar e-mail:', error);
    
    // Extrair mensagem de erro mais útil
    let errorMessage = error.message || 'Erro desconhecido';
    if (error.body) {
      try {
        const body = JSON.parse(error.body);
        errorMessage = body.error?.message || errorMessage;
      } catch {
        // Ignorar erro de parse
      }
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

// Função para verificar se a configuração está OK
export async function verifyEmailConfiguration(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const fromEmail = process.env.EMAIL_FROM || 'suporte@montecarmoshopping.com.br';
    
    // Tentar obter informações do usuário (verifica se temos acesso)
    const user = await graphClient
      .api(`/users/${fromEmail}`)
      .select('displayName,mail,userPrincipalName')
      .get();

    return {
      success: true,
      message: 'Configuração verificada com sucesso',
      details: {
        displayName: user.displayName,
        email: user.mail || user.userPrincipalName,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Falha na verificação',
    };
  }
}