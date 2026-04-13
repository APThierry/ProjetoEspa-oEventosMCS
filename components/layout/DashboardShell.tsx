// components/layout/DashboardShell.tsx
'use client'

import { useState, useEffect } from 'react'
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

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) {
      setCollapsed(JSON.parse(saved))
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed))
    }
  }, [collapsed, mounted])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        profile={profile} 
        collapsed={collapsed} 
        onToggle={() => setCollapsed(!collapsed)} 
      />
      
      {/* ✅ FIX: Conteúdo único — sem duplicação */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          mounted 
            ? (collapsed ? 'lg:pl-[68px]' : 'lg:pl-72') 
            : 'lg:pl-72'
        }`}
      >
        <Header profile={profile} />
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}