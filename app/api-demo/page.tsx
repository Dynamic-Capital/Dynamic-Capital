'use client'

import { useEffect, useState } from 'react'

export default function ApiDemoPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const res = await fetch('/api/hello')
        const data = await res.json()
        setMessage(data.message)
      } catch (err) {
        setError('Error fetching message')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessage()
  }, [])

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">API Demo</h1>
      {isLoading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      {message && <p>{message}</p>}
    </main>
  )
}
