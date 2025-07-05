// Modern Design System for CommuteX
// Based on latest mobile app design trends: neumorphism, minimalism, and modern color palettes

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Compact spacing for iPhone 13 mini (360 x 780)
export const compactSpacing = {
  xs: 2,
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
} as const;

export const typography = {
  // Modern font sizes with better hierarchy
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  smallMedium: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
} as const;

// Compact typography for iPhone 13 mini (360 x 780)
export const compactTypography = {
  heading: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  small: {
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
  smallMedium: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 14,
  },
} as const;

// Modern color palette - harmonious and minimal
export const colors = {
  // Primary brand colors
  primary: '#007AFF',
  primaryLight: '#4DA6FF',
  primaryDark: '#0056CC',
  
  // Accent color for highlights
  accent: '#FF6B6B',
  accentLight: '#FF9999',
  
  // Success/Live indicator
  success: '#34C759',
  successLight: '#6EE387',
  
  // Warning/Estimated indicator  
  warning: '#FF9500',
  warningLight: '#FFB84D',
  
  // Error states
  error: '#FF3B30',
  errorLight: '#FF7A70',
  
  // Neutral grays for modern minimalist design
  gray: {
    50: '#F8F9FA',
    100: '#F1F3F4',
    200: '#E8EAED',
    300: '#DADCE0',
    400: '#BDC1C6',
    500: '#9AA0A6',
    600: '#80868B',
    700: '#5F6368',
    800: '#3C4043',
    900: '#202124',
  },
  
  // Keep original MTA subway line colors for authenticity
  subway: {
    'R': '#FCCC0A', // Yellow
    'F': '#FF6319', // Orange
    '4': '#00933C', // Green
    '6': '#00933C', // Green
    'N': '#FCCC0A', // Yellow
    'Q': '#FCCC0A', // Yellow
    'W': '#FCCC0A', // Yellow
    'B': '#FF6319', // Orange
    'D': '#FF6319', // Orange
    'M': '#FF6319', // Orange
    'G': '#6CBE45', // Light Green
    'L': '#A7A9AC', // Gray
    'A': '#0039A6', // Blue
    'C': '#0039A6', // Blue
    'E': '#0039A6', // Blue
    'J': '#996633', // Brown
    'Z': '#996633', // Brown
    '1': '#EE352E', // Red
    '2': '#EE352E', // Red
    '3': '#EE352E', // Red
    '5': '#00933C', // Green
    '7': '#B933AD', // Purple
    'S': '#808183', // Gray
  },
} as const;

// Neumorphic shadows for modern card design
export const shadows = {
  // Light theme neumorphic shadows
  light: {
    card: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardPressed: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    cardElevated: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
  },
  // Dark theme neumorphic shadows
  dark: {
    card: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 2,
    },
    cardPressed: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 1,
    },
    cardElevated: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 4,
    },
  },
} as const;

// Theme definitions
export const lightTheme = {
  colors: {
    background: colors.gray[50],
    surface: '#FFFFFF',
    surfaceSecondary: colors.gray[100],
    text: colors.gray[900],
    textSecondary: colors.gray[600],
    textTertiary: colors.gray[500],
    border: colors.gray[200],
    borderLight: colors.gray[100],
    primary: colors.primary,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
  },
  shadows: shadows.light,
} as const;

export const darkTheme = {
  colors: {
    background: colors.gray[900],
    surface: colors.gray[800],
    surfaceSecondary: colors.gray[700],
    text: colors.gray[50],
    textSecondary: colors.gray[300],
    textTertiary: colors.gray[400],
    border: colors.gray[600],
    borderLight: colors.gray[700],
    primary: colors.primaryLight,
    accent: colors.accentLight,
    success: colors.successLight,
    warning: colors.warningLight,
    error: colors.errorLight,
  },
  shadows: shadows.dark,
} as const;

export type Theme = typeof lightTheme;
export type ThemeColors = Theme['colors'];