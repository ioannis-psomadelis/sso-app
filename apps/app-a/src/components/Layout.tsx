import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { buttonVariants, Separator, ThemeToggle, Toaster, Button, Code, Shield, Settings, LogOut, Spinner } from '@repo/ui';
import { useDebug } from '../context/DebugContext';
import { useAuth, OTHER_APP_URL } from '../context/AuthContext';
import { DebugSidebar } from './DebugSidebar';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { events } = useDebug();
  const { tokens, decodedTokens, accessTokenExpiry, isAdmin, isAuthenticated, user, login, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const location = useLocation();

  const handleLogin = () => {
    setIsLoggingIn(true);
    login();
    // Loading state will be cleared by page navigation
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <Toaster richColors />
      <div className="min-h-screen bg-background flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/20">
                T
              </div>
            </Link>

            {/* Nav Links - only when authenticated */}
            {isAuthenticated && (
              <nav className="hidden sm:flex items-center gap-1">
                <Link
                  to="/"
                  className={buttonVariants({
                    variant: isActive('/') ? "secondary" : "ghost",
                    size: "sm"
                  })}
                >
                  Home
                </Link>
                <Link
                  to="/settings"
                  className={buttonVariants({
                    variant: isActive('/settings') ? "secondary" : "ghost",
                    size: "sm"
                  })}
                >
                  <Settings className="size-4 mr-1.5" />
                  Settings
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className={buttonVariants({
                      variant: isActive('/admin') ? "secondary" : "ghost",
                      size: "sm",
                      className: "text-orange-600 dark:text-orange-400"
                    })}
                  >
                    <Shield className="size-4 mr-1.5" />
                    Admin
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Right: Auth + Actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground hidden lg:block">
                  {user?.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="hidden sm:flex"
                >
                  {isLoggingOut ? <Spinner className="size-4" /> : <LogOut className="size-4 mr-1.5" />}
                  Sign out
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="size-8 sm:hidden"
                >
                  {isLoggingOut ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                size="sm"
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white"
              >
                {isLoggingIn ? <Spinner className="size-4 mr-1.5" /> : null}
                Sign in
              </Button>
            )}
            <Separator orientation="vertical" className="h-5" />
            <a
              href={OTHER_APP_URL}
              className={buttonVariants({ variant: "ghost", size: "sm", className: "text-muted-foreground hidden sm:flex" })}
            >
              DocVault →
            </a>
            <a
              href={OTHER_APP_URL}
              className={buttonVariants({ variant: "ghost", size: "icon", className: "sm:hidden size-8" })}
              title="DocVault"
            >
              <span className="size-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">D</span>
            </a>
            <ThemeToggle />
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Code className="size-4" />
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto relative">
          {isAuthenticated ? (
            location.pathname === '/admin' ? (
              children
            ) : (
              <div className="max-w-3xl mx-auto p-4 sm:p-6">
                {children}
              </div>
            )
          ) : (
            children
          )}
        </main>
      </div>

      {/* Debug Sidebar */}
      <DebugSidebar
        events={events}
        tokens={tokens}
        decodedTokens={decodedTokens}
        accessTokenExpiry={accessTokenExpiry}
        isOpen={sidebarOpen}
        onOpenChange={setSidebarOpen}
      />
      </div>
    </>
  );
}
