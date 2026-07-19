import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// A plain typescript-eslint + react-hooks flat config. eslint-config-next's
// legacy-eslintrc bridge (via FlatCompat) currently throws a circular-JSON
// error under ESLint 9 in this dependency combination — this config covers
// the rules that actually catch bugs (TS correctness, hooks rules) without
// that fragile bridge.
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'postcss.config.js', 'next.config.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
);
