/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#0066FF',
          600: '#0052CC',
          200: '#4D9FFF',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        info: '#3B82F6',
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          300: '#E5E7EB',
          500: '#6B7280',
          700: '#374151',
          900: '#1A1A1A',
        },
      },
      borderRadius: {
        none: '0px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.1)',
        float: '0 4px 6px rgba(0,0,0,0.1)',
        modal: '0 10px 15px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
}
