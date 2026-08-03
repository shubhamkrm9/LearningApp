module.exports = {
  root: true,
  extends: ['@react-native', 'plugin:security/recommended'],
  plugins: ['security'],
  rules: {
    'security/detect-eval-with-expression': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-object-injection': 'warn'
  }
};
