import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local XAMPP Apache path: http://localhost/pos%20sys/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
  },
})
