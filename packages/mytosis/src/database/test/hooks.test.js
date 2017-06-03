/* eslint-env mocha */
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
        storage: [storage],
        hooks: {
          before: { write: hook },
        },
      });
    });

    afterEach(() => write.restore());

    it('should be called before writes', async () => {
      await db.write('users', {});
      expect(hook).toHaveBeenCalled();
    });

    it('should be able to override the graph', async () => {
      const graph = new Graph();
      hook.andCall((write) => ({ ...write, graph }));

      await db.write('stuff', {});

      const [{ graph: state }] = write.calls[0].arguments;
      expect(state).toBe(graph);
    });

    it('should be able to prevent writes', async () => {
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

    it('should be called after writes', async () => {
      await db.write('users', {});
      expect(hook).toHaveBeenCalled();
    });

    it('should be passed the options', async () => {
      await db.write('beans', {}, {
        cool: true,
      });

      const [write] = hook.calls[0].arguments;
      expect(write).toContain({
        cool: true,
      });
    });

  });

  describe('"before.read.node"', () => {
    let read, hook;

    beforeEach(() => {
      read = spyOn(storage, 'read');
      hook = createSpy().andCall((read) => read);
      db = database({
        storage: [storage],
        hooks: {
          before: {
            read: { node: hook },
          },
        },
      });
    });

    it('should call the hook before reads', async () => {
      expect(hook).toNotHaveBeenCalled();
      await db.read('users');
      expect(hook).toHaveBeenCalled();
    });

    it('should pass the key and options', async () => {
      const options = { 'engage hyperdrive': true };
      await db.read('key name', options);
      const [read] = hook.calls[0].arguments;
      expect(read.key).toBe('key name');
      expect(read).toContain(options);
    });

    it('should allow overriding the key', async () => {
      hook.andCall((read) => ({
        ...read,
        key: `prefix/${read.key}`,
      }));
      await db.read('stuff');
      const [{ key }] = read.calls[0].arguments;
      expect(key).toBe('prefix/stuff');
    });

    it('should allow overriding the options', async () => {
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
            read: { node: hook },
          },
        },
      });

      await db.write('data', {
        existing: true,
      });
    });

    it('should be called after reads', async () => {
      await db.read('data');
      expect(hook).toHaveBeenCalled();
    });

    it('should be passed the read value and options', async () => {
      const data = await db.read('data', { cool: 'totally' });
      const [read] = hook.calls[0].arguments;

      expect(read.context).toBe(data);
      expect(read).toContain({ cool: 'totally' });
    });

    it('should allow override of the return node', async () => {
      hook.andCall((read) => ({
        ...read,
        context: 'haha, replaced!',
      }));
      const value = await db.read('data');
      expect(value).toBe('haha, replaced!');
    });

  });

  describe('"before.read.field"', () => {
    let hook, node, read;

    beforeEach(async () => {
      hook = createSpy().andCall((read) => read);
      db = database({
        storage: [storage],
        hooks: {
          before: {
            read: { field: hook },
          },
        },
      });

      node = await db.write('context hook test', {});
      read = spyOn(storage, 'read').andCallThrough();
    });

    it('should be passed the field, node, and options', async () => {
      await node.read('name', { passed: true });
      expect(hook).toHaveBeenCalled();

      const [read] = hook.calls[0].arguments;

      expect(read.node).toBe(node);
      expect(read.field).toBe('name');
      expect(read).toContain({ passed: true });
    });

    it('should allow override of the field', async () => {
      await node.write('replaced', 'resolved');
      hook.andCall((read) => ({
        ...read,
        field: 'replaced',
      }));

      const value = await node.read('nothing here');
      expect(value).toBe('resolved');
    });

    it('should allow override of the options', async () => {
      await node.write('edge', { edge: 'potatoes' });

      hook.andCall((read) => ({
        ...read,
        overridden: true,
      }));

      await node.read('edge');

      const [options] = read.calls[0].arguments;
      expect(options).toContain({ overridden: true });
    });

  });

  describe('"after.read.field"', () => {
    let hook, node;

    beforeEach(async () => {
      hook = createSpy().andCall((read) => read);
      db = database({
        hooks: {
          after: {
            read: { field: hook },
          },
        },
      });

      node = await db.write('after.read.field tests', {});
    });

    it('should be given the field, value, & options', async () => {
      await node.write('level', 5);
      await node.read('level', { opts: true });
      expect(hook).toHaveBeenCalled();

      const [read] = hook.calls[0].arguments;

      expect(read).toContain({
        field: 'level',
        opts: true,
        value: 5,
      });
    });

    it('should allow overriding the value', async () => {
      hook.andCall((read) => ({
        ...read,
        value: 'replaced',
      }));

      const value = await node.read('whatever');

      expect(value).toBe('replaced');
    });

    it('should be called after resolving edges', async () => {
      const edge = await db.write('edge', {});
      await node.write('edge', edge);

      hook.andCall((read) => {
        expect(read.value).toBe(edge);

        return {
          ...read,
          value: 'replaced value',
        };
      });

      const value = await node.read('edge');
      expect(value).toBe('replaced value');
    });

  });

});
