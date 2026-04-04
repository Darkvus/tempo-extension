import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-vue'],

  manifest: {
    name: 'Tempo — Fichaje rápido',
    short_name: 'Tempo',
    description: 'Inicia, pausa y detén tus sesiones de trabajo sin salir de tu pestaña.',
    version: '1.0.0',
    permissions: ['storage', 'alarms', 'notifications'],
    action: {
      default_popup: 'popup.html',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },

  vite: () => ({
    plugins: [tailwindcss()],
  }),
})
