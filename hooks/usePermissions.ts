'use client'

import { useUser } from './useUser'

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

  return {
    ...permissions,
    loading,
    role
  }
}