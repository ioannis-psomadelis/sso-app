import { useState } from 'react';
import { Button, GoogleLogo, Check, Spinner, cn } from '@repo/ui';
import { useAppTheme } from '../context/ThemeContext';
import { getOtherAppTheme } from '../theme';

const features = [
  { title: 'Single Sign-On', description: 'One login for all your apps' },
  { title: 'PKCE Security', description: 'Modern OAuth 2.0 protection' },
  { title: 'Instant Access', description: 'Seamless cross-app sessions' },
];

interface LandingProps {
  onLogin: () => void;
  onLoginWithGoogle: () => void;
}

export function Landing({ onLogin, onLoginWithGoogle }: LandingProps) {
  const { theme, otherAppUrl } = useAppTheme();
  const otherTheme = getOtherAppTheme(theme);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  const handleLogin = () => {
    setIsLoggingIn(true);
    onLogin();
  };

  const handleGoogleLogin = () => {
    setIsLoggingInGoogle(true);
    onLoginWithGoogle();
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] relative overflow-hidden">
      {/* Gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br",
        theme.pageBgGradient,
        theme.pageBgGradientDark
      )} />

      {/* Animated gradient orbs - smaller on mobile */}
      <div className={cn(
        "absolute top-20 -left-32 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl animate-pulse",
        theme.orbGradient1
      )} />
      <div className={cn(
        "absolute bottom-20 -right-32 w-64 h-64 md:w-96 md:h-96 rounded-full blur-3xl animate-pulse [animation-delay:1s]",
        theme.orbGradient2
      )} />
      <div className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] rounded-full blur-3xl",
        theme.orbGradientCenter
      )} />

      {/* Floating geometric shapes - hidden on mobile to prevent overflow */}
      <div className={cn(
        "hidden md:block absolute top-32 right-20 w-20 h-20 rounded-2xl rotate-12 animate-bounce [animation-duration:3s] border-2",
        theme.shapeBorder
      )} />
      <div className={cn(
        "hidden md:block absolute bottom-40 left-20 w-16 h-16 rounded-full animate-bounce [animation-duration:4s] [animation-delay:0.5s]",
        theme.shapeGradient1
      )} />
      <div className={cn(
        "hidden sm:block absolute top-60 left-1/4 w-8 h-8 rotate-45 animate-bounce [animation-duration:2.5s] [animation-delay:1s]",
        theme.shapeGradient2
      )} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-12">
        {/* Hero */}
        <div className="text-center max-w-2xl mx-auto mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Badge */}
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 border",
            theme.accentBgLight,
            theme.accentTextDark,
            theme.linkTextDark,
            theme.accentBorder
          )}>
            <span className="relative flex h-2 w-2">
              <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", theme.accentBg)}></span>
              <span className={cn("relative inline-flex rounded-full h-2 w-2", theme.accentBg)}></span>
            </span>
            SSO Demo Application
          </div>

          {/* Main headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", theme.gradient)}>
              {theme.name}
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
            Experience seamless Single Sign-On with OAuth 2.0 and PKCE.
            One secure login across all your applications.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8 w-full sm:w-auto px-4 sm:px-0">
            <Button
              onClick={handleLogin}
              disabled={isLoggingIn || isLoggingInGoogle}
              size="lg"
              className={cn(
                "w-full sm:w-auto px-8 text-white border-0",
                "bg-gradient-to-r shadow-xl transition-all duration-300 hover:scale-105",
                theme.gradient,
                theme.shadow
              )}
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
              className={cn(
                "group relative p-6 rounded-2xl bg-card backdrop-blur-sm border border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                theme.featureHoverBorder,
                theme.featureHoverShadow
              )}
              style={{ animationDelay: `${(i + 1) * 100}ms` }}
            >
              <div className={cn(
                "size-10 rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300",
                theme.gradientBg,
                theme.shadow
              )}>
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
            Sign in here, then visit {otherTheme.name} - you'll be logged in automatically!
          </p>
          <a
            href={otherAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-2 text-sm font-medium transition-colors",
              theme.linkText,
              theme.linkTextDark,
              theme.linkHover,
              theme.linkHoverDark
            )}
          >
            Visit {otherTheme.name}
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}
