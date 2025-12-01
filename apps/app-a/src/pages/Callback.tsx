import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Check, X, Spinner } from '@repo/ui';
import { useAuth } from '../context/AuthContext';
import { logCodeReceived } from '@repo/auth-client';

export function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const isProcessingRef = useRef(false);

  useEffect(() => {
    // Prevent double execution from React StrictMode
    if (isProcessingRef.current) return;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(errorParam);
      setStatus('error');
      return;
    }

    const state = searchParams.get('state');

    if (code && !state) {
      setError('Missing state parameter - possible security issue');
      setStatus('error');
      return;
    }

    if (code && state) {
      isProcessingRef.current = true;
      logCodeReceived(code);

      handleCallback(code, state)
        .then(() => {
          setStatus('success');
          setTimeout(() => navigate('/'), 500);
        })
        .catch((err) => {
          setError(err.message);
          setStatus('error');
          isProcessingRef.current = false;
        });
    }
  }, [searchParams, handleCallback, navigate]);

  if (status === 'success') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm text-center">
          <CardHeader className="space-y-4">
            <div className="size-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="size-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-xl text-green-600">Welcome to TaskFlow!</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting...
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-sm text-center">
          <CardHeader className="space-y-4">
            <div className="size-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <X className="size-8 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl text-destructive">Authentication Failed</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                {error || 'An error occurred during sign in'}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-primary hover:underline"
            >
              Return to home
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Simple loading state
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">Signing in...</p>
      </div>
    </div>
  );
}
