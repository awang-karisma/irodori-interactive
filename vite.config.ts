import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_URL || '/',
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/i18n',
      strategy: [
        "url",
        "localStorage",
        "globalVariable",
        "baseLocale"
      ],
    }),
    tailwindcss(),
    solid(),
    Icons({ compiler: 'solid' }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Irodori Interactive',
        short_name: 'Irodori',
        theme_color: '#863bff',
        background_color: '#ffffff',
        display: 'standalone',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    allowedHosts: true,
  }
})
