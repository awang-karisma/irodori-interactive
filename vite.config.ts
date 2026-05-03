import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [tailwindcss(), solid(), Icons({ compiler: 'solid' })],
  server: {
    allowedHosts: true,
  }
})
