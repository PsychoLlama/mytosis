/* eslint-disable require-jsdoc */

export class Storage {
  cache = {}

  async write ({ graph }) {
    const { cache } = this;

    for (const [uid, node] of graph) {
      cache[uid] = JSON.stringify(node);
    }
  }

  async read ({ key }) {
    const value = this.cache[key];

    return value && JSON.parse(value);
  }
}

export const queryEngine = {
  executeQuery () {},
};
