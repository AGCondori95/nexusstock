import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class', // Toggle via document.documentElement.classList

  theme: {
    extend: {
      // ─── COLORES — extraídos del :root del HTML ─────────────────────────
      colors: {
        primary: {
          DEFAULT: '#1B4FD8',
          hover: '#1E40AF',
          light: '#EFF6FF',
        },
        accent: '#3B82F6',

        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
        },
        info: {
          DEFAULT: '#0891B2',
          light: '#CFFAFE',
        },

        // Slate completo (sidebar, text, borders)
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },

      // ─── BORDER RADIUS — extraídos de --radius-* ────────────────────────
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        full: '9999px',
      },

      // ─── TIPOGRAFÍA — Inter + JetBrains Mono ────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'nonospace'],
      },

      // ─── FONT SIZES — extraídos de la escala tipográfica ────────────────
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.4', letterSpacing: '0.05em' }],
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['14px', { lineHeight: '1.6' }],
        lg: ['18px', { lineHeight: '1.4' }],
        xl: ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.2' }],
        '3xl': ['32px', { lineHeight: '1', letterSpacing: '-0.02em' }],
      },

      // ─── SPACING — base 4px ──────────────────────────────────────────────
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
      },

      // ─── SIDEBAR ─────────────────────────────────────────────────────────
      width: {
        sidebar: '220px',
        'sidebar-collapsed': '52px',
      },

      // ─── BOX SHADOWS — mínimas, solo focus rings ─────────────────────────
      boxShadow: {
        'focus-ring': '0 0 0 3px rgba(59, 130, 246, 0.18)',
        'focus-ring-danger': '0 0 0 3px rgba(220, 38, 38, 0.18)',
      },

      // ─── BORDER WIDTH ────────────────────────────────────────────────────
      borderWidth: {
        DEFAULT: '1px',
        '0.5': '0.5px',
      },
    },
  },
  plugins: [],
};

export default config;
