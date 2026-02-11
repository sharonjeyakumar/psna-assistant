import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: "/psna-assistant",
  plugins: [react()],
  server: {
    host: true,        // enables network access
    port: 5173,        // optional, can be changed
  }
})