/* eslint-disable flowtype/require-valid-file-annotation */
/* eslint-env node */
module.exports = function(api) {
  api.cache(true);

  return {
    presets: [
      require('@freighter/scripts/babel-preset'),
      require('@babel/preset-flow'),
    ],
    plugins: [
      require('@babel/plugin-proposal-async-generator-functions'),
      require('@babel/plugin-proposal-export-namespace-from'),
      require('@babel/plugin-proposal-object-rest-spread'),
      require('@babel/plugin-proposal-class-properties'),
      require('@babel/plugin-transform-runtime'),
    ],
  };
};
