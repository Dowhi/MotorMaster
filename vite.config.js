import { defineConfig } from 'vite'

export default defineConfig({
  base: '/', // Base absoluta para evitar conflictos con SW
  server: {
    port: 5173,
    host: true,
    open: true
  },
  build: {
    outDir: 'dist',
  }
})
