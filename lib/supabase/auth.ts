// lib/supabase/auth.ts
import { createClient } from './server'

export async function signUp(email: string, password: string, fullName: string) {
  const supabase = await createClient()
  
  // 1. Criar usuário no Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })
  
  if (authError) throw authError
  
  // 2. Criar perfil (o trigger faz isso automaticamente, mas podemos fazer manual)
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        full_name: fullName,
        role: 'VISUALIZADOR' // Padrão
      })
    
    if (profileError) throw profileError
  }
  
  return authData
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  // Buscar perfil com role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  return {
    ...user,
    profile
  }
}