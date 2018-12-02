// @flow
const workspace = workspace => `<rootDir>/workspaces/${workspace}`;

module.exports = {
  preset: '@freighter/scripts',
  collectCoverage: false,
  projects: [
    workspace('crdts'),
    workspace('db'),
    workspace('mytosis-leveldb'),
    workspace('mytosis-websocket'),
    workspace('streams'),
    workspace('types'),
  ],
};