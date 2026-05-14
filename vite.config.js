import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 78 },
      jpg: { quality: 78 },
      webp: { quality: 78 },
      svg: {
        multipass: true,
        plugins: [
          { name: 'preset-default', params: { overrides: { removeViewBox: false } } },
        ],
      },
    }),
  ],
})