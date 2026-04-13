// hooks/useUser.ts
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  user_id: string
  full_name: string
  role: string
  avatar_url: string | null
  notification_email: string | null
  receive_alerts: boolean
  receive_reports: boolean
}

interface AuthUser {
  id: string
  email: string
  profile: UserProfile | null
}

// ✅ Cache global para evitar re-fetch entre componentes
let cachedUser: AuthUser | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30000 // 30 segundos

export function useUser() {
  const [user, setUser] = useState<AuthUser | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser) // Se tem cache, não mostra loading
  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string, email: string) => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      const authUser: AuthUser = {
        id: userId,
        email,
        profile: profile || null,
      }

      // Atualizar cache global
      cachedUser = authUser
      cacheTimestamp = Date.now()

      setUser(authUser)
      return authUser
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
      return null
    }
  }, [supabase])

  useEffect(() => {
    const getUser = async () => {
      // ✅ Se tem cache válido, usar ele
      if (cachedUser && (Date.now() - cacheTimestamp) < CACHE_TTL) {
        setUser(cachedUser)
        setLoading(false)
        return
      }

      try {
        // ✅ Tentar getUser primeiro
        let { data: { user: authUser } } = await supabase.auth.getUser()
        
        // ✅ Se falhou, tentar refresh da sessão
        if (!authUser) {
          console.warn('⚠️ useUser: getUser falhou, tentando refresh...')
          const { data: refreshData } = await supabase.auth.refreshSession()
          authUser = refreshData?.user || null
        }

        if (authUser) {
          await fetchProfile(authUser.id, authUser.email!)
        } else {
          setUser(null)
          cachedUser = null
        }
      } catch (error) {
        console.error('Erro ao buscar usuário:', error)
        setUser(null)
        cachedUser = null
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // ✅ Listener de mudança de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔑 Auth state changed:', event)
        
        if (event === 'SIGNED_OUT') {
          setUser(null)
          cachedUser = null
          cacheTimestamp = 0
          setLoading(false)
          return
        }

        if (session?.user) {
          await fetchProfile(session.user.id, session.user.email!)
        }
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile, supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    cachedUser = null
    cacheTimestamp = 0
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