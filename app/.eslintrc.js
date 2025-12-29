module.exports = {
  root: true,
  extends: [
    'expo',
  ],
  rules: {
    // Règles de qualité de code
    'no-console': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'off', // Nous utilisons any pour Supabase
    '@typescript-eslint/no-empty-object-type': 'off',
    '@typescript-eslint/no-wrapper-object-types': 'off',

    // Règles React
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',

    // Règles React Hooks
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // Sécurité
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.expo/',
    'android/',
    'ios/',
    '*.config.js',
  ],
};
