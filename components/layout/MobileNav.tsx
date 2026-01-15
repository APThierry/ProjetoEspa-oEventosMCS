'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserProfile } from '@/lib/types'
import { Calendar, CalendarDays, BarChart3, Users, Settings } from 'lucide-react'
import { SheetClose } from '@/components/ui/sheet'

interface MobileNavProps {
  profile: UserProfile | null
}

const navigation = [
  { name: 'Calendário', href: '/', icon: Calendar },
  { name: 'Eventos', href: '/eventos', icon: CalendarDays },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart3, roles: ['ADMIN', 'EDITOR'] },
  { name: 'Usuários', href: '/usuarios', icon: Users, roles: ['ADMIN'] },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, roles: ['ADMIN'] },
]

export function MobileNav({ profile }: MobileNavProps) {
  const pathname = usePathname()
  const userRole = profile?.role || 'VISUALIZADOR'

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(userRole)
  })

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <span className="font-bold">Calendário</span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-4 py-4">
        <ul className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))

            return (
              <li key={item.name}>
                <SheetClose asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                </SheetClose>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}