import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default {
  plugins: [
    tailwindcss(),
    // Keep autoprefixer after Tailwind
    autoprefixer(),
  ],
}

