import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';

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
    Icons({ compiler: 'solid' })
  ],
  server: {
    allowedHosts: true,
  }
})
