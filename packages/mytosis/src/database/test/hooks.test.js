import expect, { createSpy, spyOn } from 'expect';
import database from '../../index';
import { Storage } from '../../mocks';
import { Graph } from 'graph-crdt';

describe('Database hook', () => {
  let db, storage, hook;

  beforeEach(() => {
    storage = new Storage();
    hook = createSpy().andCall((write) => write);
  });

  describe('"before.write"', () => {
    let write;

    beforeEach(() => {
      write = spyOn(storage, 'write').andCallThrough();
      db = database({
        storage,
        hooks: {
          before: { write: hook },
        },
      });
    });

    afterEach(() => write.restore());

    it('is called before writes', async () => {
      await db.write('users', {});
      expect(hook).toHaveBeenCalled();
    });

    it('is able to override the graph', async () => {
      const graph = new Graph();
      hook.andCall((write) => ({ ...write, graph }));

      await db.write('stuff', {});

      const [{ graph: state }] = write.calls[0].arguments;
      expect(state).toBe(graph);
    });

    it('is able to prevent writes', async () => {
      const testError = new Error('Testing prevented writes');
      hook.andCall();
      hook.andThrow(testError);

      try {
        await db.write('user', { status: 'rejected (hopefully)' });
        throw new Error('Pipeline before.write rejection was ignored.');
      } catch (error) {
        expect(error).toBe(testError);
      }

      expect(write).toNotHaveBeenCalled();
      expect(await db.read('user')).toBe(null);
    });
  });

  describe('"after.write"', () => {
    beforeEach(() => {
      db = database({
        hooks: {
          after: { write: hook },
        },
      });
    });

    it('is called after writes', async () => {
      await db.write('users', {});
      expect(hook).toHaveBeenCalled();
    });

    it('is passed the options', async () => {
      await db.write('beans', {}, {
        cool: true,
      });

      const [write] = hook.calls[0].arguments;
      expect(write).toContain({
        cool: true,
      });
    });
  });

  describe('"before.read.nodes"', () => {
    let read, hook;

    beforeEach(() => {
      read = spyOn(storage, 'read');
      hook = createSpy().andCall((read) => read);
      db = database({
        storage,
        hooks: {
          before: {
            read: { nodes: hook },
          },
        },
      });
    });

    it('calls the hook before reads', async () => {
      expect(hook).toNotHaveBeenCalled();
      await db.read('users');
      expect(hook).toHaveBeenCalled();
    });

    it('passes the key and options', async () => {
      const options = { 'engage hyperdrive': true };
      await db.read('key name', options);
      const [read] = hook.calls[0].arguments;
      expect(read.keys).toEqual(['key name']);
      expect(read).toContain(options);
    });

    it('can override the key', async () => {
      hook.andCall((read) => ({
        ...read,
        key: `prefix/${read.keys[0]}`,
      }));
      await db.read('stuff');
      const [{ key }] = read.calls[0].arguments;
      expect(key).toBe('prefix/stuff');
    });

    it('can override the options', async () => {
      hook.andCall((read) => ({
        ...read,
        overridden: true,
      }));

      await db.read('key', { original: true });
      const [options] = read.calls[0].arguments;
      expect(options).toContain({
        overridden: true,
        original: true,
      });
    });
  });

  describe('"after.read.node"', () => {
    let hook;

    beforeEach(async () => {
      hook = createSpy().andCall((read) => read);
      db = database({
        hooks: {
          after: {
            read: { nodes: hook },
          },
        },
      });

      await db.write('data', {
        existing: true,
      });
    });

    it('is called after reads', async () => {
      await db.read('data');
      expect(hook).toHaveBeenCalled();
    });

    it('is passed the read value and options', async () => {
      const data = await db.read('data', { cool: 'totally' });
      const [read] = hook.calls[0].arguments;

      expect(read.contexts).toEqual([data]);
      expect(read).toContain({ cool: 'totally' });
    });

    it('can override the return node', async () => {
      hook.andCall((read) => ({
        ...read,
        contexts: ['haha, replaced!'],
      }));
      const value = await db.read('data');
      expect(value).toBe('haha, replaced!');
    });
  });

  describe('"before.read.fields"', () => {
    let hook, node, read;

    beforeEach(async () => {
      hook = createSpy().andCall((read) => read);
      db = database({
        storage,
        hooks: {
          before: {
            read: { fields: hook },
          },
        },
      });

      node = await db.write('context hook test', {});
      read = spyOn(storage, 'read').andCallThrough();
    });

    it('is passed the fields, node, and options', async () => {
      await node.read('name', { passed: true });
      expect(hook).toHaveBeenCalled();

      const [read] = hook.calls[0].arguments;

      expect(read.node).toBe(node);
      expect(read.fields).toEqual(['name']);
      expect(read).toContain({ passed: true });
    });

    it('can override the fields', async () => {
      await node.write('replaced', 'resolved');
      hook.andCall((read) => ({
        ...read,
        fields: ['replaced'],
      }));

      const value = await node.read('nothing here');
      expect(value).toBe('resolved');
    });
  });

  describe('"after.read.fields"', () => {
    let hook, node;

    beforeEach(async () => {
      hook = createSpy().andCall((read) => read);
      db = database({
        hooks: {
          after: {
            read: { fields: hook },
          },
        },
      });

      node = await db.write('after.read.fields tests', {});
    });

    it('is given the fields, value, and options', async () => {
      await node.write('level', 5);
      await node.read('level', { opts: true });
      expect(hook).toHaveBeenCalled();

      const [read] = hook.calls[0].arguments;

      expect(read).toContain({
        fields: [5],
        opts: true,
      });
    });

    it('can override the value', async () => {
      hook.andCall((read) => ({
        ...read,
        fields: ['replaced'],
      }));

      const value = await node.read('whatever');

      expect(value).toBe('replaced');
    });

    it('is called after resolving edges', async () => {
      const edge = await db.write('edge', {});
      await node.write('edge', edge);

      hook.andCall((read) => {
        expect(read.fields[0]).toBe(edge);

        return {
          ...read,
          fields: ['replaced value'],
        };
      });

      const value = await node.read('edge');
      expect(value).toBe('replaced value');
    });
  });
});
