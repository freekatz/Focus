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
        // Focus brand colors (teal/cyan palette)
        spira: {
          50: '#f0fdf9',
          100: '#ccfbef',
          200: '#9af5df',
          300: '#5fe9cb',
          400: '#2dd4b3',
          500: '#14b899',
          600: '#0d947c',
          700: '#0f7665',
          800: '#115e52',
          900: '#134d44',
        },
        // Light theme surface colors (warm whites - Apple inspired)
        surface: {
          light: '#FFFFFE',        // Primary surface - warm white
          'light-raised': '#FFFFFF', // Cards, elevated surfaces
          'light-muted': '#FAFAF9',  // Subtle backgrounds
          'light-dim': '#F5F5F4',    // Dimmed areas, inputs
        },
        // Dark theme surface colors (Google Material Design 3 inspired)
        // Using dark gray instead of pure black for better readability
        'surface-dark': {
          DEFAULT: '#121212',         // Base background
          raised: '#1E1E1E',          // Elevated surfaces (+1dp)
          overlay: '#252525',         // Overlays, modals (+2dp)
          high: '#2C2C2C',            // High elevation (+3dp)
        },
        // Light theme text colors (optimized contrast)
        'text-light': {
          primary: '#1C1C1E',         // High emphasis - iOS system gray
          secondary: '#3C3C43',       // Medium emphasis
          tertiary: '#636366',        // Low emphasis
          quaternary: '#AEAEB2',      // Disabled, hints
        },
        // Dark theme text colors (reduced brightness for comfort)
        'text-dark': {
          primary: 'rgba(255, 255, 255, 0.87)',    // High emphasis (87% white)
          secondary: 'rgba(255, 255, 255, 0.60)',  // Medium emphasis (60% white)
          tertiary: 'rgba(255, 255, 255, 0.38)',   // Low emphasis (38% white)
          quaternary: 'rgba(255, 255, 255, 0.24)', // Disabled
        },
        // Accent colors for dark mode (desaturated for comfort)
        accent: {
          teal: '#4DB6AC',       // Desaturated teal
          'teal-soft': '#80CBC4', // Softer variant
          indigo: '#7986CB',      // Desaturated indigo
          'indigo-soft': '#9FA8DA', // Softer variant
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
