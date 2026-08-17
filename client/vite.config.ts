import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // @grooming-kit/shared is an npm workspace symlink, so Vite would otherwise
    // serve its compiled CommonJS output directly instead of pre-bundling it to
    // ESM, causing "doesn't provide an export named ..." errors in the browser.
    include: ['@grooming-kit/shared'],
  },
})
