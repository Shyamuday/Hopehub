import eslint from '@eslint/js';
import angular from 'angular-eslint';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const sharedTsRules = {
  'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
  ],
  '@typescript-eslint/consistent-type-imports': [
    'warn',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
  ]
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.angular/**',
      'apps/mobile-*/**',
      'eslint.config.mjs'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: 'clinic-api',
    files: ['apps/api/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: globals.node
    },
    rules: {
      ...sharedTsRules,
      'no-console': 'off'
    }
  },
  {
    name: 'angular-apps-ts',
    files: ['apps/web/**/*.ts', 'apps/doctor-web/**/*.ts', 'apps/admin-web/**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    processor: angular.processInlineTemplates,
    rules: {
      ...sharedTsRules
    }
  },
  {
    name: 'angular-apps-html',
    files: ['apps/web/**/*.html', 'apps/doctor-web/**/*.html', 'apps/admin-web/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
);
