'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sidebar } from '../../components/dashboard/sidebar/sidebar'
import { Card, CardBody, Switch } from "@nextui-org/react"

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />
      
      <div className="ml-20 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-8">Settings</h1>

          <Card className="bg-[#d4d4d4] dark:bg-[#292828] rounded-xl">
            <CardBody className="p-6">
              <h2 className="text-lg font-semibold mb-6">Appearance</h2>
              
              <div className="flex items-center justify-between p-4 rounded-xl">
                <span className="text-foreground">Dark mode</span>
                <Switch
                  isSelected={theme === 'dark'}
                  onValueChange={toggleTheme}
                  size="lg"
                  color="success"
                  className="border-2 border-[#e3e1e1] dark:border-[#424242] rounded-full"
                />
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

