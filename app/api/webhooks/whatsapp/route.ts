// app/api/webhooks/whatsapp/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET - Verificação do webhook (usado pelo WhatsApp/Meta para validar)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verificação do webhook
  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook WhatsApp verificado')
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ 
    status: 'WhatsApp webhook endpoint',
    message: 'Aguardando configuração futura'
  })
}

// POST - Receber mensagens do WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('📱 Webhook WhatsApp recebido:', JSON.stringify(body, null, 2))

    // TODO: Implementar processamento de mensagens
    // Esta funcionalidade será implementada na fase futura

    return NextResponse.json({ 
      success: true,
      message: 'Webhook recebido'
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('❌ Erro no webhook WhatsApp:', errorMessage)
    
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    )
  }
}