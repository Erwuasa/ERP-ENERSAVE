/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

function readAppVersionManifest() {
  const manifestPath = path.resolve(__dirname, 'app.version.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    version: string;
    productName: string;
  };
}

function appVersionPlugin(): Plugin {
  const writeManifest = () => {
    const manifest = readAppVersionManifest();
    const payload = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(path.resolve(__dirname, 'public/app-version.json'), payload);
  };

  return {
    name: 'app-version',
    buildStart: writeManifest,
    configureServer: writeManifest,
    closeBundle() {
      const manifest = readAppVersionManifest();
      fs.writeFileSync(
        path.resolve(__dirname, 'dist/app-version.json'),
        JSON.stringify(manifest, null, 2)
      );
    },
  };
}

export default defineConfig(() => {
  const appVersion = readAppVersionManifest();

  return {
    plugins: [react(), tailwindcss(), appVersionPlugin()],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion.version),
      'import.meta.env.VITE_APP_PRODUCT_NAME': JSON.stringify(appVersion.productName),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        sonner: path.resolve(__dirname, 'src/lib/sonner-silent.ts'),
        'sonner-original': 'sonner',
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
