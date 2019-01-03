/* global jasmine */
// babel-eslint freaks out about async generators and semicolons.
/* eslint-disable semi, no-underscore-dangle */
import { Graph, Node } from 'graph-crdt';
import { Readable } from 'stream';

import LevelDB from '../index';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 150;

const createFakeStream = values => {
  const stream = new Readable({ objectMode: true });
  stream.removeAllListeners = jest.fn(stream.removeAllListeners);

  stream._read = jest.fn(() => {
    const [next = null] = values;
    values = values.slice(1);

    if (next instanceof Error) {
      stream.emit('error', next);
    } else {
      // Real life isn't synchronous.
      setTimeout(() => stream.push(next), 20);
    }
  });

  return stream;
};

// Currently battling Babel 7's changes to the runtime module and how it
// polyfills Symbol.asyncIterator. Skipping until it's resolved or I feel
// ambitious (neither is likely in the near term).
describe.skip('Mytosis LevelDB', () => {
  let level, backend;

  beforeEach(() => {
    const stream = createFakeStream([new Node()]);

    backend = {
      createValueStream: jest.fn().mockReturnValue(stream),
      batch: jest.fn((ops, fn) => fn()),
      get: jest.fn(),
    };

    level = new LevelDB({ backend });
  });

  it('throws if the config is omitted', () => {
    const fail = () => new LevelDB();

    expect(fail).toThrow(/expected an object/);
  });

  it('throws if a LevelDB backend is invalid', () => {
    const fail = () => new LevelDB({ backend: 5 });

    expect(fail).toThrow(/backend/);
  });

  it('reads values from levelDB', async () => {
    const data = { something: 'not really' };
    backend.get.mockImplementation((key, fn) => fn(null, data));

    const [value] = await level.read({ keys: ['key'] });

    expect(value).toEqual(data);
    expect(backend.get).toHaveBeenCalledWith('key', expect.any(Function));
  });

  it('rejects if an error is given', async () => {
    const err = new Error('oh no, something failed');
    backend.get.mockImplementation((key, fn) => fn(err));

    const spy = jest.fn();
    level.read({ keys: ['dave'] }).catch(spy);

    // Wait a few promise ticks.
    await Promise.resolve();
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(err);
  });

  it('ignores `key not found` errors resolving with `undefined`', async () => {
    const error = new Error('Something something Not Found');
    error.type = 'NotFoundError';

    backend.get.mockImplementation((key, fn) => fn(error));
    const [value] = await level.read({ keys: ['potatoes'] });
    expect(value).toBeUndefined();
  });

  it('writes every node in the graph', async () => {
    const node1 = new Node({ uid: 'a' });
    const node2 = new Node({ uid: 'b' });

    const graph = new Graph();
    graph.merge({ [node1]: node1, [node2]: node2 });

    await level.write({ graph });

    expect(backend.batch).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function)
    );

    const [update] = backend.batch.mock.calls[0];
    expect(update.length).toBe(2);
  });

  it('rejects if the batch write fails', async () => {
    const node = new Node({ uid: 'a' });
    node.merge({ update: true });

    const graph = new Graph();
    graph.merge({ [node]: node });

    const error = new Error('Something happened');
    backend.batch.mockImplementation((ops, fn) => fn(error));

    const spy = jest.fn();
    await level.write({ graph }).catch(spy);

    expect(spy).toHaveBeenCalledWith(error);
  });

  describe('async iterator', () => {
    it('is defined', () => {
      expect(Symbol.asyncIterator).toBeTruthy();
      expect(level[Symbol.asyncIterator]).toEqual(expect.any(Function));
    });

    it('creates a value stream', async () => {
      for await (const value of level) {
        expect(value).toEqual(expect.any(Node));
      }

      expect(backend.createValueStream).toHaveBeenCalled();
    });

    it('yields every value in the stream', async () => {
      const stream = createFakeStream([new Node(), new Node()]);
      backend.createValueStream.mockReturnValue(stream);
      let run = 0;

      for await (const value of level) {
        expect(value).toEqual(expect.any(Node));
        run += 1;
      }

      expect(run).toBe(2);
    });

    it('forwards errors', async () => {
      const stream = createFakeStream([new Error('oh no!')]);
      backend.createValueStream.mockReturnValue(stream);

      try {
        for await (const value of level) {
          expect(value).toEqual(expect.any(Node));
        }
        throw new Error('Should have thrown an error prior.');
      } catch (error) {
        expect(error.message).toMatch(/oh no/);
        expect(error.message).not.toMatch(/uncaught/i);
      }
    });

    it('destroys the stream after an error', async () => {
      const stream = createFakeStream([new Error('failure!')]);
      backend.createValueStream.mockReturnValue(stream);

      try {
        for await (const value of level) {
          expect(value).toEqual(expect.any(Node));
        }
      } catch (error) {
        // Meh.
      }

      expect(stream.removeAllListeners).toHaveBeenCalledWith();
    });

    it('survives streams of empty databases', async () => {
      const stream = createFakeStream([]);
      backend.createValueStream.mockReturnValue(stream);

      // Pray this doesn't time out.
      for await (const value of level) {
        expect(value).toEqual(expect.any(Node));
        throw new Error('Should not have been called.');
      }
    });
  });
});
