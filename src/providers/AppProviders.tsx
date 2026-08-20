import { type ComponentType, type ReactNode } from "react"
import { RouterProvider } from "react-router-dom"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"
import { router } from "@/lib/router"

const SafeThemeProvider = ThemeProvider as ComponentType<{
  attribute?: string
  defaultTheme?: string
  enableSystem?: boolean
  children: ReactNode
}>

export function AppProviders() {
  return (
    <SafeThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" richColors theme="system" />
    </SafeThemeProvider>
  )
}
