import { typography, spacing, compactTypography, compactSpacing } from '../theme';

describe('Theme Compact Variants', () => {
  test('shouldHaveCompactTypographyVariants', () => {
    // Red: Test that compact typography has smaller font sizes for iPhone 13 mini
    expect(compactTypography.heading.fontSize).toBe(24); // Reduced from 28
    expect(compactTypography.subheading.fontSize).toBe(18); // Reduced from 20
    expect(compactTypography.body.fontSize).toBe(14); // Reduced from 16
    expect(compactTypography.bodyMedium.fontSize).toBe(14); // Reduced from 16
    expect(compactTypography.caption.fontSize).toBe(12); // Reduced from 14
    expect(compactTypography.captionMedium.fontSize).toBe(12); // Reduced from 14
    expect(compactTypography.small.fontSize).toBe(10); // Reduced from 12
    expect(compactTypography.smallMedium.fontSize).toBe(10); // Reduced from 12
  });

  test('shouldHaveCompactSpacingVariants', () => {
    // Red: Test that compact spacing has tighter spacing for iPhone 13 mini
    expect(compactSpacing.xs).toBe(2); // Reduced from 4
    expect(compactSpacing.sm).toBe(6); // Reduced from 8
    expect(compactSpacing.md).toBe(12); // Reduced from 16
    expect(compactSpacing.lg).toBe(16); // Reduced from 24
    expect(compactSpacing.xl).toBe(24); // Reduced from 32
    expect(compactSpacing.xxl).toBe(32); // Reduced from 48
  });

  test('shouldMaintainTypographyFontWeights', () => {
    // Red: Test that compact typography maintains same font weights
    expect(compactTypography.heading.fontWeight).toBe('700');
    expect(compactTypography.subheading.fontWeight).toBe('600');
    expect(compactTypography.body.fontWeight).toBe('400');
    expect(compactTypography.bodyMedium.fontWeight).toBe('500');
  });

  test('shouldMaintainCompactLineHeights', () => {
    // Red: Test that compact typography has proportionally tighter line heights
    expect(compactTypography.body.lineHeight).toBe(20); // Reduced from 24
    expect(compactTypography.bodyMedium.lineHeight).toBe(20); // Reduced from 24
    expect(compactTypography.caption.lineHeight).toBe(16); // Reduced from 20
    expect(compactTypography.captionMedium.lineHeight).toBe(16); // Reduced from 20
    expect(compactTypography.small.lineHeight).toBe(14); // Reduced from 16
    expect(compactTypography.smallMedium.lineHeight).toBe(14); // Reduced from 16
  });
});