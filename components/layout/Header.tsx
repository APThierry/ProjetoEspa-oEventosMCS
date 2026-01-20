'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ChangePasswordDialog } from '@/components/shared/ChangePasswordDialog'
import { LogOut, Menu, Key, Settings, Shield, Loader2 } from 'lucide-react'

interface UserProfile {
  id: string
  user_id: string
  full_name: string
  role: string
}

interface HeaderProps {
  profile: UserProfile | null
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  EDITOR: 'Editor',
  VISUALIZADOR: 'Visualizador',
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800',
  EDITOR: 'bg-blue-100 text-blue-800',
  VISUALIZADOR: 'bg-gray-100 text-gray-800',
}

export function Header({ profile }: HeaderProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSignOut = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      toast({
        title: 'Até logo!',
        description: 'Você foi desconectado.',
      })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Erro ao sair:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível sair. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoggingOut(false)
    }
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  const role = profile?.role || 'VISUALIZADOR'

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 lg:px-8">
        {/* Mobile menu button */}
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>

        {/* Espaçador */}
        <div className="flex-1" />

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-600 text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none">
                  {profile?.full_name || 'Usuário'}
                </p>
                <Badge className={`w-fit text-xs ${ROLE_COLORS[role]}`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {ROLE_LABELS[role]}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* ✅ NOVO: Alterar Senha */}
            <DropdownMenuItem 
              onClick={() => setShowPasswordDialog(true)}
              className="cursor-pointer"
            >
              <Key className="mr-2 h-4 w-4" />
              Alterar Senha
            </DropdownMenuItem>
            
            {/* ✅ NOVO: Configurações */}
            <DropdownMenuItem 
              onClick={() => router.push('/configuracoes')}
              className="cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* Sair */}
            <DropdownMenuItem 
              onClick={handleSignOut} 
              className="cursor-pointer text-red-600 focus:text-red-600"
              disabled={loggingOut}
            >
              {loggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ✅ Dialog de Alterar Senha */}
      <ChangePasswordDialog 
        isOpen={showPasswordDialog} 
        onClose={() => setShowPasswordDialog(false)} 
      />
    </>
  )
}