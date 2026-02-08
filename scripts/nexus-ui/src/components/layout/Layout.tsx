import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandBar } from '../CommandBar'
import { NotificationPanel } from '../NotificationPanel'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-full w-full bg-canvas overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
      <CommandBar />
      <NotificationPanel />
    </div>
  )
}
