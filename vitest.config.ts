// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/': fileURLToPath(new URL('./src/', import.meta.url)),
      '$amplify/env/quiz-generator': fileURLToPath(
        new URL('./test/mocks/amplify-env.quiz-generator.ts', import.meta.url),
      ),
    },
  },
  test: {
    // root-level coverage only
    coverage: {
      reporter: ['text', 'html'],
      include: [
        'src/features/**',
        'amplify/functions/**/handler.{ts,tsx,js,jsx}',
      ],
    },

    // multiple projects
    projects: [
      {
        test: {
          name: 'frontend',
          environment: 'jsdom',
          setupFiles: ['src/test/setupTests.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
          globals: true,
          css: true,
        },
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            '@/': fileURLToPath(new URL('./src/', import.meta.url)),
          },
        },
      },
      {
        test: {
          name: 'functions',
          environment: 'node',
          setupFiles: ['amplify/functions/quizGenerator/__tests__/_setup.ts'],
          include: ['amplify/functions/**/__tests__/**/*.test.ts'],
          globals: true,
          css: false,
        },
      },
    ],
  },
});
