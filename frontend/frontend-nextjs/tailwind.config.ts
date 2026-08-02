import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Manrope Light's natural letterforms are already tight at display
      // sizes (round glyphs like s/e/n/m visibly crowd each other in words
      // like "sense"/"Assessment"). Tailwind's default tracking-tight
      // (-0.025em) compounds that and reads as cramped/overlapping across
      // every large font-light headline sitewide. Neutralizing it here
      // fixes every current tracking-tight usage in one place instead of
      // hand-patching dozens of components.
      letterSpacing: {
        tight: '0em',
      },
      colors: {
        background: '#050505',
        surface: '#0a0a0a',
        'surface-hover': '#111111',
        accent: '#c4c9b8',
        'accent-hover': '#dbe0ce',
        border: 'rgba(255,255,255,0.08)',
        'border-hover': 'rgba(255,255,255,0.18)',
      },
      fontFamily: {
        manrope: ['var(--font-manrope)', 'sans-serif'],
        sans: ['var(--font-manrope)', 'sans-serif'],
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};

export default config;
