/// <reference types="vitest" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * Injects a restrictive Content-Security-Policy meta tag into production builds only
 * (the dev server needs inline scripts for React Fast Refresh).
 * connect-src is limited to this origin plus the configured API origin.
 */
function cspPlugin(apiUrl: string): Plugin {
  return {
    name: 'dcs-csp',
    apply: 'build',
    transformIndexHtml(html) {
      let apiOrigin = '';
      try {
        if (apiUrl) apiOrigin = new URL(apiUrl).origin;
      } catch {
        apiOrigin = '';
      }
      const csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data:",
        "font-src 'self' data:",
        `connect-src 'self' ${apiOrigin}`.trim(),
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ');
      return html.replace(
        '<!-- A strict Content-Security-Policy meta tag is injected at build time (see vite.config.ts). -->',
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />`,
      );
    },
  };
}

// base './' + HashRouter lets the static build run on GitHub Pages under any
// repository path without server-side rewrites.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './',
    plugins: [react(), cspPlugin(env.VITE_API_URL ?? '')],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: { port: 5173 },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      include: ['tests/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
