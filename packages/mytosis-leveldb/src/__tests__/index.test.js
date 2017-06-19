import { Graph, Node } from 'graph-crdt';

import LevelDB from '../index';

describe('Mytosis LevelDB', () => {
  const fakeLevel = {
    batch: jest.fn(),
    get: jest.fn(),
  };

  let level;

  beforeEach(() => {
    fakeLevel.get.mockReset();
    fakeLevel.batch.mockReset();
    fakeLevel.batch.mockImplementation((ops, fn) => fn());

    level = new LevelDB({
      backend: fakeLevel,
    });
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
    fakeLevel.get.mockImplementation((key, fn) => fn(null, data));

    const value = await level.read({ key: 'key' });

    expect(value).toEqual(data);
    expect(fakeLevel.get).toHaveBeenCalledWith('key', expect.any(Function));
  });

  it('rejects if an error is given', async () => {
    const err = new Error('oh no, something failed');
    fakeLevel.get.mockImplementation((key, fn) => fn(err));

    const spy = jest.fn();
    level.read({ key: 'dave' }).catch(spy);

    // Wait for one promise tick.
    await Promise.resolve();
    expect(spy).toHaveBeenCalledWith(err);
  });

  it('ignores `key not found` errors resolving with `undefined`', async () => {
    const error = new Error('Something something Not Found');
    error.type = 'NotFoundError';

    fakeLevel.get.mockImplementation((key, fn) => fn(error));
    const value = await level.read({ key: 'potatoes' });
    expect(value).toBeUndefined();
  });

  it('writes every node in the graph', async () => {
    const node1 = new Node({ uid: 'a' });
    const node2 = new Node({ uid: 'b' });

    const graph = new Graph();
    graph.merge({ [node1]: node1, [node2]: node2 });

    await level.write({ graph });

    expect(fakeLevel.batch).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function),
    );

    const [update] = fakeLevel.batch.mock.calls[0];
    expect(update.length).toBe(2);
  });

  it('rejects if the batch write fails', async () => {
    const node = new Node({ uid: 'a' });
    node.merge({ update: true });

    const graph = new Graph();
    graph.merge({ [node]: node });

    const error = new Error('Something happened');
    fakeLevel.batch.mockImplementation((ops, fn) => fn(error));

    const spy = jest.fn();
    await level.write({ graph }).catch(spy);

    expect(spy).toHaveBeenCalledWith(error);
  });
});
