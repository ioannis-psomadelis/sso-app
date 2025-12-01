import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge, buttonVariants } from '@repo/ui';
import { useAuth } from '../context/AuthContext';
import { Navigate, Link } from 'react-router-dom';

export function Settings() {
  const { user, tokens, decodedTokens, accessTokenExpiry, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Your account information</p>
        </div>
        <Link to="/" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
          Back to Home
        </Link>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your account details from the IdP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{user?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID (sub)</p>
              <p className="font-mono text-sm">{user?.sub || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>Current authentication tokens</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant={tokens.accessToken ? 'default' : 'secondary'}>
              Access Token {tokens.accessToken ? '✓' : '✗'}
            </Badge>
            <Badge variant={tokens.idToken ? 'default' : 'secondary'}>
              ID Token {tokens.idToken ? '✓' : '✗'}
            </Badge>
            <Badge variant={tokens.refreshToken ? 'default' : 'secondary'}>
              Refresh Token {tokens.refreshToken ? '✓' : '✗'}
            </Badge>
          </div>

          {accessTokenExpiry && (
            <div>
              <p className="text-sm text-muted-foreground">Token Expires</p>
              <p className="font-medium">{accessTokenExpiry.toLocaleString()}</p>
            </div>
          )}

          {decodedTokens.idToken && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">ID Token Claims</p>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(decodedTokens.idToken.payload, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
