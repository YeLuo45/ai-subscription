import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  build: {
    rollupOptions: {
      // The 'ai' package and other dependencies are in web/node_modules
      external: [
        'ai', '@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google',
        'mathjs', 'jsonrepair', 'partial-json', 'zod'
      ],
    },
  },
  optimizeDeps: {
    include: [
      'ai', '@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google',
      'mathjs', 'jsonrepair', 'partial-json', 'zod'
    ],
  },
})
