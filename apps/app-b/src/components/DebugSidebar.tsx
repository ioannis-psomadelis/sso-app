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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Code,
  ChevronDown,
  ChevronRight,
  PanelRight,
  PanelLeft,
  Key,
  Timer,
  RefreshCw,
  User,
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
}

export function DebugSidebar({ events, tokens, decodedTokens, accessTokenExpiry }: DebugSidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  if (isCollapsed) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsCollapsed(false)}
        className="fixed right-0 top-1/2 -translate-y-1/2 rounded-l-lg rounded-r-none border-r-0 z-20 h-12 w-8"
      >
        <PanelLeft className="size-4" />
      </Button>
    );
  }

  return (
    <aside className="w-[400px] border-l bg-card flex flex-col shrink-0 h-screen sticky top-0">
      {/* Header */}
      <div className="h-14 border-b px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Code className="size-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Debug Panel</span>
          <Badge variant="outline" className="text-xs">
            {events.length} events
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="size-8"
        >
          <PanelRight className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-2 shrink-0">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
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
    </aside>
  );
}

function TimelineView({ events }: { events: DebugEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-8 text-center">
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Timer className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No events yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Authentication events will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {events.map((event, index) => (
        <EventItem
          key={event.id}
          event={event}
          isFirst={index === 0}
          isLast={index === events.length - 1}
        />
      ))}
    </div>
  );
}

function EventItem({ event, isLast }: { event: DebugEvent; isFirst: boolean; isLast: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasData = event.data && Object.keys(event.data).length > 0;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'pkce_generated': return '🔑';
      case 'redirect_to_idp': return '↗️';
      case 'code_received': return '📥';
      case 'token_exchange_start': return '🔄';
      case 'token_exchange_success': return '✅';
      case 'token_exchange_error': return '❌';
      case 'logout': return '👋';
      default: return '•';
    }
  };

  const getIconBorder = (type: string) => {
    switch (type) {
      case 'pkce_generated': return 'border-amber-500';
      case 'redirect_to_idp': return 'border-blue-500';
      case 'code_received': return 'border-green-500';
      case 'token_exchange_start': return 'border-purple-500';
      case 'token_exchange_success': return 'border-emerald-500';
      case 'token_exchange_error': return 'border-red-500';
      case 'logout': return 'border-gray-500';
      default: return 'border-muted';
    }
  };

  return (
    <div className="relative flex gap-3">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-4 top-9 bottom-0 w-0.5 bg-border" />
      )}

      {/* Icon */}
      <div className={cn(
        "size-8 rounded-full bg-background border-2 flex items-center justify-center text-sm shrink-0 relative z-10",
        getIconBorder(event.type),
        isLast && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
      )}>
        {getEventIcon(event.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        {hasData ? (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <div className="cursor-pointer hover:bg-muted/30 rounded-lg p-2 -ml-2 transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{event.description}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      {event.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {Object.keys(event.data!).length}
                    </Badge>
                    {isOpen ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <pre className="mt-2 text-xs bg-muted p-2 rounded-md font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="p-2 -ml-2">
            <p className="text-sm font-medium leading-tight">{event.description}</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {event.timestamp.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
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
        <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <Key className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No tokens yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Sign in to see your JWT tokens
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <TokenCard
        title="Access Token"
        subtitle="API Authorization"
        icon={<Key className="size-4" />}
        token={tokens.accessToken}
        decoded={decodedTokens.accessToken}
        expiry={accessTokenExpiry}
        variant="blue"
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
        variant="outline"
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
  variant: 'blue' | 'secondary' | 'outline';
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
      <Card className="opacity-50">
        <CardHeader className="p-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
              {icon}
            </div>
            <div>
              <CardTitle className="text-sm">{title}</CardTitle>
              <p className="text-xs text-muted-foreground">Not available</p>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const bgClass = variant === 'blue'
    ? 'bg-blue-600/5 border-blue-600/20'
    : variant === 'secondary'
    ? 'bg-blue-500/5 border-blue-500/20'
    : '';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(bgClass)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="p-4 pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className={cn(
                "size-9 rounded-lg flex items-center justify-center text-white",
                variant === 'blue' && "bg-blue-600",
                variant === 'secondary' && "bg-blue-500",
                variant === 'outline' && "bg-muted text-muted-foreground"
              )}>
                {icon}
              </div>
              <div className="flex-1">
                <CardTitle className="text-sm">{title}</CardTitle>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
              {expiry && (
                <Badge variant={timeLeft === 'Expired' ? 'destructive' : 'default'} className="font-mono">
                  {timeLeft}
                </Badge>
              )}
              {isOpen ? (
                <ChevronDown className="size-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="size-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <CardContent className="p-4 space-y-3">
            {decoded ? (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Header</p>
                  <pre className="text-xs bg-muted p-2 rounded-md font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(decoded.header, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Payload</p>
                  <pre className="text-xs bg-muted p-2 rounded-md font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(decoded.payload, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Raw Token (opaque)</p>
                <pre className="text-xs bg-muted p-2 rounded-md font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {token}
                </pre>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
