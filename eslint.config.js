import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'playwright-report/**', 'test-results/**']
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      'no-undef': 'off'
    }
  },
  {
    files: ['api/**/*.{js,cjs}'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        AbortController: 'readonly',
        clearTimeout: 'readonly',
        fetch: 'readonly',
        module: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly'
      }
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    files: ['src/xmp.ts'],
    rules: {
      'no-irregular-whitespace': 'off'
    }
  },
  {
    files: ['public/sw.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        caches: 'readonly',
        fetch: 'readonly',
        location: 'readonly',
        Request: 'readonly',
        self: 'readonly',
        URL: 'readonly'
      }
    }
  }
);
