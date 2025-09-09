'use client'

import { useEffect, useState, FormEvent, ChangeEvent } from 'react'

const themes = ['light', 'dark', 'glass'] as const

type Theme = (typeof themes)[number]

export default function SettingsPage() {
  const [theme, setTheme] = useState<Theme>('light')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/functions/v1/theme-save')
        if (res.ok) {
          const data = await res.json()
          if (data.theme) {
            setTheme(data.theme as Theme)
            applyTheme(data.theme)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const applyTheme = (t: Theme) => {
    document.documentElement.className = t
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value as Theme
    setTheme(val)
    applyTheme(val)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/functions/v1/theme-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      })
      if (!res.ok) {
        throw new Error(await res.text())
      }
      setStatus('Preference saved.')
    } catch (err: any) {
      setStatus(`Error: ${err.message}`)
    }
  }

  return (
    <main className="container py-xl">
      <h1 className="text-3xl font-bold mb-lg">Settings</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
        <div className="flex flex-col gap-sm">
          {themes.map((t) => (
            <label key={t} className="flex items-center gap-sm">
              <input
                type="radio"
                name="theme"
                value={t}
                checked={theme === t}
                onChange={handleChange}
              />
              <span className="capitalize">{t}</span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          className="self-start bg-primary text-primary-foreground px-base py-sm rounded-md"
        >
          Save
        </button>
        {status && <p className="text-sm text-muted-foreground">{status}</p>}
      </form>
    </main>
  )
}
