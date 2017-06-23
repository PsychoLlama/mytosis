import expect, { createSpy } from 'expect';
import { Graph, Node } from 'graph-crdt';

import { Storage, Connection, Router, createRouter } from '../../mocks';
import ConnectionGroup from '../../connection-group';
import Context from '../context';
import database from '../root';

describe('Database', () => {
  const settings = database.configuration;
  let db;

  beforeEach(() => {
    db = database();
  });

  it('is an object', () => {
    expect(db).toBeAn(Object);
  });

  it('generates a database configuration', () => {
    const config = db[settings];
    expect(config).toBeAn(Object);
  });

  it('creates a new graph', () => {
    expect(db).toBeA(Graph);
  });

  it('instantiates a new router', () => {
    const db = database({
      router: createRouter,
    });

    expect(db.router).toBeA(Router);

    expect(createRouter).toHaveBeenCalled();
    expect(createRouter).toHaveBeenCalledWith(db, db[settings]);
  });

  describe('read', () => {
    let router;

    beforeEach(() => {
      router = createRouter();

      db = database({
        router: createSpy().andReturn(router),
      });
    });

    it('returns null if nothing is found', async () => {
      const settings = await db.read('settings');
      expect(settings).toBe(null);
    });

    it('calls the router', async () => {
      await db.read('lobby');

      expect(router.pull).toHaveBeenCalled();
      const [read] = router.pull.calls[0].arguments;

      expect(read).toBeAn(Object);
      expect(read.key).toBe('lobby');
    });

    it('resolves with the router response', async () => {
      const data = Node.from({ response: 'router' }).toJSON();
      router.pull.andReturn(data);

      const result = await db.read('weather');
      expect(result).toBeA(Context);
      expect(result.value('response')).toBe('router');
    });

    it('ignores the cache when a flag is set', async () => {
      await db.write('game', { created: 1492219766210 });

      await db.read('game');
      expect(router.pull).toNotHaveBeenCalled();

      await db.read('game', { force: true });
      expect(router.pull).toHaveBeenCalled();
    });
  });

  describe('branch', () => {
    it('returns a new database', () => {
      const result = db.branch();

      expect(result).toBeA(Graph);
      expect(result).toNotBe(db);
    });

    it('contains a config', () => {
      const branch = db.branch();
      const config = branch[database.configuration];

      expect(config).toBeAn(Object);
    });

    it('includes all hooks', () => {
      const hooks = {
        before: { write: createSpy() },
        after: { write: createSpy() },
      };

      const db = database({ hooks });

      const branch = db.branch();
      const config = branch[database.configuration];

      expect(config.hooks.before).toContain({ write: [hooks.before.write] });
      expect(config.hooks.after).toContain({ write: [hooks.after.write] });
    });

    it('includes all api extensions', () => {
      const extend = {
        context: { method: createSpy() },
        root: { method: createSpy() },
      };

      const db = database({ extend });

      const branch = db.branch();
      const config = branch[database.configuration];

      expect(config.extend.root).toEqual(extend.root);
      expect(config.extend.context).toEqual(extend.context);
    });

    it('does not contain storage plugins', () => {
      const db = database({ storage: new Storage() });
      const branch = db.branch();

      const config = branch[database.configuration];

      expect(config.storage).toEqual([]);
    });

    it('does not contain network plugins', () => {
      const connection = new Connection();
      const network = new ConnectionGroup();
      network.add(connection);

      const db = database({ network });
      const branch = db.branch();

      const config = branch[database.configuration];

      // Empty - no connection.
      expect(config.network).toBeA(ConnectionGroup);
      expect([...config.network]).toEqual([]);
    });

    it('does not contain a router', () => {
      const db = database({ router: Router.create });
      const branch = db.branch();
      const config = branch[database.configuration];

      expect(config.router).toBe(null);
    });

    it('contains all the current data', async () => {
      await db.write('user', { name: 'Bob' });
      const branch = db.branch();
      const node = branch.value('user');

      expect(node).toBeA(Node);
      expect([...node]).toEqual([['name', 'Bob']]);
    });
  });

  describe('commit', () => {
    let graph, node, beforeWrite, afterWrite, storage, router;
    const Identity = (value) => value;

    beforeEach(() => {
      beforeWrite = createSpy().andCall(Identity);
      afterWrite = createSpy().andCall(Identity);
      graph = new Graph();
      node = new Node();

      storage = new Storage();
      storage.write = createSpy();

      router = new Router();

      graph.merge({ [node]: node });

      db = database({
        hooks: {
          before: {
            write: beforeWrite,
          },
          after: {
            write: afterWrite,
          },
        },

        storage: [storage],

        router: createSpy().andReturn(router),
      });
    });

    it('returns a promise', () => {
      const result = db.commit(graph);

      expect(result).toBeA(Promise);
    });

    it('triggers the before write pipeline', async () => {
      await db.commit(graph);

      expect(beforeWrite).toHaveBeenCalled();

      const [pipe] = beforeWrite.calls[0].arguments;
      expect(pipe.update).toBeA(Graph);
      expect([...pipe.update]).toEqual([...graph]);
    });

    it('calls storage drivers', async () => {
      await db.commit(graph);

      expect(storage.write).toHaveBeenCalled();
      const [write] = storage.write.calls[0].arguments;

      expect(write.graph).toBeA(Graph);
    });

    it('calls the router', async () => {
      await db.commit(graph);

      expect(router.push).toHaveBeenCalled();

      const [config] = router.push.calls[0].arguments;

      expect(config).toBeAn(Object);
      expect(config.update).toBeA(Graph);
    });

    describe('offline group', () => {
      it('is a ConnectionGroup', async () => {
        await db.commit(graph);

        expect(router.push).toHaveBeenCalled();
        const [config] = router.push.calls[0].arguments;

        expect(config.offline).toBeA(ConnectionGroup);
      });

      it('it contains every offline connection', async () => {
        const conn1 = new Connection({ id: 'conn1' });
        const conn2 = new Connection({ id: 'conn2' });

        conn1.offline = true;
        conn2.offline = false;

        db[database.configuration].network.add(conn1);
        db[database.configuration].network.add(conn2);

        await db.commit(graph);

        const [config] = router.push.calls[0].arguments;
        expect([...config.offline]).toEqual([conn1]);
      });
    });

    it('passes the full state of each node to storage', async () => {
      await db.write('state', { existing: true });
      const update = new Graph();
      const node = new Node({ uid: 'state' });
      node.merge({ new: true });
      update.merge({ [node]: node });
      storage.write.reset();
      await db.commit(update);

      expect(storage.write).toHaveBeenCalled();
      const [write] = storage.write.calls[0].arguments;
      const state = write.graph.value('state');

      expect([...state]).toEqual([
        ...Node.from({
          existing: true,
          new: true,
        }),
      ]);
    });

    it('only contains nodes which updated', async () => {
      const update = new Graph();

      await db.write('unrelated', { ignore: 'please' });
      storage.write.reset();
      await db.commit(update);

      const [write] = storage.write.calls[0].arguments;
      expect(write.graph.value('unrelated')).toNotExist();
    });

    it('uses the storage options if given', async () => {
      await db.commit(graph, { storage: [] });

      expect(storage.write).toNotHaveBeenCalled();
    });

    it('passes the deltas to plugins', async () => {
      await db.commit(graph);

      const [push] = router.push.calls[0].arguments;
      expect(push.history).toBeA(Graph);
      expect(push.update).toBeA(Graph);

      const [write] = storage.write.calls[0].arguments;
      expect(write.history).toBeA(Graph);
      expect(write.update).toBeA(Graph);
    });

    it('only sends the changes', async () => {
      const weather = new Node({ uid: 'weather' });
      weather.merge({ condition: 'sunny', temp: 65 });
      db.merge({ [weather]: weather });

      const changes = new Graph();
      changes.merge(db);
      changes.value(weather).merge({ temp: 70 });
      await db.commit(changes);

      const [push] = router.push.calls[0].arguments;
      expect([...push.update].length).toBe(1);
      expect([...push.update.value('weather')]).toEqual([['temp', 70]]);
    });

    it('caches the value after pipeline validation', async () => {
      const node = Node.from({ updated: true });
      graph.merge({ [node]: node });
      await db.commit(graph);

      const cached = db.value(String(node));
      expect(cached).toExist();
      expect([...cached]).toEqual([...node]);
    });

    it('triggers the after write pipeline', async () => {
      await db.commit(graph);

      expect(afterWrite).toHaveBeenCalled();
      const [write] = afterWrite.calls[0].arguments;

      expect(write.update).toBeA(Graph);
      expect(write.graph).toBeA(Graph);
    });

    it('returns the deltas', async () => {
      node.merge({ commit: null });
      const result = await db.commit(graph);

      expect(result).toBeAn(Object);
      expect(result.history).toBeA(Graph);
      expect(result.update).toBeA(Graph);
    });

    it('transforms nodes into DB contexts', async () => {
      node.merge({ count: 1 });
      await db.commit(graph);

      const { uid } = node.meta();
      expect(db.value(uid)).toBeA(Context);
    });
  });

  describe('write', () => {
    it('saves to the graph', async () => {
      await db.write('user', { name: 'Jesse' });

      const node = db.value('user');

      expect(node).toBeA(Context);

      const name = await node.read('name');
      expect(name).toBe('Jesse');
    });

    it('does not overwrite, instead merges', async () => {
      await db.write('user', { name: 'Bob' });
      await db.write('user', { handle: 'BobTheGreat' });

      const user = db.value('user');

      expect(await user.read('name')).toBe('Bob');
      expect(await user.read('handle')).toBe('BobTheGreat');
    });

    it('updates node fields', async () => {
      const user = await db.write('user', { followers: 50 });

      await db.write('user', { followers: 49 });
      expect(await user.read('followers')).toBe(49);

      await db.write('user', { followers: 51 });
      expect(await user.read('followers')).toBe(51);
    });

    it('returns the written context', async () => {
      const user = await db.write('user', {
        name: 'Bob',
      });

      expect(user).toBeA(Context);
      expect(user).toBe(db.value('user'));

      const name = await user.read('name');
      expect(name).toBe('Bob');
    });
  });

  describe('API extensions', () => {
    const extend = (api) => database({
      extend: { root: api },
    });

    it('are added to the root', () => {
      const db = extend({
        method: () => true,
        prop: 'yep',
      });

      expect(db.method).toBeA(Function);
      expect(db.prop).toBe('yep');
    });

    it('are non-enumerable', () => {
      const db = extend({ prop: 'value' });
      const keys = Object.keys(db);
      expect(keys).toNotContain('prop');
    });

    it('are immutable', () => {
      const db = extend({ stuff: 'original' });
      expect(() => {
        db.stuff = 'something else';
      }).toThrow(Error);
    });
  });
});
