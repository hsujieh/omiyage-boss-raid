import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages：https://帳號.github.io/omiyage-boss-raid/
export default defineConfig({
  plugins: [vue()],
  base: process.env.NODE_ENV === 'production' ? '/omiyage-boss-raid/' : '/',
})
