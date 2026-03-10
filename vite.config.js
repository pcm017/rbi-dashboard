import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set BASE to your GitHub repo name, e.g. '/rbi-dashboard/'
// Or set VITE_BASE env var in your GitHub Actions workflow
const base = process.env.VITE_BASE || '/rbi-dashboard/'

export default defineConfig({
  plugins: [react()],
  base,
})
