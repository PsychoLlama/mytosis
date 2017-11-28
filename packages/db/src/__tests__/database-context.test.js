// @flow
import Stream from '@mytosis/streams';

import { create as createConfig } from '../config-utils';
import DBContext from '../database-context';

describe('Database context', () => {
  it('is a function', () => {
    expect(DBContext).toEqual(expect.any(Function));
  });

  it('exposes the config', () => {
    const config = createConfig();
    const context = new DBContext(config);

    expect(context.config).toBe(config);
  });

  describe('createReadDescriptor()', () => {
    const setup = (config = createConfig()) => new DBContext(config);

    it('adds default options', () => {
      const context = setup();
      const keys = ['yolo', 'swaggins'];
      const read = context.createReadDescriptor(keys);

      expect(read).toEqual({
        storage: context.config.storage,
        network: context.config.network,
        hooks: context.config.hooks,
        keys,
      });
    });

    it('uses storage when provided', () => {
      const context = setup();
      const keys = ['user'];
      const storage = {
        write: () => Promise.resolve({}),
        read: () => Promise.resolve({}),
      };

      const read = context.createReadDescriptor(keys, { storage });

      expect(read.storage).toBe(storage);
    });

    it('uses hooks when provided', () => {
      const context = setup();
      const keys = ['no'];
      const hooks = [read => read];
      const read = context.createReadDescriptor(keys, { hooks });

      expect(read.hooks).toEqual(hooks);
    });

    it('uses network settings when provided', () => {
      const context = setup();
      const keys = ['yey'];
      const network = {
        connections: [],
        router: {
          push: () => Promise.resolve(),
          pull: () => Promise.resolve(),
        },
      };

      const read = context.createReadDescriptor(keys, { network });

      expect(read.network.router).toEqual(network.router);
    });

    it('throws if the key set is empty', () => {
      const context = setup();
      const fail = () => context.createReadDescriptor([]);

      expect(fail).toThrow(/(empty|key)/i);
    });
  });

  describe('createReadStream()', () => {
    const setup = (config = createConfig(), keys = ['user1', 'user2']) => {
      const context = new DBContext(config);
      const read = context.createReadDescriptor(keys);

      return { context, read };
    };

    it('returns a stream', () => {
      const { context, read } = setup();
      const stream = context.createReadStream(read);

      expect(stream).toEqual(expect.any(Stream));
    });

    it('returns an array of null if there are no plugins', async () => {
      const { context, read } = setup();
      const stream = context.createReadStream(read).toArray();

      const expected = Array(read.keys.length).fill(null);
      await expect(stream).resolves.toEqual(expected);
    });
  });
});
