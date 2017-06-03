/* eslint-disable require-jsdoc */
/* eslint-env mocha */
import config, { base } from './index';
import expect from 'expect';

import ConnectionGroup from '../connection-group/index';

describe('A config', () => {
  let result;

  beforeEach(() => {
    result = config([]);
  });

  it('contains storage settings', () => {
    expect(result.storage).toEqual([]);
  });

  it('contains query engines', () => {
    expect(result.engines).toEqual({});
  });

  it('contains the router', () => {
    expect(result.router).toBe(null);
  });

  it('contains an extend object', () => {
    expect(result.extend).toEqual({
      root: {},
      context: {},
    });
  });

  it('contains network settings', () => {
    expect(result.network).toBeA(ConnectionGroup);
  });

  it('contains a hooks object', () => {
    const hook = {
      read: {
        node: [],
        field: [],
      },
      write: [],
      request: [],
      update: [],
    };
    expect(result.hooks).toEqual({
      before: hook,
      after: hook,
      catch: hook,
    });
  });

  describe('merge', () => {
    it('does not add undefined items', () => {
      const { hooks, network, storage } = config([{}]);
      expect(storage.length).toBe(0);
      expect([...network].length).toBe(0);
      expect(hooks.before.read.node.length).toBe(0);
      expect(hooks.before.read.field.length).toBe(0);
      expect(hooks.before.write.length).toBe(0);
      expect(hooks.before.request.length).toBe(0);
      expect(hooks.before.update.length).toBe(0);
    });

    it('adds extensions', () => {
      const noop = () => {};
      result = config([{
        extend: {
          root: { noop },
          context: { noop },
        },
      }]);

      expect(result.extend.root).toContain({ noop });
      expect(result.extend.context).toContain({ noop });
    });

    it('does not mutate the base "extend"', () => {
      config([{
        extend: {
          root: { root: true },
          context: { context: true },
        },
      }]);

      expect(base.extend.root).toEqual({});
      expect(base.extend.context).toEqual({});
    });

    it('adds storage', () => {
      const storage = { name: 'Storage driver' };

      const result = config([{
        storage: [storage],
      }]);

      expect(result.storage).toEqual([storage]);
    });

    it('merges unwrapped storage plugins', () => {
      const store1 = { name: 'Storage driver #1' };
      const store2 = { name: 'Storage driver #2' };

      const result = config([{
        storage: store1,
      }, {
        storage: store2,
      }]);

      expect(result.storage).toEqual([store1, store2]);
    });

    it('adds query engines', () => {
      const engine = { version: 'potato9000' };

      const engines = {
        potatoQL: engine,
      };

      const result = config([{ engines }]);
      expect(result.engines).toEqual({
        potatoQL: engine,
      });

      // Should not mutate base.
      expect(base.engines).toEqual({});
    });

    it('merges before hooks', () => {
      const write = () => {};
      const hooks = {
        before: { write },
      };

      const result = config([{ hooks }]);

      expect(result.hooks.before.write).toEqual([write]);
    });

    it('adds storage drivers in the order they\'re defined', () => {
      const first = () => {};
      const second = () => {};

      const result = config([{
        storage: [first],
      }, {
        storage: [second],
      }]);

      expect(result.storage).toEqual([first, second]);
    });

    it('adds hooks in the order they\'re defined', () => {
      const first = () => {};
      const second = () => {};

      const result = config([{
        hooks: {
          before: {
            read: { node: first },
          },
        },
      }, {
        hooks: {
          before: {
            read: { node: second },
          },
        },
      }]);

      expect(result.hooks.before.read.node).toEqual([first, second]);
    });

    it('prefers later-defined extensions when conflicts happen', () => {
      const first = () => {};
      const second = () => {};

      const result = config([{
        extend: {
          root: { method: first },
          context: { method: first },
        },
      }, {
        extend: {
          root: { method: second },
          context: { method: second },
        },
      }]);

      expect(result.extend.root.method).toBe(second);
      expect(result.extend.context.method).toBe(second);
    });
  });

  describe('network merge', () => {
    let group1, group2, conn;

    class Connection {
      type = 'test-connection';

      constructor ({ id }) {
        this.id = id;
      }
    }

    beforeEach(() => {
      group1 = new ConnectionGroup();
      group2 = new ConnectionGroup();
      conn = new Connection({ id: 'connection' });
    });

    it('includes every client', () => {
      group1.add(conn);

      const result = config([{ network: group1 }]);

      expect([...result.network]).toContain(conn);
    });

    it('does not unnecessarily wrap groups', () => {
      group1.add(conn);

      const result = config([{ network: group1 }]);

      expect(result.network).toBe(group1);
    });

    it('combines clients from every group', () => {
      const conn2 = new Connection({ id: 'conn2' });
      group1.add(conn);
      group2.add(conn2);

      const result = config([{
        network: group1,
      }, {
        network: group2,
      }]);

      expect([...result.network]).toContain(conn);
      expect([...result.network]).toContain(conn2);
    });

    it('converts single connections into connection groups', () => {
      const conn2 = new Connection({ id: 'conn2' });

      const result = config([{
        network: conn,
      }, {
        network: conn2,
      }]);

      expect(result.network).toBeA(ConnectionGroup);
      expect([...result.network]).toContain(conn);
      expect([...result.network]).toContain(conn2);
    });
  });

  describe('router merge', () => {
    it('adds the router', () => {
      const router = { 'me-a-router': 'yey' };
      const result = config([{ router }]);

      expect(result.router).toBe(router);
    });

    it('throws if given more than one router', () => {
      const fail = () => config([{
        router: {},
      }, {
        router: {},
      }]);

      expect(fail).toThrow(/router/i);
    });
  });
});
