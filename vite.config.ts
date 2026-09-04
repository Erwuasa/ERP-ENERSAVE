/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appVersion = readAppVersionManifest();
  const geminiApiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '';

  return {
    plugins: [react(), tailwindcss(), appVersionPlugin()],
    // Vite only inlines VITE_* unless listed here. Do NOT add SUPABASE_SERVICE_ROLE_KEY.
    envPrefix: ['VITE_', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion.version),
      'import.meta.env.VITE_APP_PRODUCT_NAME': JSON.stringify(appVersion.productName),
      'import.meta.env.GEMINI_API_KEY': JSON.stringify(geminiApiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiApiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        sonner: path.resolve(__dirname, 'src/lib/sonner-silent.ts'),
        'sonner-original': 'sonner',
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
