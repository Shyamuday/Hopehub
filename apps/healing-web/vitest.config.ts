/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['src/test-setup.ts'],
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules', 'dist', '.angular'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test-setup.ts',
                '**/*.d.ts',
                '**/*.config.{js,ts}',
                'src/main.ts',
                'src/main.server.ts',
                'src/server.ts'
            ]
        },
        // Configure for Angular 21 zoneless
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        }
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@app': resolve(__dirname, 'src/app')
        }
    },
    define: {
        'import.meta.vitest': false
    }
});