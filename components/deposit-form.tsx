'use client'

import { useState, FormEvent, ChangeEvent } from 'react'
import { supabase } from '@/integrations/supabase/client'

export default function DepositForm() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setFile(f ?? null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!file) {
      setStatus('Please select an image receipt.')
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setStatus('Uploading...')
    try {
      const { error } = await supabase.functions.invoke('telegram-bot', {
        body: formData,
      })
      if (error) {
        throw error
      }
      setStatus('Deposit submitted successfully.')
      setFile(null)
    } catch (err: any) {
      setStatus(`Error: ${err.message}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-base">
      <input
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="border border-input rounded-md p-sm bg-background text-foreground"
      />
      <button
        type="submit"
        className="bg-primary text-primary-foreground px-base py-sm rounded-md"
      >
        Submit
      </button>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </form>
  )
}

