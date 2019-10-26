import Stream from '@mytosis/streams';

import { create as createConfig } from '../config-utils';
import DBContext from '../database-context';
import AtomContext from '../contexts/Atom';
import MockStorage from '../mocks/storage';
import * as type from '../types';
import Schema from '../schema';

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
    const setup = options => {
      const config = createConfig(options);
      return new DBContext(config);
    };

    it('adds default options', () => {
      const context = setup();
      const keys = ['yolo', 'swaggins'];
      const read = context.createReadDescriptor(keys);

      expect(read).toEqual({
        storage: context.config.storage,
        network: context.config.network,
        hooks: context.config.hooks,
        schema: new Schema({}),
        keys,
      });
    });

    it('uses storage when provided', () => {
      const context = setup();
      const keys = ['user'];
      const storage = new MockStorage();

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
    const User = type.atom('User', {
      initialFieldSet: { ssn: type.number },
      defaultType: type.string,
    });

    const setup = (options, keys = ['user1', 'user2']) => {
      const config = createConfig(options);
      const context = new DBContext(config);
      const read = context.createReadDescriptor(keys);

      return { context, read, config };
    };

    // This requires a painful amount of mocks.
    const setupWithStorage = ({ responses, keys }) => {
      keys = keys || responses.map(result => result.id);

      const schema = responses.reduce((schema, { type }) => {
        if (!type) {
          return schema;
        }

        return {
          ...schema,
          [type.name]: type,
        };
      }, {});

      const result = setup(
        {
          storage: new MockStorage(),
          schema,
        },
        keys
      );

      const mockResults = responses.map(response => ({
        ...response,
        source: result.config.storage,
        type: String(response.type),
      }));

      const stream = Stream.from(mockResults);
      result.config.storage.read.mockReturnValue(stream);

      return result;
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

    it('survives when no data is found', async () => {
      const { context, read, config } = setup({
        storage: new MockStorage(),
      });

      await context.createReadStream(read);

      expect(config.storage.read).toHaveBeenCalledWith(read);
    });

    // Setup is tedious, so this test covers a lot.
    it.skip('contains data given by storage', async () => {
      const { context, read, config } = setupWithStorage({
        responses: [
          {
            data: [1, { name: 'Steve' }],
            type: User,
            id: 'Bacon',
          },
        ],
      });

      expect.assertions(5);
      context.createReadStream(read).forEach(result => {
        expect(result.data).toEqual(expect.any(AtomContext));
        expect(result.type).toBe(User);
        expect(result.id).toBe('Bacon');
        expect(result.source).toBe(config.storage);

        expect(result.data.getFieldMetadata('name')).toEqual({
          type: type.string,
          value: 'Steve',
        });
      });
    });

    it.skip('reduces to an ordered list of nodes', async () => {
      const { read, context } = setupWithStorage({
        keys: ['one', 'two'],
        responses: [
          {
            type: User,
            id: 'two',
            data: [1, { status: 'enabled' }],
          },
          {
            type: User,
            id: 'one',
            data: [1, { status: 'disabled' }],
          },
        ],
      });

      const result = await context.createReadStream(read);
      expect(result).toHaveLength(2);
      expect(result[1]).toMatchObject({
        type: User,
        id: 'two',
      });
    });

    it('re-emits keys which had no result', async () => {
      const { context, read, config } = setupWithStorage({
        responses: [
          {
            data: null,
            type: null,
            id: 'nope',
          },
        ],
      });

      const stream = context.createReadStream(read);
      const consumer = jest.fn();
      stream.forEach(consumer);
      expect(await stream).toEqual([null]);

      expect(consumer).toHaveBeenCalledWith({
        source: config.storage,
        data: null,
        type: null,
        id: 'nope',
      });
    });
  });
});
