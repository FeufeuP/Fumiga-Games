/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

export default defineConfig({
  plugins: [react()],
  // './' porque em file:// e WebView Android caminho absoluto não resolve (doc 07).
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    host: true,
    // O preview da arena chega por um host proxy externo — libera o check de host.
    allowedHosts: true,
  },
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
