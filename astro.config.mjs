// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://dovizarsiv.net',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  vite: {
    build: {
      // Script'ler satır içine gömülmez: CSP `script-src 'self'` (public/_headers) 'unsafe-inline' gerektirmez.
      assetsInlineLimit: 0,
    },
  },
});
