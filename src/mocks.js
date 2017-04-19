/* eslint-disable require-jsdoc */
import { createSpy } from 'expect';
import Stream from './stream';

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

export class Connection {
  constructor ({ id = 'default-connection-id', type = 'mock' } = {}) {
    this.type = type;
    this.id = id;
  }

  send = createSpy();

  messages = new Stream((push, complete) => {
    this.complete = complete;
    this.push = push;
  });
}

export class Router {
  static create () {
    return new Router();
  }

  push = createSpy().andReturn(Promise.resolve());
  pull = createSpy().andReturn(Promise.resolve());
}

export const createRouter = createSpy().andCall(() => new Router());

export const queryEngine = {
  executeQuery () {},
};
