module.exports = {
  root: true,
  parserOptions: {
    esversion: 6,
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  plugins: [
    'ember',
    'ember-suave'
  ],
  extends: [
    'eslint:recommended',
    'plugin:ember/recommended',
    'plugin:ember-suave/recommended'
  ],
  env: {
    node: false,
    browser: true
  },
  globals: {
    // "forin": false,
    "document": false,
    "window": false,
    "console": false,
    "Worker": false
  },
  rules: {
    // overwritten ember suave recommeded rule
    'space-unary-ops': ['error', {
      'words': true,
      'nonwords': false
    }],
    'ember-suave/require-access-in-comments': 'off',
    'camelcase': 'off',

    'func-call-spacing': ["error", "never"],
    'eol-last': ["error", "always"],
    "no-console": "off",
    "no-alert": "error",
    eqeqeq: ["error", "always"],
    "no-eval": "error",
    "no-caller": "error",
    "no-undef": "error",
    "no-eq-null": "error",
    "no-useless-escape": "off",
    "no-extra-parens": "off",
    // overwritten ember plugin recommeded rule
    "ember/avoid-leaking-state-in-ember-objects": "off",
    "ember/closure-actions": "off"
  },
  overrides: [
    // node files
    {
      files: [
        'testem.js',
        'ember-cli-build.js',
        'config/**/*.js'
      ],
      parserOptions: {
        sourceType: 'script',
        ecmaVersion: 2015
      },
      env: {
        browser: false,
        node: true
      }
    },
    // test files
    {
      files: ['tests/**/*.js'],
      excludedFiles: ['tests/dummy/**/*.js'],
      env: {
        embertest: true
      }
    }
  ]
};
