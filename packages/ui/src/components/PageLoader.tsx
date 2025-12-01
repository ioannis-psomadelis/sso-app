import * as React from 'react';
import { cn } from '../lib/utils';

interface PageLoaderProps {
  /** The app icon/logo to display */
  icon?: React.ReactNode;
  /** Primary loading message */
  message?: string;
  /** Secondary description text */
  description?: string;
  /** Color variant for the spinner */
  variant?: 'default' | 'primary' | 'blue';
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg';
  /** Show pulsing dots animation */
  showDots?: boolean;
}

export function PageLoader({
  icon,
  message = 'Loading',
  description,
  variant = 'default',
  size = 'md',
  showDots = true,
}: PageLoaderProps) {
  const sizes = {
    sm: { container: 'gap-3', icon: 'size-10', spinner: 'size-10', text: 'text-sm', desc: 'text-xs' },
    md: { container: 'gap-4', icon: 'size-14', spinner: 'size-14', text: 'text-base', desc: 'text-sm' },
    lg: { container: 'gap-5', icon: 'size-20', spinner: 'size-20', text: 'text-lg', desc: 'text-base' },
  };

  const spinnerColors = {
    default: 'border-muted-foreground/30 border-t-muted-foreground',
    primary: 'border-primary/30 border-t-primary',
    blue: 'border-blue-600/30 border-t-blue-600',
  };

  const s = sizes[size];

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className={cn('flex flex-col items-center', s.container)}>
        {/* Icon with spinner ring */}
        <div className="relative">
          {icon ? (
            <div className={cn('rounded-2xl flex items-center justify-center', s.icon)}>
              {icon}
            </div>
          ) : (
            <div className={cn('rounded-full bg-muted', s.icon)} />
          )}
          {/* Spinning ring around icon */}
          <div
            className={cn(
              'absolute inset-0 rounded-2xl border-[3px] animate-spin',
              spinnerColors[variant]
            )}
            style={{ animationDuration: '1.5s' }}
          />
        </div>

        {/* Text content */}
        <div className="text-center space-y-1">
          <p className={cn('font-medium', s.text)}>
            {message}
            {showDots && <LoadingDots />}
          </p>
          {description && (
            <p className={cn('text-muted-foreground', s.desc)}>{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <span className="inline-flex ml-0.5">
      <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
      <span className="animate-pulse" style={{ animationDelay: '150ms' }}>.</span>
      <span className="animate-pulse" style={{ animationDelay: '300ms' }}>.</span>
    </span>
  );
}

/** Simple inline spinner for buttons - uses Loader2 icon style */
interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <svg
      className={cn('size-4 animate-spin', className)}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

/** Auth-specific loader with steps indicator */
interface AuthLoaderProps {
  icon?: React.ReactNode;
  title: string;
  steps: Array<{
    label: string;
    status: 'pending' | 'loading' | 'complete' | 'error';
  }>;
  variant?: 'default' | 'primary' | 'blue';
}

export function AuthLoader({ icon, title, steps, variant = 'primary' }: AuthLoaderProps) {
  const spinnerColors = {
    default: 'border-muted-foreground/30 border-t-muted-foreground',
    primary: 'border-primary/30 border-t-primary',
    blue: 'border-blue-600/30 border-t-blue-600',
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        {/* Icon with spinner */}
        <div className="relative">
          {icon ? (
            <div className="size-16 rounded-2xl flex items-center justify-center">
              {icon}
            </div>
          ) : (
            <div className="size-16 rounded-full bg-muted" />
          )}
          <div
            className={cn(
              'absolute inset-0 rounded-2xl border-[3px] animate-spin',
              spinnerColors[variant]
            )}
            style={{ animationDuration: '1.5s' }}
          />
        </div>

        {/* Title */}
        <p className="text-lg font-medium">{title}</p>

        {/* Steps */}
        <div className="w-full space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <StepIndicator status={step.status} />
              <span
                className={cn(
                  'text-sm',
                  step.status === 'complete' && 'text-muted-foreground',
                  step.status === 'error' && 'text-destructive',
                  step.status === 'loading' && 'font-medium'
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ status }: { status: 'pending' | 'loading' | 'complete' | 'error' }) {
  if (status === 'pending') {
    return <div className="size-5 rounded-full border-2 border-muted" />;
  }

  if (status === 'loading') {
    return (
      <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    );
  }

  if (status === 'complete') {
    return (
      <div className="size-5 rounded-full bg-green-500/10 flex items-center justify-center">
        <svg className="size-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  // error
  return (
    <div className="size-5 rounded-full bg-destructive/10 flex items-center justify-center">
      <svg className="size-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}
