import { defineConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve preview.tsx path for use in the annotations plugin
const previewPath = path.join(dirname, '.storybook/preview.tsx').replace(/\\/g, '/');

/**
 * Vite plugin that injects setProjectAnnotations() as a side-effect into
 * the first story file. This avoids using setupFiles which breaks Vite's
 * dependency scanner in browser mode (Vitest 4 bug on macOS/Linux where
 * absolute paths are used as browser URLs without /@fs/ prefix, and the
 * scanner fails when .storybook files are in the entries).
 */
function storybookAnnotationsPlugin() {
  return {
    name: 'storybook-annotations-setup',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      if (id.includes('.stories.') && /\.(tsx?|jsx?)$/.test(id)) {
        const preamble = [
          'import * as __sb_react_annotations__ from "@storybook/react/entry-preview";',
          'import * as __sb_a11y_annotations__ from "@storybook/addon-a11y/preview";',
          'import { setProjectAnnotations as __sb_setAnnotations__ } from "storybook/preview-api";',
          `import * as __sb_preview_annotations__ from "${previewPath}";`,
          'if (!globalThis.__SB_PROJECT_ANNOTATIONS_SET__) {',
          '  globalThis.__SB_PROJECT_ANNOTATIONS_SET__ = true;',
          '  __sb_setAnnotations__([__sb_react_annotations__, __sb_a11y_annotations__, __sb_preview_annotations__]);',
          '}',
        ].join('\n');
        return { code: `${preamble}\n${code}`, map: null };
      }
    },
  };
}

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      // Unit tests
      {
        plugins: [react()],
        test: {
          name: 'unit',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          exclude: ['node_modules', 'dist', 'legacy', '**/*.stories.*'],
          css: true,
          reporters: ['verbose'],
          testTimeout: 30000,
          hookTimeout: 45000,
          retry: 1, // retry flaky timeouts from heavy dynamic imports under load
          pool: 'forks', // forks for better mock isolation across test files
          maxForks: 4, // limit concurrency to avoid timeouts on heavy dynamic imports
        },
        resolve: {
          alias: {
            '@': '/src',
            'virtual:pwa-register/react': '/src/test/mocks/pwa-register.ts',
          },
        },
      },
      // Storybook component tests
      {
        extends: true,
        plugins: [
          storybookAnnotationsPlugin(),
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        optimizeDeps: {
          include: [
            '@storybook/react/entry-preview',
            '@storybook/addon-a11y/preview',
            'storybook/preview-api',
          ],
        },
        test: {
          name: 'storybook',
          testTimeout: 15000,
          retry: 1,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'legacy/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/*',
        '**/*.stories.*',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
      'virtual:pwa-register/react': '/src/test/mocks/pwa-register.ts',
    },
  },
});
