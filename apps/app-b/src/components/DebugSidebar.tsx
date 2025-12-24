import * as React from 'react';
import {
  cn,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Separator,
  Button,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Badge,
  ChevronDown,
  ChevronRight,
  PanelRight,
  PanelLeft,
  Key,
  Timer,
  RefreshCw,
  User,
  Terminal,
  Activity,
  Zap,
  Lock,
  Unlock,
  ArrowRight,
  Check,
  X,
  Clock,
} from '@repo/ui';

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

interface DebugSidebarProps {
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
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// DocVault theme - blue/cyan accents
const theme = {
  gradient: 'from-blue-500 to-cyan-600',
  ring: 'ring-blue-500/30',
  glow: 'shadow-blue-500/20',
  accentBg: 'bg-blue-500',
  accentText: 'text-blue-400',
  hoverText: 'group-hover:text-blue-400',
};

export function DebugSidebar({ events, tokens, decodedTokens, accessTokenExpiry, isOpen, onOpenChange }: DebugSidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Mobile: controlled by parent via isOpen prop
  if (isMobile) {
    if (!isOpen) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => onOpenChange?.(false)}
        />
        {/* Sidebar Sheet */}
        <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[400px] bg-sidebar flex flex-col z-50 md:hidden animate-in slide-in-from-right duration-300 border-l border-sidebar-border">
          <DebugHeader
            eventsCount={events.length}
            onClose={() => onOpenChange?.(false)}
          />
          <DebugContent
            events={events}
            tokens={tokens}
            decodedTokens={decodedTokens}
            accessTokenExpiry={accessTokenExpiry}
          />
        </aside>
      </>
    );
  }

  // Desktop: self-managed collapsed state
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={cn(
          "fixed right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex",
          "h-24 w-8 rounded-l-xl",
          "bg-sidebar border border-r-0 border-sidebar-border",
          "items-center justify-center",
          "hover:w-10 transition-all duration-200",
          "group"
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <PanelLeft className={cn("size-4 text-muted-foreground", theme.hoverText, "transition-colors")} />
          <div className={cn("w-1 h-8 rounded-full bg-gradient-to-b", theme.gradient, "opacity-60")} />
        </div>
      </button>
    );
  }

  return (
    <aside className="w-[380px] bg-sidebar flex flex-col shrink-0 h-screen sticky top-0 hidden md:flex border-l border-sidebar-border">
      <DebugHeader
        eventsCount={events.length}
        onClose={() => setIsCollapsed(true)}
      />
      <DebugContent
        events={events}
        tokens={tokens}
        decodedTokens={decodedTokens}
        accessTokenExpiry={accessTokenExpiry}
      />
    </aside>
  );
}

function DebugHeader({ eventsCount, onClose }: { eventsCount: number; onClose: () => void }) {
  return (
    <div className="relative shrink-0">
      <div className="h-14 border-b border-sidebar-border px-4 flex items-center justify-between relative">
        <div className="flex items-center gap-3">
          <div className={cn(
            "size-8 rounded-lg flex items-center justify-center",
            "bg-gradient-to-br", theme.gradient,
            "shadow-lg", theme.glow
          )}>
            <Terminal className="size-4 text-white" />
          </div>
          <div>
            <span className="font-mono text-sm font-semibold text-foreground tracking-tight">
              Debug Console
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", theme.accentBg)}></span>
                <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", theme.accentBg)}></span>
              </span>
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {eventsCount} events
              </span>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-8 text-muted-foreground hover:text-foreground"
        >
          <PanelRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

interface DebugContentProps {
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

function DebugContent({ events, tokens, decodedTokens, accessTokenExpiry }: DebugContentProps) {
  return (
    <Tabs defaultValue="timeline" className="flex-1 flex flex-col overflow-hidden">
      <div className="px-3 pt-3 shrink-0">
        <TabsList className="w-full grid grid-cols-2 bg-muted p-1 rounded-lg border border-border">
          <TabsTrigger
            value="timeline"
            className="font-mono text-xs data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md transition-all data-[state=active]:shadow-sm"
          >
            <Activity className="size-3.5 mr-1.5" />
            Timeline
          </TabsTrigger>
          <TabsTrigger
            value="tokens"
            className="font-mono text-xs data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground rounded-md transition-all data-[state=active]:shadow-sm"
          >
            <Key className="size-3.5 mr-1.5" />
            Tokens
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-hidden">
        <TabsContent value="timeline" className="h-full m-0 mt-2 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-visible">
            <TimelineView events={events} />
          </div>
        </TabsContent>

        <TabsContent value="tokens" className="h-full m-0 mt-2 data-[state=active]:flex data-[state=active]:flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-visible">
            <TokensView
              tokens={tokens}
              decodedTokens={decodedTokens}
              accessTokenExpiry={accessTokenExpiry}
            />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

function TimelineView({ events }: { events: DebugEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
        <div className="size-16 rounded-2xl flex items-center justify-center mb-4 bg-muted border border-border">
          <Timer className="size-7 text-muted-foreground" />
        </div>
        <p className="font-mono text-sm font-medium text-foreground">No events yet</p>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
          OAuth flow events will appear here
        </p>
      </div>
    );
  }

  // Reverse events: newest first, oldest at bottom
  const reversedEvents = [...events].reverse();

  return (
    <div className="p-3">
      {reversedEvents.map((event, index) => (
        <EventItem
          key={event.id}
          event={event}
          isFirst={index === 0}
          isLast={index === reversedEvents.length - 1}
        />
      ))}
    </div>
  );
}

function EventItem({ event, isFirst, isLast }: { event: DebugEvent; isFirst: boolean; isLast: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasData = event.data && Object.keys(event.data).length > 0;

  const getEventConfig = (type: string) => {
    switch (type) {
      case 'pkce_generated':
        return { icon: Lock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      case 'redirect_to_idp':
        return { icon: ArrowRight, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      case 'code_received':
        return { icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
      case 'token_exchange_start':
      case 'token_refresh_start':
        return { icon: RefreshCw, color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
      case 'token_exchange_success':
      case 'token_refresh_success':
      case 'api_success':
        return { icon: Check, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
      case 'token_exchange_error':
      case 'token_refresh_error':
      case 'api_error':
        return { icon: X, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' };
      case 'api_call':
        return { icon: Activity, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30' };
      case 'logout':
        return { icon: Unlock, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
      default:
        return { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-border' };
    }
  };

  const config = getEventConfig(event.type);
  const Icon = config.icon;

  return (
    <div className="relative flex gap-3">
      {/* Connector line - positioned to connect icon centers */}
      {!isLast && (
        <div
          className="absolute left-[17px] w-0.5 bg-border"
          style={{ top: '36px', bottom: '-8px' }}
        />
      )}

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild disabled={!hasData}>
          <div className={cn(
            "flex items-start gap-3 p-2 rounded-lg transition-all",
            hasData && "cursor-pointer hover:bg-muted/50",
            isFirst && "bg-muted/30"
          )}>
            {/* Icon */}
            <div className={cn(
              "size-9 rounded-lg flex items-center justify-center shrink-0 relative z-10",
              "border-2 bg-background transition-all",
              config.border,
              isFirst && "ring-2 ring-offset-2 ring-offset-sidebar", isFirst && theme.ring
            )}>
              <Icon className={cn("size-4", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground leading-tight">
                  {event.description}
                </p>
                {hasData && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono px-1.5 py-0"
                    >
                      {Object.keys(event.data!).length}
                    </Badge>
                    {isOpen ? (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5">
                <Clock className="size-3" />
                {event.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CollapsibleTrigger>

        {hasData && (
          <CollapsibleContent>
            <div className="ml-12 mr-2 mb-3">
              <pre className="text-[11px] p-3 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap break-all bg-muted border border-border text-foreground">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}

function TokensView({
  tokens,
  decodedTokens,
  accessTokenExpiry
}: {
  tokens: { accessToken: string | null; refreshToken: string | null; idToken: string | null };
  decodedTokens: { accessToken: DecodedToken | null; idToken: DecodedToken | null };
  accessTokenExpiry: Date | null;
}) {
  if (!tokens.accessToken) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
        <div className="size-16 rounded-2xl flex items-center justify-center mb-4 bg-muted border border-border">
          <Lock className="size-7 text-muted-foreground" />
        </div>
        <p className="font-mono text-sm font-medium text-foreground">No tokens yet</p>
        <p className="text-xs text-muted-foreground mt-1.5 font-mono">
          Sign in to inspect JWT tokens
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <TokenCard
        title="Access Token"
        subtitle="API Authorization"
        icon={<Key className="size-4" />}
        token={tokens.accessToken}
        decoded={decodedTokens.accessToken}
        expiry={accessTokenExpiry}
        variant="primary"
      />
      <TokenCard
        title="ID Token"
        subtitle="User Identity"
        icon={<User className="size-4" />}
        token={tokens.idToken}
        decoded={decodedTokens.idToken}
        expiry={null}
        variant="secondary"
      />
      <TokenCard
        title="Refresh Token"
        subtitle="Session Renewal"
        icon={<RefreshCw className="size-4" />}
        token={tokens.refreshToken}
        decoded={null}
        expiry={null}
        variant="muted"
      />
    </div>
  );
}

function TokenCard({
  title,
  subtitle,
  icon,
  token,
  decoded,
  expiry,
  variant,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  token: string | null;
  decoded: DecodedToken | null;
  expiry: Date | null;
  variant: 'primary' | 'secondary' | 'muted';
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    if (!expiry) return;

    const update = () => {
      const now = new Date();
      const diff = expiry.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiry]);

  if (!token) {
    return (
      <div className="rounded-xl bg-muted/50 border border-border/50 p-4 opacity-50">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-xs text-muted-foreground font-mono">Not available</p>
          </div>
        </div>
      </div>
    );
  }

  const variantStyles = {
    primary: {
      border: 'border-blue-500/20',
      bg: 'bg-blue-500/5',
      iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',
      glow: 'shadow-blue-500/10',
    },
    secondary: {
      border: 'border-cyan-500/20',
      bg: 'bg-cyan-500/5',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-teal-600',
      glow: 'shadow-cyan-500/10',
    },
    muted: {
      border: 'border-border',
      bg: 'bg-muted/30',
      iconBg: 'bg-muted',
      glow: '',
    },
  };

  const styles = variantStyles[variant];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-xl border transition-all",
        styles.border, styles.bg,
        isOpen && "shadow-lg", isOpen && styles.glow
      )}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center gap-3 hover:bg-muted/30 transition-colors rounded-xl">
            <div className={cn(
              "size-10 rounded-lg flex items-center justify-center shrink-0",
              styles.iconBg, "shadow-lg", styles.glow,
              variant !== 'muted' && "text-white",
              variant === 'muted' && "text-muted-foreground"
            )}>
              {icon}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>
            </div>
            {expiry && (
              <Badge
                variant="outline"
                className={cn(
                  "font-mono text-[10px] px-2",
                  timeLeft === 'Expired'
                    ? 'bg-red-500/10 border-red-500/30 text-red-500'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                )}
              >
                <Clock className="size-3 mr-1" />
                {timeLeft}
              </Badge>
            )}
            {isOpen ? (
              <ChevronDown className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <div className="p-4 space-y-3">
            {decoded ? (
              <>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Header</p>
                  <pre className="text-[11px] p-3 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap break-all bg-muted border border-border text-foreground">
                    {JSON.stringify(decoded.header, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Payload</p>
                  <pre className="text-[11px] p-3 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap break-all bg-muted border border-border text-foreground">
                    {JSON.stringify(decoded.payload, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1.5">Raw Token (opaque)</p>
                <pre className="text-[11px] p-3 rounded-lg font-mono overflow-x-auto whitespace-pre-wrap break-all bg-muted border border-border text-foreground">
                  {token}
                </pre>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
