// components/layout/DashboardShell.tsx
'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

interface UserProfile {
  id: string
  user_id: string
  full_name: string
  role: string
}

interface DashboardShellProps {
  profile: UserProfile | null
  children: React.ReactNode
}

// Context para compartilhar estado entre componentes se necessário
interface SidebarContextType {
  collapsed: boolean
  setCollapsed: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
})

export const useSidebar = () => useContext(SidebarContext)

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Carregar estado do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setCollapsed(JSON.parse(saved))
    }
    setMounted(true)
  }, [])

  // Salvar estado no localStorage
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed))
    }
  }, [collapsed, mounted])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar para desktop */}
        <Sidebar 
          profile={profile} 
          collapsed={collapsed} 
          onToggle={() => setCollapsed(!collapsed)} 
        />
        
        {/* Conteúdo principal — transição suave */}
        <div 
          className="transition-all duration-300 ease-in-out"
          style={{ paddingLeft: mounted ? undefined : '18rem' }}
        >
          <div className={`hidden lg:block ${collapsed ? 'lg:pl-[68px]' : 'lg:pl-72'} transition-all duration-300`}>
            <Header profile={profile} />
            <main className="p-4 lg:p-8">
              {children}
            </main>
          </div>
          
          {/* Mobile: sem sidebar padding */}
          <div className="lg:hidden">
            <Header profile={profile} />
            <main className="p-4">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarContext.Provider>
  )
}