import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Vitest config (separate from Vite app config) to keep test-specific settings isolated
export default defineConfig({
  plugins: [
    // Needed so Vitest can compile React/TSX the same way as your app
    react(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
      // 👇 add this line
      '$amplify/env/quiz-generator': fileURLToPath(
        new URL('./test/mocks/amplify-env.quiz-generator.ts', import.meta.url),
      ),
    },
  },
  test: {
    // Use a simulated browser so components/hooks can access window/document
    environment: 'jsdom',

    // Runs before every test file — good for global matchers & polyfills
    setupFiles: ['src/test/setupTests.ts'],

    // Allow using `describe/it/expect` without importing from 'vitest' in each file
    globals: true,

    // Let imports of CSS/MUI styles “just work” during tests
    css: true,

    // Optional: configure coverage output
    coverage: {
      reporter: ['text', 'html'], // console + HTML report
      include: ['src/features/**'], // only measure your feature code
    },
  },
});
