"use client"

import * as React from "react"
import { cn } from "../lib/utils"
import { Button } from "./Button"
import { ScrollArea } from "./ScrollArea"
import { ChevronLeft, ChevronRight, PanelLeft } from "lucide-react"

interface SidebarContextValue {
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
  isMobile: boolean
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

interface SidebarProviderProps {
  children: React.ReactNode
  defaultCollapsed?: boolean
}

export function SidebarProvider({ children, defaultCollapsed = false }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isMobile }}>
      {children}
    </SidebarContext.Provider>
  )
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right"
}

export function Sidebar({ className, side = "right", children, ...props }: SidebarProps) {
  const { isCollapsed } = useSidebar()

  if (isCollapsed) {
    return null
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-l bg-card/50 backdrop-blur-sm",
        side === "left" && "border-l-0 border-r",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

export function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex h-14 items-center border-b px-4", className)}
      {...props}
    />
  )
}

export function SidebarContent({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <ScrollArea className={cn("flex-1", className)}>
      {children}
    </ScrollArea>
  )
}

export function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center border-t p-4", className)}
      {...props}
    />
  )
}

export function SidebarTrigger({ className, ...props }: React.ComponentProps<typeof Button>) {
  const { isCollapsed, setIsCollapsed } = useSidebar()

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={() => setIsCollapsed(!isCollapsed)}
      {...props}
    >
      {isCollapsed ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
}

export function SidebarRail() {
  const { isCollapsed, setIsCollapsed } = useSidebar()

  if (!isCollapsed) return null

  return (
    <button
      onClick={() => setIsCollapsed(false)}
      className="fixed right-0 top-1/2 z-20 -translate-y-1/2 rounded-l-lg border border-r-0 bg-card p-2 shadow-lg transition-colors hover:bg-muted"
    >
      <PanelLeft className="h-4 w-4" />
    </button>
  )
}
