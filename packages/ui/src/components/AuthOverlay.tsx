import * as React from 'react';
import { cn } from '../lib/utils';

interface AuthOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Loading message to display */
  message?: string;
}

export function AuthOverlay({
  isVisible,
  message = 'Loading...',
}: AuthOverlayProps) {
  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const [animationState, setAnimationState] = React.useState<'entering' | 'visible' | 'exiting'>('entering');

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setAnimationState('entering');
      // Small delay to trigger enter animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimationState('visible');
        });
      });
    } else {
      setAnimationState('exiting');
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // Match exit animation duration
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center',
        'backdrop-blur-md rounded-lg',
        'transition-opacity duration-250 ease-out',
        animationState === 'entering' && 'opacity-0',
        animationState === 'visible' && 'opacity-100',
        animationState === 'exiting' && 'opacity-0 duration-200 ease-in'
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-3',
          'transition-all duration-250 ease-out',
          animationState === 'entering' && 'scale-95 opacity-0',
          animationState === 'visible' && 'scale-100 opacity-100',
          animationState === 'exiting' && 'scale-95 opacity-0 duration-200 ease-in'
        )}
      >
        {/* Simple spinner */}
        <svg
          className="size-8 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>

        {/* Message */}
        <div
          className={cn(
            'text-foreground font-medium text-sm',
            'transition-opacity duration-150 delay-100',
            animationState !== 'visible' && 'opacity-0'
          )}
        >
          {message}
        </div>
      </div>
    </div>
  );
}
