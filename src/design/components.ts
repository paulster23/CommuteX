// Modern Reusable Component Styles
// Neumorphic design with clean, minimal aesthetics

import { StyleSheet } from 'react-native';
import { spacing, borderRadius, typography, lightTheme, darkTheme, shadows, compactSpacing, compactTypography } from './theme';
import type { Theme } from './theme';

// Neumorphic card styles
export const createCardStyles = (theme: Theme, isPressed = false, isElevated = false) => {
  let shadowStyle = theme.shadows.card;
  if (isPressed) shadowStyle = theme.shadows.cardPressed;
  if (isElevated) shadowStyle = theme.shadows.cardElevated;

  return {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadowStyle,
  };
};

// Modern button styles
export const createButtonStyles = (theme: Theme) => StyleSheet.create({
  primary: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.card,
  },
  primaryText: {
    color: '#FFFFFF',
    ...typography.bodyMedium,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: theme.colors.primary,
    ...typography.bodyMedium,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: {
    color: theme.colors.primary,
    ...typography.captionMedium,
  },
});

// Modern indicator styles (for live/estimated status)
export const createIndicatorStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
  text: {
    ...typography.smallMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  live: {
    backgroundColor: `${theme.colors.success}15`, // 15% opacity
  },
  liveDot: {
    backgroundColor: theme.colors.success,
  },
  liveText: {
    color: theme.colors.success,
  },
  estimated: {
    backgroundColor: `${theme.colors.warning}15`, // 15% opacity
  },
  estimatedDot: {
    backgroundColor: theme.colors.warning,
  },
  estimatedText: {
    color: theme.colors.warning,
  },
});

// Modern header styles
export const createHeaderStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl, // Reduced padding for better consistency
    paddingBottom: spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    ...typography.heading,
    color: theme.colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
    color: theme.colors.textSecondary,
  },
});

// Modern status bar styles
export const createStatusBarStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  text: {
    ...typography.caption,
    color: theme.colors.textSecondary,
  },
});

// Modern route card specific styles
export const createRouteCardStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  iconContainer: {
    minWidth: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    ...theme.shadows.cardPressed,
  },
  textInfo: {
    flex: 1,
  },
  title: {
    ...typography.subheading,
    color: theme.colors.text,
    marginBottom: spacing.xs,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  arrivalTime: {
    ...typography.subheading,
    color: theme.colors.text,
    marginBottom: spacing.xs,
    fontSize: 18,
    fontWeight: '700',
  },
  duration: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    fontSize: 12,
  },
  countdownContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  countdownText: {
    ...typography.captionMedium,
    color: theme.colors.primary,
    marginBottom: spacing.sm,
  },
  countdownBar: {
    height: 3,
    backgroundColor: theme.colors.borderLight,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  countdownProgress: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  expandText: {
    ...typography.captionMedium,
    color: theme.colors.primary,
    marginRight: spacing.xs,
    fontSize: 13,
    fontWeight: '500',
  },
  // New timeline styles
  timelineContainer: {
    paddingVertical: 20,
    paddingHorizontal: spacing.md,
    backgroundColor: theme.colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  timelineHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: spacing.md,
  },
  timelineStep: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  timelineIndicator: {
    alignItems: 'center',
    width: 32,
    marginRight: 12,
  },
  timelineIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: theme.colors.borderLight,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDescription: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
    marginRight: 8,
  },
  timelineDuration: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  timelineDurationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  timelineDurationText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  timelineStationInfo: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 4,
    lineHeight: 16,
  },
});

// Loading and error state styles
export const createStateStyles = (theme: Theme) => StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: `${theme.colors.error}30`,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
    alignItems: 'center',
    ...theme.shadows.card,
  },
  errorTitle: {
    ...typography.subheading,
    color: theme.colors.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    ...typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  errorHelp: {
    ...typography.small,
    color: theme.colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
});

// Compact header styles for iPhone 13 mini
export const createCompactHeaderStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: compactSpacing.md, // Reduced from lg
    paddingTop: compactSpacing.lg, // Reduced from xl
    paddingBottom: compactSpacing.md, // Reduced from lg
    backgroundColor: theme.colors.background,
  },
  title: {
    ...compactTypography.heading,
    color: theme.colors.text,
    marginBottom: compactSpacing.xs,
  },
  subtitle: {
    ...compactTypography.caption,
    color: theme.colors.textSecondary,
  },
});

// Compact route card styles for iPhone 13 mini
export const createCompactRouteCardStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: borderRadius.md, // Reduced from lg
    marginBottom: compactSpacing.md,
    overflow: 'hidden',
    ...theme.shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: compactSpacing.md, // Reduced from lg
    paddingBottom: compactSpacing.sm, // Reduced from md
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: compactSpacing.sm, // Reduced from md
  },
  iconContainer: {
    minWidth: 32, // Reduced from 40
    height: 32, // Reduced from 40
    borderRadius: borderRadius.sm, // Reduced from md
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: compactSpacing.sm, // Reduced from md
    ...theme.shadows.cardPressed,
  },
  textInfo: {
    flex: 1,
  },
  title: {
    ...compactTypography.subheading,
    color: theme.colors.text,
    marginBottom: compactSpacing.xs,
  },
  subtitle: {
    ...compactTypography.caption,
    color: theme.colors.textSecondary,
  },
  timeInfo: {
    alignItems: 'flex-end',
  },
  arrivalTime: {
    ...compactTypography.subheading,
    color: theme.colors.text,
    marginBottom: compactSpacing.xs,
  },
  duration: {
    ...compactTypography.caption,
    color: theme.colors.textSecondary,
    marginBottom: compactSpacing.sm,
  },
  countdownContainer: {
    paddingHorizontal: compactSpacing.md,
    paddingBottom: compactSpacing.sm, // Reduced from md
  },
  countdownText: {
    ...compactTypography.captionMedium,
    color: theme.colors.primary,
    marginBottom: compactSpacing.sm,
  },
  countdownBar: {
    height: 3,
    backgroundColor: theme.colors.borderLight,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  countdownProgress: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  expandButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: compactSpacing.sm, // Reduced from md
    backgroundColor: theme.colors.surfaceSecondary,
  },
  expandText: {
    ...compactTypography.captionMedium,
    color: theme.colors.primary,
    marginRight: compactSpacing.xs,
  },
});

// Helper function to get theme-specific styles
export const getThemeStyles = (isDarkMode: boolean) => {
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  return {
    theme,
    card: (isPressed?: boolean, isElevated?: boolean) => createCardStyles(theme, isPressed, isElevated),
    button: createButtonStyles(theme),
    indicator: createIndicatorStyles(theme),
    header: createHeaderStyles(theme),
    statusBar: createStatusBarStyles(theme),
    routeCard: createRouteCardStyles(theme),
    state: createStateStyles(theme),
  };
};

// Helper function to get compact theme-specific styles for iPhone 13 mini
export const getCompactThemeStyles = (isDarkMode: boolean) => {
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  return {
    theme,
    card: (isPressed?: boolean, isElevated?: boolean) => createCardStyles(theme, isPressed, isElevated),
    button: createButtonStyles(theme),
    indicator: createIndicatorStyles(theme),
    header: createCompactHeaderStyles(theme),
    statusBar: createStatusBarStyles(theme),
    routeCard: createCompactRouteCardStyles(theme),
    state: createStateStyles(theme),
  };
};