// app/api/users/route.ts
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Cliente admin com service role key (para criar usuários)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Função para verificar se o usuário logado é ADMIN
async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; error?: string }> {
  try {
    const cookieStore = cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    // Verificar usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { isAdmin: false, error: 'Usuário não autenticado' }
    }

    // Buscar perfil do usuário para verificar role
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return { isAdmin: false, error: 'Perfil não encontrado' }
    }

    if (profile.role !== 'ADMIN') {
      return { isAdmin: false, error: 'Apenas administradores podem criar usuários' }
    }

    return { isAdmin: true }
  } catch (error) {
    console.error('Erro ao verificar admin:', error)
    return { isAdmin: false, error: 'Erro ao verificar permissões' }
  }
}

export async function POST(request: NextRequest) {
  try {
    // ✅ VERIFICAR SE É ADMIN ANTES DE TUDO
    const { isAdmin, error: adminError } = await verifyAdmin(request)
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: adminError || 'Acesso negado' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, password, full_name, role } = body

    // Validações básicas
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Email, senha e nome são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    // Validar role
    const validRoles = ['ADMIN', 'EDITOR', 'VISUALIZADOR']
    const userRole = role && validRoles.includes(role) ? role : 'VISUALIZADOR'

    // Criar usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name
      }
    })

    if (authError) {
      console.error('Erro ao criar usuário no Auth:', authError)
      
      if (authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Este e-mail já está cadastrado' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 500 }
      )
    }

    // Criar perfil do usuário
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: authData.user.id,
        full_name,
        role: userRole,
        notification_email: email,
        receive_alerts: true,
        receive_reports: true
      }, {
        onConflict: 'user_id'
      })

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError)
      // Não falhar - o trigger pode criar
    }

    return NextResponse.json({
      success: true,
      message: 'Usuário criado com sucesso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name,
        role: userRole
      }
    })

  } catch (error) {
    console.error('Erro na API:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Opcional: GET para listar usuários (também só para ADMIN)
export async function GET(request: NextRequest) {
  try {
    const { isAdmin, error: adminError } = await verifyAdmin(request)
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: adminError || 'Acesso negado' },
        { status: 403 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ users: data })
  } catch (error) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json(
      { error: 'Erro ao listar usuários' },
      { status: 500 }
    )
  }
}