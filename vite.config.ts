import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite';
import Icons from 'unplugin-icons/vite';

export default defineConfig({
  plugins: [tailwindcss(), solid(), Icons({ compiler: 'solid' })],
})
