module.exports = {
  root: true,
  ignorePatterns: ['__tests__/', 'node_modules/', '.expo/'],
  extends: ['universe/native', 'universe/shared/typescript-analysis'],
  overrides: [
    {
      files: ['*.config.js', '.eslintrc.js'],
      env: { node: true },
    },
    {
      files: ['*.ts', '*.tsx', '*.d.ts'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
