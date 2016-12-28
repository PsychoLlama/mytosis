/* eslint-disable require-jsdoc */

export class Storage {
  constructor () {
    this.cache = {};
  }

  async write (graph) {
    const { cache } = this;

    for (const [uid, node] of graph) {
      cache[uid] = JSON.stringify(node);
    }
  }

  async read (uid) {
    const value = this.cache[uid];

    return value && JSON.parse(value);
  }
}

export const queryEngine = {
  executeQuery () {
  },
};
