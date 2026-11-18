import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Relative stier, slik at bygget kan hostes fra en vilkårlig mappe.
  base: './',
  build: {
    // ExcelJS (spec 002) er ~930 kB, men lastes som egen del først når Excel brukes.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Brukerflyt-testene (f.eks. FirstUse) tar 3–5 s og gikk over standardgrensen
    // på 5 s når maskinen var travel.
    testTimeout: 15_000,
  },
})
