'use strict';

const eslint = exports;

// What environments the code runs in.
eslint.env = {
  'shared-node-browser': true,
  commonjs: true,
  mocha: true,
  jest: true,
  es6: true,
};

// Default configs plus my personal fav.
eslint.extends = [
  'eslint:recommended',
  'llama',
];

// Custom parser for draft-stage language features.
eslint.parser = 'babel-eslint';

// List of plugins.
eslint.plugins = [
  'babel',
];

// Enable ES module support.
eslint.parserOptions = {
  sourceType: 'module',
};

// Add custom rules here.
eslint.rules = {

  // JS-Next specific rules.
  'babel/new-cap': 'error',
  'babel/object-curly-spacing': ['error', 'always'],
  'babel/no-await-in-loop': 'off',
};
