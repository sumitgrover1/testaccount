import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Plain typescript-eslint + react-hooks flat config — see frontend/eslint.config.mjs
// for why eslint-config-next's FlatCompat bridge is avoided here.
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
