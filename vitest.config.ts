import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/lib/test/helpers/setup.ts'],
    coverage: {
      provider: 'istanbul',
      thresholds: {
        branches: 0,
        functions: 100,
        lines: 100,
        statements: 100,
      },
      reporter: ['text-summary', 'html'],
      exclude: ['node_modules/', 'src/lib/test/**', 'e2e/**', 'playwright.config.ts'],
    },
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'e2e/**'],
  },
});
