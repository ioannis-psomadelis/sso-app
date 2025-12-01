import * as React from 'react';
import { buttonVariants, Separator, ThemeToggle, Toaster, AuthOverlay } from '@repo/ui';
import { useDebug } from '../context/DebugContext';
import { useAuth } from '../context/AuthContext';
import { DebugSidebar } from './DebugSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { events } = useDebug();
  const { tokens, decodedTokens, accessTokenExpiry, isLoading } = useAuth();

  return (
    <>
      <Toaster richColors />
      <div className="min-h-screen bg-background flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              T
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">TaskFlow</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">SSO Demo</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="http://localhost:3002"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "text-muted-foreground" })}
            >
              Open DocVault →
            </a>
            <Separator orientation="vertical" className="h-6 mx-2" />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto relative">
          <AuthOverlay
            isVisible={isLoading}
            message="Checking session"
          />
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Debug Sidebar */}
      <DebugSidebar
        events={events}
        tokens={tokens}
        decodedTokens={decodedTokens}
        accessTokenExpiry={accessTokenExpiry}
      />
      </div>
    </>
  );
}
