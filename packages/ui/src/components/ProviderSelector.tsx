import { cn } from '../lib/utils';
import { Button } from './Button';
import { Spinner } from './PageLoader';

// Official Google "G" logo (colorful) - per Google branding guidelines
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export interface Provider {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  disabled?: boolean;
}

interface ProviderSelectorProps {
  providers: Provider[];
  onSelectProvider: (providerId: string) => void;
  loadingProvider?: string | null;
  disabled?: boolean;
  className?: string;
}

export function ProviderSelector({
  providers,
  onSelectProvider,
  loadingProvider,
  disabled,
  className,
}: ProviderSelectorProps) {
  // Find providers by type
  const keycloak = providers.find(p => p.id === 'keycloak');
  const google = providers.find(p => p.id === 'google');
  const local = providers.find(p => p.id === 'local');

  const renderButton = (provider: Provider, compact = false) => {
    const isLoading = loadingProvider === provider.id;
    const isDisabled = disabled || provider.disabled || !!loadingProvider;
    const isGoogle = provider.id === 'google';

    return (
      <Button
        key={provider.id}
        variant={isGoogle ? 'outline' : 'default'}
        className={cn(
          'justify-center gap-3 h-11 font-medium border',
          compact ? 'flex-1' : 'w-full',
          provider.id === 'local' && 'bg-primary hover:bg-primary/80 text-primary-foreground border-primary',
          provider.id === 'keycloak' && 'bg-accent hover:bg-accent/80 text-accent-foreground border-accent',
          isGoogle && 'bg-card hover:bg-muted text-foreground border-border shadow-xs',
          provider.disabled && 'opacity-50'
        )}
        onClick={() => onSelectProvider(provider.id)}
        disabled={isDisabled}
      >
        {isLoading ? (
          <Spinner className="size-5" />
        ) : isGoogle ? (
          <GoogleLogo className="size-5" />
        ) : (
          <span className="text-lg">{provider.icon}</span>
        )}
        <span className={compact ? 'text-sm' : ''}>
          {isLoading ? `Connecting...` : compact ? provider.name : `Sign in with ${provider.name}`}
        </span>
        {provider.disabled && (
          <span className="text-xs opacity-70">(Soon)</span>
        )}
      </Button>
    );
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {/* University SSO - Full width at top */}
      {keycloak && renderButton(keycloak)}

      {/* Divider */}
      <ProviderDivider text="or" />

      {/* Bottom row - Google and Local side by side */}
      <div className="flex gap-2">
        {google && renderButton(google, true)}
        {local && renderButton(local, true)}
      </div>
    </div>
  );
}

// Separator with text
export function ProviderDivider({ text = 'or continue with' }: { text?: string }) {
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}
