// Color Theme System for Focus
// Each theme has light and dark variants with consistent color semantics

export type ColorThemeId = 'cream' | 'ocean' | 'forest' | 'lavender' | 'graphite' | 'custom';

export interface ColorPalette {
  base: string;
  surface: string;
  muted: string;
  border: string;
  selected: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  success: string;
  warning: string;
  error: string;
  favorite: string;
}

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  nameZh: string;
  light: ColorPalette;
  dark: ColorPalette;
}

export const colorThemes: ColorTheme[] = [
  {
    id: 'cream',
    name: 'Cream',
    nameZh: '奶油',
    light: {
      base: '#FDF8F3',
      surface: '#FFFCF7',
      muted: '#F7F3ED',
      border: '#E8E2DA',
      selected: '#F0EBE4',
      text: '#2D2926',
      textSecondary: '#5C534A',
      textTertiary: '#8B8178',
      textMuted: '#A8A29E',
      accent: '#C2410C',
      accentHover: '#9A3412',
      accentSoft: '#EA580C',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      favorite: '#F59E0B',
    },
    dark: {
      base: '#D9CFC3',
      surface: '#E5DDD2',
      muted: '#CCC2B5',
      border: '#B8ADA0',
      selected: '#C5BAA9',
      text: '#2D2926',
      textSecondary: '#44403C',
      textTertiary: '#78716C',
      textMuted: '#A8A29E',
      accent: '#C2410C',
      accentHover: '#9A3412',
      accentSoft: '#EA580C',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
      favorite: '#F59E0B',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    nameZh: '海洋',
    light: {
      base: '#F0F9FF',
      surface: '#FFFFFF',
      muted: '#E0F2FE',
      border: '#BAE6FD',
      selected: '#E0F2FE',
      text: '#0C4A6E',
      textSecondary: '#075985',
      textTertiary: '#0369A1',
      textMuted: '#7DD3FC',
      accent: '#0EA5E9',
      accentHover: '#0284C7',
      accentSoft: '#38BDF8',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      favorite: '#FBBF24',
    },
    dark: {
      base: '#0F172A',
      surface: '#1E293B',
      muted: '#334155',
      border: '#475569',
      selected: '#334155',
      text: '#F1F5F9',
      textSecondary: '#CBD5E1',
      textTertiary: '#94A3B8',
      textMuted: '#64748B',
      accent: '#38BDF8',
      accentHover: '#0EA5E9',
      accentSoft: '#7DD3FC',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      favorite: '#FCD34D',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    nameZh: '森林',
    light: {
      base: '#F5FBF7',
      surface: '#FAFCFB',
      muted: '#EDF5F0',
      border: '#D4E5DA',
      selected: '#E5F0E9',
      text: '#2D4A3E',
      textSecondary: '#4A6B5D',
      textTertiary: '#6B8F7D',
      textMuted: '#9BB5A6',
      accent: '#10B981',
      accentHover: '#059669',
      accentSoft: '#34D399',
      success: '#10B981',
      warning: '#D97706',
      error: '#DC2626',
      favorite: '#F59E0B',
    },
    dark: {
      base: '#1A2F23',
      surface: '#243D2E',
      muted: '#2D4A3A',
      border: '#3D6B52',
      selected: '#2D4A3A',
      text: '#E8F0EA',
      textSecondary: '#C8D9CC',
      textTertiary: '#9BB5A6',
      textMuted: '#6B8F7D',
      accent: '#4ADE80',
      accentHover: '#22C55E',
      accentSoft: '#86EFAC',
      success: '#4ADE80',
      warning: '#FBBF24',
      error: '#F87171',
      favorite: '#FCD34D',
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    nameZh: '薰衣草',
    light: {
      base: '#F8F6FA',
      surface: '#FDFCFE',
      muted: '#F0EDF5',
      border: '#DED8E8',
      selected: '#EBE6F2',
      text: '#4A3B5C',
      textSecondary: '#5E4A6E',
      textTertiary: '#8B7A9E',
      textMuted: '#B5A8C4',
      accent: '#8B5CF6',
      accentHover: '#7C3AED',
      accentSoft: '#A78BFA',
      success: '#10B981',
      warning: '#D97706',
      error: '#DC2626',
      favorite: '#F59E0B',
    },
    dark: {
      base: '#1F1D2B',
      surface: '#2A2838',
      muted: '#363347',
      border: '#4D4A5E',
      selected: '#363347',
      text: '#EAE8F0',
      textSecondary: '#D4D1DE',
      textTertiary: '#A9A4B8',
      textMuted: '#7A7590',
      accent: '#A78BFA',
      accentHover: '#8B5CF6',
      accentSoft: '#C4B5FD',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      favorite: '#FCD34D',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    nameZh: '石墨',
    light: {
      base: '#FAFAFA',
      surface: '#FFFFFF',
      muted: '#F4F4F5',
      border: '#E4E4E7',
      selected: '#F4F4F5',
      text: '#18181B',
      textSecondary: '#3F3F46',
      textTertiary: '#71717A',
      textMuted: '#A1A1AA',
      accent: '#F97316',
      accentHover: '#EA580C',
      accentSoft: '#FB923C',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      favorite: '#FBBF24',
    },
    dark: {
      base: '#18181B',
      surface: '#27272A',
      muted: '#3F3F46',
      border: '#52525B',
      selected: '#3F3F46',
      text: '#FAFAFA',
      textSecondary: '#E4E4E7',
      textTertiary: '#A1A1AA',
      textMuted: '#71717A',
      accent: '#FB923C',
      accentHover: '#F97316',
      accentSoft: '#FDBA74',
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      favorite: '#FCD34D',
    },
  },
];

// CSS variable name mapping
const cssVarMap: Record<keyof ColorPalette, string> = {
  base: '--color-base',
  surface: '--color-surface',
  muted: '--color-muted',
  border: '--color-border',
  selected: '--color-selected',
  text: '--color-text',
  textSecondary: '--color-text-secondary',
  textTertiary: '--color-text-tertiary',
  textMuted: '--color-text-muted',
  accent: '--color-accent',
  accentHover: '--color-accent-hover',
  accentSoft: '--color-accent-soft',
  success: '--color-success',
  warning: '--color-warning',
  error: '--color-error',
  favorite: '--color-favorite',
};

/**
 * Apply a color theme to the document by setting CSS variables
 */
export function applyTheme(themeId: ColorThemeId, isDark: boolean): void {
  const theme = colorThemes.find((t) => t.id === themeId);
  if (!theme) return;

  const palette = isDark ? theme.dark : theme.light;
  const root = document.documentElement;

  // Apply all color variables
  for (const [key, cssVar] of Object.entries(cssVarMap)) {
    const value = palette[key as keyof ColorPalette];
    root.style.setProperty(cssVar, value);
  }

  // Update body background and text for immediate visual feedback
  document.body.style.backgroundColor = palette.base;
  document.body.style.color = palette.text;
}

/**
 * Get a theme by ID
 */
export function getTheme(themeId: ColorThemeId): ColorTheme | undefined {
  return colorThemes.find((t) => t.id === themeId);
}

/**
 * Check if a theme ID is valid
 */
export function isValidThemeId(id: string): id is ColorThemeId {
  return colorThemes.some((t) => t.id === id) || id === 'custom';
}

/**
 * Custom theme JSON structure
 */
export interface CustomThemeJson {
  name?: string;
  light: Partial<ColorPalette>;
  dark: Partial<ColorPalette>;
}

/**
 * Validate custom theme JSON
 */
export function validateCustomTheme(json: string): { valid: boolean; error?: string; theme?: CustomThemeJson } {
  try {
    const parsed = JSON.parse(json);

    if (typeof parsed !== 'object' || parsed === null) {
      return { valid: false, error: 'Must be a JSON object' };
    }

    if (!parsed.light || typeof parsed.light !== 'object') {
      return { valid: false, error: 'Missing "light" palette object' };
    }

    if (!parsed.dark || typeof parsed.dark !== 'object') {
      return { valid: false, error: 'Missing "dark" palette object' };
    }

    // Validate color values (should be hex colors)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    for (const mode of ['light', 'dark'] as const) {
      for (const [key, value] of Object.entries(parsed[mode])) {
        if (typeof value !== 'string' || !hexColorRegex.test(value)) {
          return { valid: false, error: `Invalid color value for ${mode}.${key}: "${value}"` };
        }
      }
    }

    return { valid: true, theme: parsed as CustomThemeJson };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON format' };
  }
}

/**
 * Apply a custom theme from JSON
 */
export function applyCustomTheme(customJson: string, isDark: boolean): boolean {
  const validation = validateCustomTheme(customJson);
  if (!validation.valid || !validation.theme) {
    return false;
  }

  // Start with cream theme as base
  const baseTheme = colorThemes.find((t) => t.id === 'cream')!;
  const basePalette = isDark ? baseTheme.dark : baseTheme.light;
  const customPalette = isDark ? validation.theme.dark : validation.theme.light;

  // Merge custom colors onto base palette
  const mergedPalette = { ...basePalette, ...customPalette };

  const root = document.documentElement;

  // Apply all color variables
  for (const [key, cssVar] of Object.entries(cssVarMap)) {
    const value = mergedPalette[key as keyof ColorPalette];
    if (value) {
      root.style.setProperty(cssVar, value);
    }
  }

  // Update body background and text
  document.body.style.backgroundColor = mergedPalette.base;
  document.body.style.color = mergedPalette.text;

  return true;
}
