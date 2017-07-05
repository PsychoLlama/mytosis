/* global localStorage */
import { Graph, Node } from 'graph-crdt';

import LocalStoragePlugin from '../index';

const createFakeStore = () => ({
  removeItem () {},
  setItem () {},
  getItem () {},
  clear () {},
});

describe('Mytosis LocalStorage', () => {
  let store, graph, node;

  beforeEach(() => {
    graph = new Graph();
    node = new Node();

    graph.merge({ [node]: node });

    const localStorage = global.localStorage;
    localStorage.removeItem.mockReset();
    localStorage.setItem.mockReset();
    localStorage.getItem.mockReset();
    localStorage.clear.mockReset();

    store = new LocalStoragePlugin();
  });

  it('exports a function', () => {
    expect(LocalStoragePlugin).toEqual(expect.any(Function));
  });

  it('sets the localStorage backend', () => {
    const backend = createFakeStore();
    const store = new LocalStoragePlugin({ backend });

    expect(store.backend).toBe(backend);
  });

  it('defaults to use global localStorage', () => {
    expect(store.backend).toBe(global.localStorage);
  });

  it('throws if the backend interface is invalid', () => {
    const backend = {};
    const create = () => new LocalStoragePlugin({ backend });

    expect(create).toThrow();
  });

  describe('write()', () => {
    it('writes every node in the graph', () => {
      const other = new Node();
      graph.merge({ [other]: other });
      store.write({ graph });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        String(node),
        JSON.stringify(node)
      );

      expect(localStorage.setItem).toHaveBeenCalledWith(
        String(other),
        JSON.stringify(other)
      );
    });

    it('uses the correct prefix', () => {
      const store = new LocalStoragePlugin({ prefix: 'data-stuff/' });
      store.write({ graph });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        `data-stuff/${String(node)}`,
        expect.any(String)
      );
    });
  });

  describe('read()', () => {
    it('returns null if nothing exists', () => {
      const result = store.read({
        keys: [node.meta().uid],
      });

      expect(result).toEqual([null]);
    });

    it('returns the written item when it exists', () => {
      localStorage.getItem.mockReturnValue(JSON.stringify(node));
      const { uid } = node.meta();

      const [result] = store.read({ keys: [uid] });

      expect(localStorage.getItem).toHaveBeenCalledWith(uid);
      expect(result).toEqual(node.toJSON());
    });

    it('uses the correct prefix', () => {
      const store = new LocalStoragePlugin({ prefix: 'cache-things/' });
      store.read({ keys: ['name'] });

      expect(localStorage.getItem).toHaveBeenCalledWith('cache-things/name');
    });
  });

  describe('remove()', () => {
    it('removes the node', () => {
      const { uid } = node.meta();

      store.remove(uid);

      expect(localStorage.removeItem).toHaveBeenCalledWith(uid);
    });

    it('respects the prefix', () => {
      const store = new LocalStoragePlugin({ prefix: 'potatoes/' });
      const { uid } = node.meta();

      store.remove(uid);

      expect(localStorage.removeItem).toHaveBeenCalledWith(`potatoes/${node}`);
    });
  });
});
