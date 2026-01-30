/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // Source Sans 3: Clean, readable sans-serif optimized for screen
        sans: ['"Source Sans 3"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        // Lora: Elegant, highly readable serif for long-form content
        serif: ['Lora', 'Georgia', '"Times New Roman"', 'serif'],
        // JetBrains Mono: Modern, readable monospace for code
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Monaco', 'Consolas', 'monospace'],
      },
      // ===== Typography System =====
      // Semantic font sizes with line-height and weight
      fontSize: {
        'display': ['2.5rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'h1': ['1.75rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'h3': ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        'h4': ['1.125rem', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['1rem', { lineHeight: '1.75' }],
        'body-sm': ['0.9375rem', { lineHeight: '1.65' }],
        'ui': ['0.9375rem', { lineHeight: '1.5' }],
        'ui-sm': ['0.875rem', { lineHeight: '1.5' }],
        'caption': ['0.8125rem', { lineHeight: '1.5' }],
      },
      // ===== Spacing System =====
      spacing: {
        'touch': '44px',      // Minimum touch target size (WCAG)
        'touch-lg': '52px',   // Large touch target
        '13': '3.25rem',      // Additional spacing value
        '15': '3.75rem',      // Additional spacing value
        '18': '4.5rem',       // Additional spacing value
      },
      // ===== Touch Target Sizes =====
      minHeight: {
        'touch': '44px',      // Minimum touch target height
        'touch-lg': '52px',   // Large touch target height
      },
      minWidth: {
        'touch': '44px',      // Minimum touch target width
        'touch-lg': '52px',   // Large touch target width
      },
      // ===== Breakpoints =====
      screens: {
        'xs': '375px',        // Small mobile (iPhone SE)
        // sm: 640px (Tailwind default)
        // md: 768px (Tailwind default)
        // lg: 1024px (Tailwind default)
        // xl: 1280px (Tailwind default)
        '2xl': '1440px',      // Large desktop
      },
      colors: {
        // Theme colors via CSS variables (set by applyTheme in themes.ts)
        theme: {
          base: 'var(--color-base)',
          surface: 'var(--color-surface)',
          muted: 'var(--color-muted)',
          border: 'var(--color-border)',
          selected: 'var(--color-selected)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-tertiary': 'var(--color-text-tertiary)',
          'text-muted': 'var(--color-text-muted)',
          accent: 'var(--color-accent)',
          'accent-hover': 'var(--color-accent-hover)',
          'accent-soft': 'var(--color-accent-soft)',
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          error: 'var(--color-error)',
          favorite: 'var(--color-favorite)',
        },
        // Focus brand colors (teal/cyan palette) - kept for logo/brand consistency
        spira: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#9af5df',
          300: '#5fe9cb',
          400: '#2dd4b3',
          500: '#14b899',
          600: '#0F766E',
          700: '#115E59',
          800: '#115e52',
          900: '#134d44',
        },
        // Legacy color aliases (kept for backward compatibility during migration)
        cream: {
          base: 'var(--color-base)',
          surface: 'var(--color-surface)',
          muted: 'var(--color-muted)',
          border: 'var(--color-border)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-tertiary': 'var(--color-text-tertiary)',
          'text-muted': 'var(--color-text-muted)',
        },
        sepia: {
          base: 'var(--color-base)',
          surface: 'var(--color-surface)',
          muted: 'var(--color-muted)',
          border: 'var(--color-border)',
          selected: 'var(--color-selected)',
          text: 'var(--color-text)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-tertiary': 'var(--color-text-tertiary)',
          'text-muted': 'var(--color-text-muted)',
        },
        accent: {
          teal: 'var(--color-accent)',
          'teal-light': 'var(--color-accent-soft)',
          'teal-soft': 'var(--color-accent-soft)',
          success: 'var(--color-success)',
          'success-light': 'var(--color-success)',
          warning: 'var(--color-warning)',
          'warning-light': 'var(--color-warning)',
          error: 'var(--color-error)',
          'error-light': 'var(--color-error)',
          favorite: 'var(--color-favorite)',
          'favorite-light': 'var(--color-favorite)',
        },
      },
      // Custom opacity values for surfaces in dark mode
      backgroundColor: {
        'dark-elevated': 'rgba(255, 255, 255, 0.05)',
        'dark-overlay': 'rgba(255, 255, 255, 0.08)',
        'dark-highlight': 'rgba(255, 255, 255, 0.11)',
      },
    },
  },
  plugins: [],
};
