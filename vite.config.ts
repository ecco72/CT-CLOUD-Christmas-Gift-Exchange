import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This is the crucial part for offline file usage:
  // It changes absolute paths "/" to relative paths "./"
  base: './', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure one big CSS file for simplicity
    cssCodeSplit: false,
  }
})