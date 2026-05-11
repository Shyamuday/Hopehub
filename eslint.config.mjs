import eslint from '@eslint/js';
import angular from 'angular-eslint';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const unusedVarsOptions = {
  argsIgnorePattern: '^_',
  caughtErrorsIgnorePattern: '^_',
  varsIgnorePattern: '^_',
  destructuredArrayIgnorePattern: '^_'
};

const sharedTsRules = {
  'max-lines': ['warn', { max: 600, skipBlankLines: true, skipComments: true }],
  '@typescript-eslint/no-unused-vars': ['error', unusedVarsOptions],
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/consistent-type-imports': [
    'warn',
    { prefer: 'type-imports', fixStyle: 'inline-type-imports' }
  ]
};

const angularTsRules = {
  ...sharedTsRules,
  '@angular-eslint/prefer-inject': 'off',
  '@typescript-eslint/no-explicit-any': 'off'
};

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.angular/**',
      'apps/mobile-*/**',
      'eslint.config.mjs',
      'apps/api/prisma.config.ts'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'off'
    }
  },
  {
    name: 'repo-node-scripts',
    files: ['scripts/**/*.mjs', 'apps/api/scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: globals.node
    },
    rules: {
      'no-console': 'off'
    }
  },
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
      '@typescript-eslint/no-namespace': 'warn',
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
      ...angularTsRules,
      '@typescript-eslint/consistent-type-imports': 'off'
    }
  },
  {
    name: 'doctor-appointments-page',
    files: ['apps/doctor-web/src/app/features/appointments/appointments-page/appointments-page.ts'],
    rules: {
      'max-lines': ['warn', { max: 700, skipBlankLines: true, skipComments: true }]
    }
  },
  {
    name: 'angular-apps-html',
    files: ['apps/web/**/*.html', 'apps/doctor-web/**/*.html', 'apps/admin-web/**/*.html'],
    extends: [...angular.configs.templateRecommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
);
