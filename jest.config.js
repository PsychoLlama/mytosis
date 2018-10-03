const workspace = workspace => `<rootDir>/workspaces/${workspace}`;
const projects = [
  'crdts',
  'db',
  'mytosis-leveldb',
  'mytosis-websocket',
  'streams',
  'types',
].map(workspace);

module.exports = {
  preset: '@freighter/scripts',
  projects,
  coverageThreshold: {
    global: {
      statements: 76.78,
      functions: 75.65,
      branches: 67.97,
      lines: 76.47,
    },
  },
};
