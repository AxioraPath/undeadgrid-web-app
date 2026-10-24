import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// E2E points this at the in-repo mock backend (see e2e/mock-server.mjs).
const API_TARGET = process.env.E2E_API_TARGET ?? 'http://localhost:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': API_TARGET,
      '/health': API_TARGET,
      '/socket.io': { target: API_TARGET, ws: true },
    },
  },
})
