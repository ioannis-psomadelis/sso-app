// Theme configuration for SSO demo apps
// Each app has a distinct color theme while sharing components
// All classes must be complete strings for Tailwind JIT to detect them

export interface AppTheme {
  // App identity
  name: string;
  shortName: string;

  // Gradient classes (complete)
  gradient: string;
  gradientHover: string;
  gradientBg: string;

  // Background accents
  accentBg: string;
  accentBgLight: string;

  // Text colors
  accentText: string;
  accentTextDark: string;

  // Border colors
  accentBorder: string;
  accentBorderHover: string;

  // Shadow/glow
  shadow: string;
  shadowHover: string;
  shadowLight: string;

  // Orb gradients for landing
  orbGradient1: string;
  orbGradient2: string;
  orbGradientCenter: string;

  // Floating shape styles
  shapeBorder: string;
  shapeGradient1: string;
  shapeGradient2: string;

  // Page background gradient
  pageBgGradient: string;
  pageBgGradientDark: string;

  // Feature card hover
  featureHoverBorder: string;
  featureHoverShadow: string;

  // Link colors
  linkText: string;
  linkTextDark: string;
  linkHover: string;
  linkHoverDark: string;

  // Focus/ring states
  ring: string;
  ringFocus: string;
  hoverText: string;
  glow: string;

  // Event styling
  eventBg: string;
  eventBorder: string;
  eventText: string;

  // API color (for timeline)
  apiColor: string;
  apiBg: string;
  apiBorder: string;
  apiText: string;

  // Card styling (for SSO demo cards)
  cardBorder: string;
  cardBg: string;
}

// TaskFlow theme - violet/purple
export const taskFlowTheme: AppTheme = {
  name: 'TaskFlow',
  shortName: 'T',

  gradient: 'from-violet-500 to-purple-600',
  gradientHover: 'from-violet-600 to-purple-700',
  gradientBg: 'bg-gradient-to-br from-violet-500 to-purple-600',

  accentBg: 'bg-violet-500',
  accentBgLight: 'bg-violet-500/10',

  accentText: 'text-violet-400',
  accentTextDark: 'text-violet-600',

  accentBorder: 'border-violet-500/20',
  accentBorderHover: 'border-violet-500/30',

  shadow: 'shadow-violet-500/25',
  shadowHover: 'shadow-violet-500/40',
  shadowLight: 'shadow-violet-500/10',

  orbGradient1: 'bg-gradient-to-br from-violet-500/20 to-purple-500/20',
  orbGradient2: 'bg-gradient-to-br from-purple-500/20 to-violet-500/20',
  orbGradientCenter: 'bg-gradient-to-br from-violet-500/10 to-purple-500/10',

  shapeBorder: 'border-violet-500/30',
  shapeGradient1: 'bg-gradient-to-br from-violet-500/30 to-purple-500/30',
  shapeGradient2: 'bg-gradient-to-br from-purple-500/40 to-violet-500/40',

  pageBgGradient: 'from-violet-500/5 via-purple-500/5 to-violet-600/10',
  pageBgGradientDark: 'dark:from-violet-500/10 dark:via-purple-500/10 dark:to-violet-600/20',

  featureHoverBorder: 'hover:border-violet-500/30',
  featureHoverShadow: 'hover:shadow-violet-500/10',

  linkText: 'text-violet-600',
  linkTextDark: 'dark:text-violet-400',
  linkHover: 'hover:text-violet-700',
  linkHoverDark: 'dark:hover:text-violet-300',

  ring: 'ring-violet-500/30',
  ringFocus: 'focus-visible:ring-violet-500',
  hoverText: 'group-hover:text-violet-400',
  glow: 'shadow-violet-500/20',

  eventBg: 'bg-violet-500/10',
  eventBorder: 'border-violet-500/30',
  eventText: 'text-violet-500',

  apiColor: 'cyan',
  apiBg: 'bg-cyan-500/10',
  apiBorder: 'border-cyan-500/30',
  apiText: 'text-cyan-500',

  cardBorder: 'border-violet-500/20',
  cardBg: 'bg-gradient-to-br from-violet-500/5 to-purple-500/5',
};

// DocVault theme - blue/cyan
export const docVaultTheme: AppTheme = {
  name: 'DocVault',
  shortName: 'D',

  gradient: 'from-blue-500 to-cyan-600',
  gradientHover: 'from-blue-600 to-cyan-700',
  gradientBg: 'bg-gradient-to-br from-blue-500 to-cyan-600',

  accentBg: 'bg-blue-500',
  accentBgLight: 'bg-blue-500/10',

  accentText: 'text-blue-400',
  accentTextDark: 'text-blue-600',

  accentBorder: 'border-blue-500/20',
  accentBorderHover: 'border-blue-500/30',

  shadow: 'shadow-blue-500/25',
  shadowHover: 'shadow-blue-500/40',
  shadowLight: 'shadow-blue-500/10',

  orbGradient1: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
  orbGradient2: 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20',
  orbGradientCenter: 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10',

  shapeBorder: 'border-blue-500/30',
  shapeGradient1: 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30',
  shapeGradient2: 'bg-gradient-to-br from-cyan-500/40 to-blue-500/40',

  pageBgGradient: 'from-blue-500/5 via-cyan-500/5 to-blue-600/10',
  pageBgGradientDark: 'dark:from-blue-500/10 dark:via-cyan-500/10 dark:to-blue-600/20',

  featureHoverBorder: 'hover:border-blue-500/30',
  featureHoverShadow: 'hover:shadow-blue-500/10',

  linkText: 'text-blue-600',
  linkTextDark: 'dark:text-blue-400',
  linkHover: 'hover:text-blue-700',
  linkHoverDark: 'dark:hover:text-blue-300',

  ring: 'ring-blue-500/30',
  ringFocus: 'focus-visible:ring-blue-500',
  hoverText: 'group-hover:text-blue-400',
  glow: 'shadow-blue-500/20',

  eventBg: 'bg-blue-500/10',
  eventBorder: 'border-blue-500/30',
  eventText: 'text-blue-500',

  apiColor: 'sky',
  apiBg: 'bg-sky-500/10',
  apiBorder: 'border-sky-500/30',
  apiText: 'text-sky-500',

  cardBorder: 'border-blue-500/20',
  cardBg: 'bg-gradient-to-br from-blue-500/5 to-cyan-500/5',
};

// Get the "other" app theme for cross-app links
export function getOtherAppTheme(currentTheme: AppTheme): AppTheme {
  return currentTheme.name === 'TaskFlow' ? docVaultTheme : taskFlowTheme;
}
