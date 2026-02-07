// Color Theme System for Focus
// Each theme has light and dark variants with consistent color semantics

export type ColorThemeId =
  | "cream"
  | "ocean"
  | "forest"
  | "lavender"
  | "graphite"
  | "custom";

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
    id: "cream",
    name: "Cream",
    nameZh: "奶油",
    // 设计语言：温暖、阅读感、纸质纹理。
    // Light: 类似 Apple Books 的暖光。
    // Dark: 深褐色/黑巧色，比纯黑更护眼 (Material "Surface Tint")。
    light: {
      base: "#F9F6F2", // 极淡的暖米色，比纯白更柔和
      surface: "#FFFFFF", // 纯白卡片，保持清爽
      muted: "#F0EBE5", // 柔和的分割块
      border: "#E6E0D6", // 暖灰色边框
      selected: "#EFE6DB", // 选中态
      text: "#3C3836", // 深暖灰，非纯黑，阅读体验极佳
      textSecondary: "#665C54",
      textTertiary: "#928374",
      textMuted: "#BDAE93",
      accent: "#D97706", // 琥珀色/焦糖色
      accentHover: "#B45309",
      accentSoft: "#FEF3C7", // 极浅的琥珀背景
      success: "#059669",
      warning: "#D97706",
      error: "#DC2626",
      favorite: "#F59E0B",
    },
    dark: {
      base: "#1C1917", // Stone 900，深暖炭黑
      surface: "#292524", // Stone 800，提升层级
      muted: "#44403C",
      border: "#57534E",
      selected: "#44403C",
      text: "#E7E5E4", // 暖白
      textSecondary: "#A8A29E",
      textTertiary: "#78716C",
      textMuted: "#57534E",
      accent: "#F59E0B", // 暗模式下提亮 Accent，保证可见度
      accentHover: "#D97706",
      accentSoft: "#78350F", // 深色背景下的强调色块
      success: "#10B981",
      warning: "#FBBF24",
      error: "#F87171",
      favorite: "#FCD34D",
    },
  },
  {
    id: "ocean",
    name: "Ocean",
    nameZh: "海洋",
    // 设计语言：科技、冷静、通透。
    // Light: 类似 macOS Big Sur 风格，高饱和强调色 + 极淡蓝背景。
    // Dark: 深海蓝黑，Material You 风格。
    light: {
      base: "#F0F7FF", // 极淡的爱丽丝蓝
      surface: "#FFFFFF",
      muted: "#E0F2FE",
      border: "#CCE5FF", // 通透的蓝调边框
      selected: "#D6EFFF",
      text: "#0F172A", // Slate 900，接近黑色的深蓝，对比度极高
      textSecondary: "#334155",
      textTertiary: "#64748B",
      textMuted: "#94A3B8",
      accent: "#007AFF", // Apple System Blue
      accentHover: "#0056B3",
      accentSoft: "#D1E9FF",
      success: "#10B981",
      warning: "#F59E0B",
      error: "#EF4444",
      favorite: "#FBBF24",
    },
    dark: {
      base: "#020617", // Slate 950，极深的蓝黑
      surface: "#0F172A", // Slate 900
      muted: "#1E293B",
      border: "#334155",
      selected: "#1E293B",
      text: "#F8FAFC", // 冷白
      textSecondary: "#CBD5E1",
      textTertiary: "#94A3B8",
      textMuted: "#475569",
      accent: "#38BDF8", // Sky 400，暗模式下的霓虹感
      accentHover: "#0EA5E9",
      accentSoft: "#0C4A6E",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      favorite: "#FCD34D",
    },
  },
  {
    id: "forest",
    name: "Forest",
    nameZh: "森林",
    // 设计语言：自然、治愈、稳重。
    // 修正了原版文字过绿的问题，改为深灰绿，更具可读性。
    light: {
      base: "#F2F7F4", // 极淡的薄荷灰
      surface: "#FFFFFF",
      muted: "#E6F0EA",
      border: "#D1E0D6",
      selected: "#DEF7EC",
      text: "#111827", // 接近黑色的灰，略带绿感
      textSecondary: "#374151",
      textTertiary: "#6B7280",
      textMuted: "#9CA3AF",
      accent: "#059669", // Emerald 600
      accentHover: "#047857",
      accentSoft: "#D1FAE5",
      success: "#059669",
      warning: "#D97706",
      error: "#DC2626",
      favorite: "#F59E0B",
    },
    dark: {
      base: "#062C21", // 极深的丛林绿 (接近黑)
      surface: "#064E3B", // 深绿表面
      muted: "#065F46",
      border: "#047857",
      selected: "#065F46",
      text: "#ECFDF5",
      textSecondary: "#A7F3D0",
      textTertiary: "#6EE7B7",
      textMuted: "#34D399",
      accent: "#34D399", // Emerald 400
      accentHover: "#10B981",
      accentSoft: "#022C22",
      success: "#4ADE80",
      warning: "#FBBF24",
      error: "#F87171",
      favorite: "#FCD34D",
    },
  },
  {
    id: "lavender",
    name: "Lavender",
    nameZh: "薰衣草",
    // 设计语言：优雅、艺术、梦幻。
    // 采用了 iOS Focus Mode 的紫色调。
    light: {
      base: "#FBFBFE", // 几乎白色的淡紫
      surface: "#FFFFFF",
      muted: "#F3F0FF",
      border: "#E9E5F5",
      selected: "#F3E8FF",
      text: "#2E1065", // 极深的紫黑
      textSecondary: "#5B21B6",
      textTertiary: "#7C3AED",
      textMuted: "#A78BFA",
      accent: "#7C3AED", // Violet 600
      accentHover: "#6D28D9",
      accentSoft: "#EDE9FE",
      success: "#10B981",
      warning: "#D97706",
      error: "#DC2626",
      favorite: "#F59E0B",
    },
    dark: {
      base: "#170E25", // 深邃的夜紫
      surface: "#25163E", // 稍亮的表面
      muted: "#362259",
      border: "#4C3075",
      selected: "#362259",
      text: "#FAF5FF",
      textSecondary: "#E9D5FF",
      textTertiary: "#C4B5FD",
      textMuted: "#8B5CF6",
      accent: "#A78BFA", // Violet 400
      accentHover: "#8B5CF6",
      accentSoft: "#2E1065",
      success: "#34D399",
      warning: "#FBBF24",
      error: "#F87171",
      favorite: "#FCD34D",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    nameZh: "石墨",
    // 设计语言：专业、极简、中性。
    // Light: 对标 Apple 默认界面 (#F5F5F7 + #FFFFFF)。
    // Dark: 对标 Apple OLED Dark Mode (纯黑 + 深灰卡片)。
    light: {
      base: "#F5F5F7", // Apple System Gray 6 (Grouped Background)
      surface: "#FFFFFF",
      muted: "#E5E5EA", // Apple System Gray 5
      border: "#D1D1D6", // Apple System Gray 4
      selected: "#E5E5EA",
      text: "#000000", // 纯黑
      textSecondary: "#3C3C43", // 60% Black (Apple Standard)
      textTertiary: "#3C3C43", // 30% Black
      textMuted: "#8E8E93", // Apple System Gray
      accent: "#F97316", // Orange (保持原有色调，但更鲜活)
      accentHover: "#EA580C",
      accentSoft: "#FFEDD5",
      success: "#34C759", // Apple System Green
      warning: "#FF9500", // Apple System Orange
      error: "#FF3B30", // Apple System Red
      favorite: "#FFCC00", // Apple System Yellow
    },
    dark: {
      base: "#000000", // OLED Pure Black
      surface: "#1C1C1E", // Apple System Gray 6 (Dark)
      muted: "#2C2C2E", // Apple System Gray 5 (Dark)
      border: "#3A3A3C", // Apple System Gray 4 (Dark)
      selected: "#2C2C2E",
      text: "#FFFFFF",
      textSecondary: "#EBEBF5", // 60% White
      textTertiary: "#EBEBF5", // 30% White
      textMuted: "#98989D",
      accent: "#FB923C", // Orange 400
      accentHover: "#F97316",
      accentSoft: "#331B08", // 极低透明度的橙色背景
      success: "#30D158",
      warning: "#FF9F0A",
      error: "#FF453A",
      favorite: "#FFD60A",
    },
  },
];

// CSS variable name mapping
const cssVarMap: Record<keyof ColorPalette, string> = {
  base: "--color-base",
  surface: "--color-surface",
  muted: "--color-muted",
  border: "--color-border",
  selected: "--color-selected",
  text: "--color-text",
  textSecondary: "--color-text-secondary",
  textTertiary: "--color-text-tertiary",
  textMuted: "--color-text-muted",
  accent: "--color-accent",
  accentHover: "--color-accent-hover",
  accentSoft: "--color-accent-soft",
  success: "--color-success",
  warning: "--color-warning",
  error: "--color-error",
  favorite: "--color-favorite",
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
  return colorThemes.some((t) => t.id === id) || id === "custom";
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
export function validateCustomTheme(json: string): {
  valid: boolean;
  error?: string;
  theme?: CustomThemeJson;
} {
  try {
    const parsed = JSON.parse(json);

    if (typeof parsed !== "object" || parsed === null) {
      return { valid: false, error: "Must be a JSON object" };
    }

    if (!parsed.light || typeof parsed.light !== "object") {
      return { valid: false, error: 'Missing "light" palette object' };
    }

    if (!parsed.dark || typeof parsed.dark !== "object") {
      return { valid: false, error: 'Missing "dark" palette object' };
    }

    // Validate color values (should be hex colors)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    for (const mode of ["light", "dark"] as const) {
      for (const [key, value] of Object.entries(parsed[mode])) {
        if (typeof value !== "string" || !hexColorRegex.test(value)) {
          return {
            valid: false,
            error: `Invalid color value for ${mode}.${key}: "${value}"`,
          };
        }
      }
    }

    return { valid: true, theme: parsed as CustomThemeJson };
  } catch (e) {
    return { valid: false, error: "Invalid JSON format" };
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
  const baseTheme = colorThemes.find((t) => t.id === "cream")!;
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
