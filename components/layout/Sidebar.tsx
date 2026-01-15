'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, CalendarDays, BarChart3, Users, Settings } from 'lucide-react'

interface UserProfile {
  id: string
  user_id: string
  full_name: string
  role: string
}

interface SidebarProps {
  profile: UserProfile | null
}

const navigation = [
  { name: 'Calendário', href: '/', icon: Calendar },
  { name: 'Eventos', href: '/eventos', icon: CalendarDays },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3, roles: ['ADMIN', 'EDITOR'] },
  { name: 'Usuários', href: '/usuarios', icon: Users, roles: ['ADMIN'] },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, roles: ['ADMIN'] },
]

export function Sidebar({ profile }: SidebarProps) {
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

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Calendário</h1>
            <p className="text-xs text-gray-500">Marketing</p>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex flex-1 flex-col">
          <ul className="flex flex-1 flex-col gap-y-1">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href))
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`group flex gap-x-3 rounded-lg p-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Info do usuário */}
          <div className="mt-auto pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {profile?.full_name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500">
                  {getRoleLabel(profile?.role || '')}
                </p>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  )
}