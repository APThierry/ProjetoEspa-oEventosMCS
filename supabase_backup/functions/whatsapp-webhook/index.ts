// supabase/functions/whatsapp-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import OpenAI from "https://esm.sh/openai@4"

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY")
})

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// Definição das funções que a IA pode chamar
const availableFunctions = [
  {
    name: "get_events_by_month",
    description: "Busca eventos de um mês específico",
    parameters: {
      type: "object",
      properties: {
        month: {
          type: "integer",
          description: "Número do mês (1-12)"
        },
        year: {
          type: "integer",
          description: "Ano (ex: 2024)"
        }
      },
      required: ["month"]
    }
  },
  {
    name: "get_pending_contracts",
    description: "Lista contratos pendentes de pagamento",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          description: "Quantidade máxima de resultados"
        }
      }
    }
  },
  {
    name: "get_events_summary",
    description: "Retorna resumo/estatísticas de eventos de um período",
    parameters: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["week", "month", "quarter", "year"],
          description: "Período do resumo"
        }
      },
      required: ["period"]
    }
  },
  {
    name: "search_events",
    description: "Busca eventos por nome ou características",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Termo de busca"
        },
        event_type: {
          type: "string",
          enum: ["MARKETING", "FUNDO_CONTRATO"],
          description: "Filtrar por tipo de evento"
        }
      }
    }
  }
]

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

    const body = await req.json()
    
    // Estrutura esperada do Evolution API
    const { 
      data: { 
        key: { remoteJid }, 
        message: { conversation: userMessage } 
      } 
    } = body

    const phoneNumber = remoteJid.replace("@s.whatsapp.net", "")

    // Verificar se número está autorizado (opcional)
    const { data: authorizedUser } = await supabaseAdmin
      .from('whatsapp_authorized_numbers')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single()

    // Chat com OpenAI usando Function Calling
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `Você é um assistente do sistema de calendário de eventos da empresa. 
          Você ajuda os usuários a consultar eventos, contratos pendentes e relatórios.
          Responda sempre em português de forma clara e concisa.
          Use emojis para tornar as respostas mais amigáveis.
          Hoje é ${new Date().toLocaleDateString('pt-BR')}.`
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      functions: availableFunctions,
      function_call: "auto"
    })

    const responseMessage = completion.choices[0].message

    let finalResponse: string

    // Se a IA decidiu chamar uma função
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name
      const functionArgs = JSON.parse(responseMessage.function_call.arguments)

      // Executar a função correspondente
      const functionResult = await executeFunction(
        supabaseAdmin, 
        functionName, 
        functionArgs
      )

      // Enviar resultado de volta para a IA formatar
      const secondCompletion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente do sistema de calendário de eventos.
            Formate a resposta de forma clara para WhatsApp (texto simples com emojis).
            Seja conciso e organize bem as informações.`
          },
          {
            role: "user",
            content: userMessage
          },
          responseMessage,
          {
            role: "function",
            name: functionName,
            content: JSON.stringify(functionResult)
          }
        ]
      })

      finalResponse = secondCompletion.choices[0].message.content || 
        "Desculpe, não consegui processar sua solicitação."
    } else {
      finalResponse = responseMessage.content || 
        "Desculpe, não entendi. Pode reformular?"
    }

    // Enviar resposta de volta pelo Evolution API
    await sendWhatsAppMessage(phoneNumber, finalResponse)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error("Erro:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})

// Executor de funções
async function executeFunction(
  supabase: any, 
  functionName: string, 
  args: any
): Promise<any> {
  const currentYear = new Date().getFullYear()

  switch (functionName) {
    case "get_events_by_month": {
      const year = args.year || currentYear
      const startDate = new Date(year, args.month - 1, 1)
      const endDate = new Date(year, args.month, 0)

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', startDate.toISOString().split('T')[0])
        .lte('event_date', endDate.toISOString().split('T')[0])
        .order('event_date')

      if (error) throw error
      return { events: data, count: data.length, month: args.month, year }
    }

    case "get_pending_contracts": {
      const { data, error } = await supabase
        .from('pending_contracts')
        .select('*')
        .order('contract_due_date')
        .limit(args.limit || 10)

      if (error) throw error
      return { contracts: data, count: data.length }
    }

    case "get_events_summary": {
      let startDate: Date
      let endDate = new Date()

      switch (args.period) {
        case "week":
          startDate = new Date()
          startDate.setDate(startDate.getDate() - 7)
          break
        case "month":
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case "quarter":
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case "year":
          startDate = new Date()
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
        default:
          startDate = new Date()
          startDate.setMonth(startDate.getMonth() - 1)
      }

      const { data, error } = await supabase
        .rpc('get_report_statistics', {
          p_start_date: startDate.toISOString().split('T')[0],
          p_end_date: endDate.toISOString().split('T')[0]
        })

      if (error) throw error
      return { summary: data, period: args.period }
    }

    case "search_events": {
      let query = supabase
        .from('events')
        .select('*')
        .ilike('name', `%${args.query}%`)

      if (args.event_type) {
        query = query.eq('event_type', args.event_type)
      }

      const { data, error } = await query.limit(10)

      if (error) throw error
      return { events: data, count: data.length, searchTerm: args.query }
    }

    default:
      throw new Error(`Função desconhecida: ${functionName}`)
  }
}

// Enviar mensagem via Evolution API
async function sendWhatsAppMessage(phone: string, message: string) {
  const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL")
  const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY")
  const instanceName = Deno.env.get("EVOLUTION_INSTANCE_NAME")

  const response = await fetch(
    `${evolutionApiUrl}/message/sendText/${instanceName}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Erro ao enviar WhatsApp: ${response.statusText}`)
  }

  return response.json()
}