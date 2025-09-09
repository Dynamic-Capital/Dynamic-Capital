'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/integrations/supabase/client'

type BotUser = {
  id: string
  username: string | null
  full_name?: string | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<BotUser | null>(null)

  useEffect(() => {
    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const authUser = session?.user
      if (authUser) {
        const { data } = await supabase
          .from('bot_users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        if (data) {
          setUser(data as BotUser)
        }
      }
    }
    load()
  }, [])

  return (
    <main className="container py-xl">
      <h1 className="text-3xl font-bold mb-lg">
        {user ? `Welcome, ${user.username || user.full_name || 'User'}!` : 'Welcome!'}
      </h1>
      <div className="flex gap-base">
        <Link
          href="/deposit"
          className="px-base py-sm bg-primary text-primary-foreground rounded-md"
        >
          Deposit
        </Link>
        <Link
          href="/settings"
          className="px-base py-sm bg-secondary text-secondary-foreground rounded-md"
        >
          Settings
        </Link>
      </div>
    </main>
  )
}
