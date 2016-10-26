/* eslint-env mocha*/
import config from './index';
import expect from 'expect';

describe('A database configuration object', () => {
  let result;

  beforeEach(() => {
    result = config([]);
  });

  it('should contain storage settings', () => {
    expect(result.storage).toEqual([]);
  });

  it('should contain an extend object', () => {
    expect(result.extend).toEqual({
      root: {},
      context: {},
    });
  });

  it('should contain network settings', () => {
    expect(result.network).toEqual({
      clients: [],
      servers: [],
    });
  });

  it('should contain a hooks object', () => {
    const hook = {
      read: [],
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

    it('should not add undefined items', () => {
      const { hooks, network, storage } = config([{}]);
      expect(storage.length).toBe(0);
      expect(network.clients.length).toBe(0);
      expect(network.servers.length).toBe(0);
      expect(hooks.before.read.length).toBe(0);
      expect(hooks.before.write.length).toBe(0);
      expect(hooks.before.request.length).toBe(0);
      expect(hooks.before.update.length).toBe(0);
    });

    it('should add extensions', () => {
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

    it('should add storage', () => {
      const storage = { name: 'Storage driver' };

      const result = config([{
        storage: [storage],
      }]);

      expect(result.storage).toEqual([storage]);
    });

    it('should add network client drivers', () => {
      const client = { name: 'Network client' };
      const network = {
        clients: [client],
      };

      const result = config([{ network }]);
      expect(result.network.clients).toEqual([client]);
    });

    it('should add network server drivers', () => {
      const server = { name: 'Network server' };
      const network = {
        servers: [server],
      };
      const result = config([{ network }]);

      expect(result.network.servers).toEqual([server]);
    });

    it('should merge before hooks', () => {
      const write = () => {};
      const hooks = {
        before: { write },
      };

      const result = config([{ hooks }]);

      expect(result.hooks.before.write).toEqual([write]);
    });

    it('should add network drivers in the order they\'re defined', () => {
      const first = () => {};
      const second = () => {};

      const result = config([{
        network: {
          clients: [first],
          servers: [first],
        },
      }, {
        network: {
          clients: [second],
          servers: [second],
        },
      }]);

      expect(result.network.clients).toEqual([first, second]);
      expect(result.network.servers).toEqual([first, second]);
    });

    it('should add storage drivers in the order they\'re defined', () => {
      const first = () => {};
      const second = () => {};

      const result = config([{
        storage: [first],
      }, {
        storage: [second],
      }]);

      expect(result.storage).toEqual([first, second]);
    });

    it('should add hooks in the order they\'re defined', () => {
      const first = () => {};
      const second = () => {};

      const result = config([{
        hooks: {
          before: { read: first },
        },
      }, {
        hooks: {
          before: { read: second },
        },
      }]);

      expect(result.hooks.before.read).toEqual([first, second]);
    });

    it('should prefer later-defined extensions when conflicts happen', () => {
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

});
