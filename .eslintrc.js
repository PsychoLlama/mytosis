'use strict';

const eslint = exports;

// What environments the code runs in.
eslint.env = {
  'shared-node-browser': true,
  es6: true,
  commonjs: true,
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
  'babel/generator-star-spacing': 'error',
  'babel/new-cap': 'error',
  'babel/array-bracket-spacing': 'error',
  'babel/object-curly-spacing': ['error', 'always'],
  'babel/object-shorthand': 'error',
  'babel/arrow-parens': 'error',
  'babel/no-await-in-loop': 'off',
  'babel/flow-object-type': 'error',
  'babel/func-params-comma-dangle': 'error',
};
