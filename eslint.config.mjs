import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/metro.config.js',
      '**/babel.config.js',
    ],
  },
  ...tseslint.configs.recommended,
  prettierConfig,
);
