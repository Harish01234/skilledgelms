'use client'
import { useEffect, useState } from 'react'
import { MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'

function getIsDark() {
  return document.documentElement.classList.contains('dark')
}

function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(getIsDark())
  }, [])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => {
        const next = !getIsDark()
        applyTheme(next)
        setDark(next)
      }}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </Button>
  )
}