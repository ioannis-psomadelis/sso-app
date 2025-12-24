import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  buttonVariants,
  Separator,
  ThemeToggle,
  Toaster,
  Button,
  Code,
  Shield,
  Settings,
  LogOut,
  Spinner,
  cn,
} from '@repo/ui';
import { useAppTheme } from '../context/ThemeContext';
import { getOtherAppTheme } from '../theme';
import { DebugSidebar } from './DebugSidebar';

interface DebugEvent {
  id: string;
  type: string;
  timestamp: Date;
  description: string;
  data?: Record<string, unknown>;
}

interface DecodedToken {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
}

interface LayoutProps {
  children: React.ReactNode;
  // Auth state
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: { email?: string; name?: string } | null;
  onLogin: () => void;
  onLogout: () => Promise<void>;
  // Debug state
  events: DebugEvent[];
  tokens: {
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
  };
  decodedTokens: {
    accessToken: DecodedToken | null;
    idToken: DecodedToken | null;
  };
  accessTokenExpiry: Date | null;
}

export function Layout({
  children,
  isAuthenticated,
  isAdmin,
  user,
  onLogin,
  onLogout,
  events,
  tokens,
  decodedTokens,
  accessTokenExpiry,
}: LayoutProps) {
  const { theme, otherAppUrl } = useAppTheme();
  const otherTheme = getOtherAppTheme(theme);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const location = useLocation();

  const handleLogin = () => {
    setIsLoggingIn(true);
    onLogin();
    // Loading state will be cleared by page navigation
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await onLogout();
    setIsLoggingOut(false);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <Toaster richColors />
      <div className="min-h-screen bg-background flex">
        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-3 sm:gap-6">
            <Link to="/" className="flex items-center gap-2">
              <div className={cn(
                "size-9 rounded-xl flex items-center justify-center text-white font-bold shadow-lg",
                theme.gradientBg,
                theme.shadow
              )}>
                {theme.shortName}
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
                  className="hidden sm:flex items-center gap-1.5"
                >
                  {isLoggingOut ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
                  <span>Sign out</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="size-8 sm:hidden"
                  aria-label="Sign out"
                >
                  {isLoggingOut ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleLogin}
                disabled={isLoggingIn}
                size="sm"
                className={cn(
                  "text-white bg-gradient-to-r",
                  theme.gradient,
                  theme.shadow
                )}
              >
                {isLoggingIn ? <Spinner className="size-4 mr-1.5" /> : null}
                Sign in
              </Button>
            )}
            <Separator orientation="vertical" className="h-5" />
            <a
              href={otherAppUrl}
              className={buttonVariants({ variant: "ghost", size: "sm", className: "text-muted-foreground hidden sm:flex" })}
            >
              {otherTheme.name} →
            </a>
            <a
              href={otherAppUrl}
              className={buttonVariants({ variant: "ghost", size: "icon", className: "sm:hidden size-8" })}
              title={otherTheme.name}
            >
              <span className={cn(
                "size-6 rounded-lg flex items-center justify-center text-white text-xs font-bold",
                otherTheme.gradientBg
              )}>
                {otherTheme.shortName}
              </span>
            </a>
            <ThemeToggle />
            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="size-8 md:hidden"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open debug sidebar"
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
