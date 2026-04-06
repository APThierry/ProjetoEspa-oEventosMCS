// app/api/email/verify/route.ts
import { NextResponse } from 'next/server';
import { verifyEmailConfiguration } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const result = await verifyEmailConfiguration();
    
    return NextResponse.json({
      ...result,
      provider: 'Microsoft Graph API',
      fromEmail: process.env.EMAIL_FROM,
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}