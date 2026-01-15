'use client'

import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { UserProfile, AuthUser } from '@/lib/types'

export function useUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Buscar usuário atual
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          // Buscar perfil
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', authUser.id)
            .single()

          setUser({
            id: authUser.id,
            email: authUser.email!,
            profile
          })
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          setUser({
            id: session.user.id,
            email: session.user.email!,
            profile
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
    isAdmin: user?.profile?.role === 'ADMIN',
    isEditor: user?.profile?.role === 'EDITOR' || user?.profile?.role === 'ADMIN',
    role: user?.profile?.role
  }
}