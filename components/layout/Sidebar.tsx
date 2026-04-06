// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Calendar, 
  CalendarDays, 
  BarChart3, 
  Users, 
  Settings,
  LayoutDashboard,
  Receipt,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface UserProfile {
  id: string
  user_id: string
  full_name: string
  role: string
}

interface SidebarProps {
  profile: UserProfile | null
  collapsed?: boolean
  onToggle?: () => void
}

const navigation = [
  { name: 'Calendário', href: '/', icon: LayoutDashboard },
  { name: 'Eventos', href: '/eventos', icon: CalendarDays },
  { name: 'Despesas', href: '/despesas', icon: Receipt, roles: ['ADMIN', 'EDITOR'] },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3, roles: ['ADMIN', 'EDITOR'] },
  { name: 'Usuários', href: '/usuarios', icon: Users, roles: ['ADMIN'] },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, roles: ['ADMIN'] },
]

export function Sidebar({ profile, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const userRole = profile?.role || 'VISUALIZADOR'

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  })

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrador'
      case 'EDITOR': return 'Editor'
      default: return 'Visualizador'
    }
  }

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' || pathname === '/calendario'
    }
    return pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside 
        className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-all duration-300 ease-in-out ${
          collapsed ? 'lg:w-[68px]' : 'lg:w-72'
        }`}
      >
        <div className="flex grow flex-col gap-y-5 overflow-y-auto overflow-x-hidden bg-white border-r border-gray-200 pb-4">
          
          {/* ── Logo ── */}
          <div className={`flex h-16 shrink-0 items-center gap-3 px-4 ${collapsed ? 'justify-center' : 'px-6'}`}>
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            {!collapsed && (
              <div className="overflow-hidden transition-all duration-300">
                <h1 className="font-bold text-lg whitespace-nowrap">Calendário</h1>
                <p className="text-xs text-gray-500 whitespace-nowrap">Gestão de Eventos</p>
              </div>
            )}
          </div>

          {/* ── Navegação ── */}
          <nav className={`flex flex-1 flex-col ${collapsed ? 'px-2' : 'px-4'}`}>
            <ul className="flex flex-1 flex-col gap-y-1">
              {filteredNavigation.map((item) => {
                const active = isActive(item.href)
                
                const linkContent = (
                  <Link
                    href={item.href}
                    className={`group flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${
                      collapsed 
                        ? 'justify-center p-3' 
                        : 'gap-x-3 p-3'
                    } ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <span className="whitespace-nowrap overflow-hidden transition-all duration-300">
                        {item.name}
                      </span>
                    )}
                  </Link>
                )

                // Se colapsado, envolver com Tooltip
                if (collapsed) {
                  return (
                    <li key={item.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {linkContent}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          <p>{item.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  )
                }

                return <li key={item.name}>{linkContent}</li>
              })}
            </ul>

            {/* ── Info do usuário ── */}
            <div className="mt-auto space-y-2 pt-4 border-t border-gray-200">
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex justify-center py-2">
                      <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium cursor-default">
                        {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    <p className="font-medium">{profile?.full_name || 'Usuário'}</p>
                    <p className="text-xs text-gray-400">{getRoleLabel(profile?.role || '')}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium shrink-0">
                    {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {profile?.full_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRoleLabel(profile?.role || '')}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Botão Ocultar/Expandir ── */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onToggle}
                    className={`flex items-center w-full rounded-lg p-3 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 ${
                      collapsed ? 'justify-center' : 'gap-x-3'
                    }`}
                  >
                    {collapsed ? (
                      <ChevronsRight className="h-5 w-5 shrink-0" />
                    ) : (
                      <>
                        <ChevronsLeft className="h-5 w-5 shrink-0" />
                        <span className="whitespace-nowrap">Ocultar</span>
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={8}>
                    <p>Expandir menu</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </nav>
        </div>
      </aside>
    </TooltipProvider>
  )
}