module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module' },
  plugins: ['@typescript-eslint', 'prettier', 'jsdoc'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsdoc/recommended',
    'prettier'
  ],
  rules: {
    'prettier/prettier': ['error'],
    'jsdoc/require-jsdoc': ['warn', {
      publicOnly: true,
      require: {
        ClassDeclaration: true,
        MethodDefinition: true,
        FunctionDeclaration: true
      }
    }],
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }]
  },
  overrides: [
    { files: ['**/*.test.ts'], rules: { 'jsdoc/require-jsdoc': 'off' } }
  ]
};
