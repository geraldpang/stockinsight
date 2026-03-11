import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // If deploying to GitHub Pages at: https://username.github.io/repo-name/
  // set base to '/repo-name/'
  // If deploying to root (custom domain or username.github.io), leave as '/'
  base: './',
})
