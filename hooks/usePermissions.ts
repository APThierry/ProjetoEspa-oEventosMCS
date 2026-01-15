'use client'

import { useUser } from './useUser'
import { UserRole } from '@/lib/types'

export function usePermissions() {
  const { user, loading } = useUser()
  const role = user?.profile?.role

  const permissions = {
    // Visualização
    canViewCalendar: true,
    canViewEvents: true,
    canViewReports: role === 'ADMIN' || role === 'EDITOR',
    
    // Eventos
    canCreateEvent: role === 'ADMIN' || role === 'EDITOR',
    canEditEvent: role === 'ADMIN' || role === 'EDITOR',
    canDeleteEvent: role === 'ADMIN' || role === 'EDITOR',
    
    // Usuários
    canViewUsers: role === 'ADMIN',
    canManageUsers: role === 'ADMIN',
    
    // Configurações
    canViewSettings: role === 'ADMIN',
    canManageSettings: role === 'ADMIN',
    
    // Alertas
    canViewAlertLogs: role === 'ADMIN' || role === 'EDITOR',
  }

  const checkPermission = (permission: keyof typeof permissions): boolean => {
    return permissions[permission] ?? false
  }

  const requireRole = (requiredRole: UserRole): boolean => {
    if (!role) return false
    
    const roleHierarchy: Record<UserRole, number> = {
      VISUALIZADOR: 1,
      EDITOR: 2,
      ADMIN: 3
    }
    
    return roleHierarchy[role] >= roleHierarchy[requiredRole]
  }

  return {
    ...permissions,
    checkPermission,
    requireRole,
    loading,
    role
  }
}