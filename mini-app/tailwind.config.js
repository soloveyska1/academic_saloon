/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '375px',   // Small phones
      'sm': '640px',   // Large phones
      'md': '768px',   // Tablets
      'lg': '1024px',  // Laptops
      'xl': '1280px',  // Desktops
    },
    extend: {
      colors: {
        // === SURFACE ELEVATION (Material Design dark) ===
        void: '#0A0A0A',
        onyx: '#0F0F0F',
        'surface-base': '#121212',
        'surface-card': 'rgba(30, 30, 30, 0.7)',
        'surface-elevated': '#2A2A2A',
        'surface-modal': '#333333',
        'surface-glass': 'rgba(255, 255, 255, 0.06)',

        // === LIQUID GOLD (Premium Metallic) ===
        gold: {
          950: '#5c4510',
          900: '#6b4f0f',
          800: '#7d5c12',
          700: '#8E6E27',
          600: '#9e7a1a',
          500: '#b48e26',
          400: '#D4AF37',
          350: '#dfc14a',
          300: '#E8C547',
          250: '#f0d35c',
          200: '#F0DC82',
          150: '#f9e07a',
          100: '#FCF6BA',
          50: '#fff8e1',
        },

        // === BLOOD CRIMSON ===
        crimson: {
          900: '#3d0a0a',
          700: '#5c1010',
          500: '#8a1c1c',
          400: '#b93c3c',
          300: '#dc4c4c',
        },

        // === STATUS ===
        status: {
          success: '#51CF66',
          warning: '#FFD93D',
          error: '#FF6B6B',
          info: '#4ECDC4',
        },

        // === TEXT ===
        'text-primary': '#F5F5F5',
        'text-secondary': '#B0B0B0',
        'text-muted': '#808080',
        'text-gold': '#D4AF37',
      },

      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },

      fontSize: {
        'display-xl': ['clamp(2.5rem, 8vw + 0.5rem, 4rem)', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(2rem, 6vw + 0.25rem, 3.2rem)', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-md': ['clamp(1.6rem, 4vw, 2.4rem)', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-1': ['clamp(1.4rem, 3.5vw, 2rem)', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-2': ['clamp(1.2rem, 2.8vw, 1.6rem)', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-3': ['1.2rem', { lineHeight: '1.35', fontWeight: '600' }],
        'body-lg': ['clamp(1rem, 1.2vw + 0.8rem, 1.1rem)', { lineHeight: '1.6', fontWeight: '400' }],
        'body': ['clamp(0.95rem, 1vw + 0.75rem, 1.05rem)', { lineHeight: '1.6', fontWeight: '400' }],
        'body-sm': ['clamp(0.875rem, 0.8vw + 0.65rem, 0.95rem)', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },

      backgroundImage: {
        // === LIQUID GOLD GRADIENT (The Signature) ===
        'liquid-gold': 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #B38728 75%, #FBF5B7 100%)',
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #E8C547 50%, #B48E26 100%)',
        'gold-gradient-vertical': 'linear-gradient(180deg, #E8C547 0%, #D4AF37 40%, #b48e26 100%)',
        'gold-shimmer': 'linear-gradient(90deg, transparent 0%, rgba(251,245,183,0.4) 50%, transparent 100%)',
        'gold-mesh': `
          radial-gradient(ellipse 60% 40% at 20% 30%, rgba(212,175,55,0.10) 0%, transparent 50%),
          radial-gradient(ellipse 50% 50% at 80% 70%, rgba(232,197,71,0.06) 0%, transparent 50%),
          linear-gradient(180deg, rgba(30,30,30,0.95) 0%, rgba(18,18,18,1) 100%)
        `,
        // === GLASS BACKGROUNDS ===
        'glass-dark': 'linear-gradient(180deg, rgba(30, 30, 30, 0.8) 0%, rgba(18, 18, 18, 0.9) 100%)',
        'glass-gold': 'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(30,30,30,0.95) 50%, rgba(212,175,55,0.04) 100%)',
        // === OTHER ===
        'steel-gradient': 'linear-gradient(180deg, #3E3E3E 0%, #2A2A2A 50%, #1E1E1E 100%)',
        'noise': `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        'radial-top': 'radial-gradient(ellipse 100% 60% at 50% -20%, rgba(212,175,55,0.06) 0%, transparent 60%)',
        // === AURORA BACKGROUND (New Premium Effect) ===
        'aurora': `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212,175,55,0.12) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 20% 50%, rgba(142,110,39,0.08) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 80% 50%, rgba(232,197,71,0.06) 0%, transparent 50%)
        `,
      },

      boxShadow: {
        'gold-glow': '0 0 20px -5px rgba(212, 175, 55, 0.3)',
        'gold-glow-strong': '0 0 40px -5px rgba(212, 175, 55, 0.5)',
        'gold-glow-intense': '0 0 60px -10px rgba(212, 175, 55, 0.7)',
        'inner-gold': 'inset 0 0 24px rgba(212, 175, 55, 0.06)',
        'vault': '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 60px -20px rgba(212, 175, 55, 0.10)',
        'card-heavy': '0 20px 40px -15px rgba(0, 0, 0, 0.6)',
        'card-glass': '0 8px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        'dossier': '0 10px 24px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        'nav-dock': '0 -4px 24px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.5), 0 0 48px -20px rgba(212,175,55,0.08)',
        // === COLORED SHADOWS (Premium dark mode technique) ===
        'gold-drop': '0 8px 24px rgba(212, 175, 55, 0.15)',
        'white-soft': '0 4px 12px rgba(255, 255, 255, 0.05)',
      },

      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '12px',
        '3xl': '12px',
      },

      backdropBlur: {
        'glass': '12px',
        '3xl': '16px',
      },

      animation: {
        'spin-slow': 'spin 8s linear infinite',
        'spin-medium': 'spin 4s linear infinite',
        'spin-reverse': 'spin-reverse 6s linear infinite',
        'pulse-gold': 'pulse-gold 2.5s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'shimmer-gold': 'shimmer-gold 3s linear infinite',
        'shimmer-text': 'shimmer-text 3s linear infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'border-spin': 'border-spin 8s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'aurora-flow': 'aurora-flow 15s ease-in-out infinite',
        'gradient-border': 'gradient-border 3s linear infinite',
      },

      keyframes: {
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px -5px rgba(212, 175, 55, 0.3)' },
          '50%': { boxShadow: '0 0 40px -5px rgba(212, 175, 55, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'shimmer-gold': {
          '0%': { backgroundPosition: '-100% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'shimmer-text': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'border-spin': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'aurora-flow': {
          '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0.8' },
          '33%': { transform: 'translateY(-5%) scale(1.05)', opacity: '1' },
          '66%': { transform: 'translateY(3%) scale(0.95)', opacity: '0.7' },
        },
        'gradient-border': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'heavy': 'cubic-bezier(0.7, 0, 0.3, 1)',
      },

      letterSpacing: {
        'display': '-0.02em',
        'heading': '-0.01em',
        'caps': '0.08em',
        'ultra-wide': '0.25em',
      },
    },
  },
  plugins: [],
}
