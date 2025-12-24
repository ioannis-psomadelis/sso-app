import { useState } from 'react';
import { Button, GoogleLogo, Check, Spinner } from '@repo/ui';
import { useAuth, OTHER_APP_URL } from '../context/AuthContext';

const features = [
  { title: 'Single Sign-On', description: 'One login for all your apps' },
  { title: 'PKCE Security', description: 'Modern OAuth 2.0 protection' },
  { title: 'Instant Access', description: 'Seamless cross-app sessions' },
];

export function Landing() {
  const { login, loginWithGoogle } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  const handleLogin = () => {
    setIsLoggingIn(true);
    login();
  };

  const handleGoogleLogin = () => {
    setIsLoggingInGoogle(true);
    loginWithGoogle();
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
      {/* Gradient background - blue/cyan theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-cyan-500/5 to-blue-600/10 dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-blue-600/20" />

      {/* Animated gradient orbs */}
      <div className="absolute top-20 -left-32 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 -right-32 w-96 h-96 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl" />

      {/* Floating geometric shapes */}
      <div className="absolute top-32 right-20 w-20 h-20 border-2 border-blue-500/30 rounded-2xl rotate-12 animate-bounce [animation-duration:3s]" />
      <div className="absolute bottom-40 left-20 w-16 h-16 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full animate-bounce [animation-duration:4s] [animation-delay:0.5s]" />
      <div className="absolute top-60 left-1/4 w-8 h-8 bg-gradient-to-br from-cyan-500/40 to-blue-500/40 rotate-45 animate-bounce [animation-duration:2.5s] [animation-delay:1s]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6 border border-blue-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            SSO Demo Application
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-600 bg-clip-text text-transparent">
              DocVault
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
            Experience seamless Single Sign-On with OAuth 2.0 and PKCE.
            One secure login across all your applications.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8">
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn || isLoggingInGoogle}
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-105 px-8 text-white border-0"
            >
              {isLoggingIn ? <Spinner className="size-4 mr-2" /> : null}
              Sign in with SSO
            </Button>
            <Button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn || isLoggingInGoogle}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto bg-card backdrop-blur-sm hover:bg-muted transition-all duration-300 hover:scale-105 px-8 text-foreground"
            >
              {isLoggingInGoogle ? <Spinner className="size-4 mr-2" /> : <GoogleLogo className="w-5 h-5 mr-2" />}
              Continue with Google
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Watch the debug panel to see the OAuth 2.0 + PKCE flow in action
          </p>
        </div>

        {/* Features */}
        <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700 [animation-delay:200ms]">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="group relative p-6 rounded-2xl bg-card backdrop-blur-sm border border-border hover:border-blue-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <div className="size-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                <Check className="size-5 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-1 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* SSO Demo Card */}
        <div className="mt-12 p-6 rounded-2xl bg-card backdrop-blur-sm border border-border max-w-md mx-auto text-center animate-in fade-in slide-in-from-bottom-12 duration-700 [animation-delay:400ms]">
          <p className="font-medium mb-2 text-foreground">Try Single Sign-On</p>
          <p className="text-sm text-muted-foreground mb-4">
            Sign in here, then visit TaskFlow - you'll be logged in automatically!
          </p>
          <a
            href={OTHER_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Visit TaskFlow
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
