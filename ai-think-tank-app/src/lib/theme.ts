// Custom Theme: Deep Ocean meets Aurora
// A sophisticated palette combining deep ocean tones with aurora-inspired accents

export const theme = {
  colors: {
    // Primary palette - Deep ocean tones
    primary: {
      50: '#e6f3f7',
      100: '#c0e2eb',
      200: '#96cfde',
      300: '#6cbcd1',
      400: '#4dadc7',
      500: '#2d9fbd', // Main primary
      600: '#2891af',
      700: '#227e9c',
      800: '#1c6a89',
      900: '#114968',
    },

    // Secondary palette - Aurora coral/amber
    secondary: {
      50: '#fff4ed',
      100: '#ffe4d1',
      200: '#ffcaa2',
      300: '#ffa668',
      400: '#ff7c2c',
      500: '#ff5a0c', // Main secondary
      600: '#f03e03',
      700: '#c72d06',
      800: '#9e260d',
      900: '#7f230f',
    },

    // Background colors - Midnight depths
    background: {
      primary: '#0a1628', // Deep midnight blue
      secondary: '#0f1f35', // Slightly lighter
      tertiary: '#142843', // Card backgrounds
      hover: '#1a3352', // Hover states
      selected: '#1f3d62', // Selected items
    },

    // Surface colors for cards and panels
    surface: {
      primary: '#0f1f35',
      secondary: '#142843',
      tertiary: '#1a3352',
      border: '#2a4a6f',
      divider: '#1f3d62',
    },

    // Text colors
    text: {
      primary: '#e8f1f5', // Bright text on dark
      secondary: '#a8c2d3', // Muted text
      tertiary: '#7693a8', // Even more muted
      inverse: '#0a1628', // Dark text on light
      accent: '#4dadc7', // Accent text (links, etc)
    },

    // Semantic colors
    semantic: {
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },

    // Special UI elements
    ui: {
      mention: '#4dadc7', // @mentions
      mentionBg: 'rgba(77, 173, 199, 0.15)',
      code: '#1a3352',
      codeBorder: '#2a4a6f',
      online: '#22c55e',
      typing: '#a8c2d3',
      channel: '#6cbcd1',
    }
  },

  // Spacing system
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  },

  // Typography
  typography: {
    fontFamily: {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "Cascadia Code", "SF Mono", monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
  },

  // Border radius
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },

  // Shadows (adjusted for dark theme)
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.3)',
    md: '0 4px 12px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 24px rgba(0, 0, 0, 0.5)',
    xl: '0 12px 48px rgba(0, 0, 0, 0.6)',
    glow: '0 0 20px rgba(77, 173, 199, 0.3)',
  },

  // Transitions
  transitions: {
    fast: '150ms ease',
    base: '250ms ease',
    slow: '350ms ease',
  }
}

// CSS variables for easy access in components
export const getCSSVariables = () => {
  const vars: Record<string, string> = {}

  // Colors
  Object.entries(theme.colors).forEach(([category, values]) => {
    if (typeof values === 'object') {
      Object.entries(values).forEach(([shade, color]) => {
        vars[`--color-${category}-${shade}`] = color as string
      })
    }
  })

  // Spacing
  Object.entries(theme.spacing).forEach(([key, value]) => {
    vars[`--spacing-${key}`] = value
  })

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    vars[`--radius-${key}`] = value
  })

  return vars
}