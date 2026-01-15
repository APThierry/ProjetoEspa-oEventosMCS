import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar perfil do usuário
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar para desktop */}
      <Sidebar profile={profile} />
      
      {/* Conteúdo principal */}
      <div className="lg:pl-72">
        <Header profile={profile} />
        
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}