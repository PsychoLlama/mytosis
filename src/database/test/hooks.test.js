/* eslint-env mocha */
import expect, { createSpy, spyOn } from 'expect';
import database from '../../index';
import { Storage } from './mocks';
import { Graph } from 'graph-crdt';

describe('Database hook', () => {
  let db, storage, hook;

  beforeEach(() => {
    storage = new Storage();
    hook = createSpy();
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
      hook.andReturn([graph]);

      await db.write('stuff', {});

      const [contents] = write.calls[0].arguments;
      expect(contents).toBe(graph);
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

    it('should be passed the context', async () => {
      const settings = await db.write('settings', {
        enabled: true,
      });
      const [node] = hook.calls[0].arguments;
      expect(node).toBe(settings);
    });

    it('should be passed the options', async () => {
      await db.write('beans', {}, {
        cool: true,
      });

      const [, options] = hook.calls[0].arguments;
      expect(options).toContain({
        cool: true,
      });
    });

    it('should allow overriding of the return context', async () => {
      hook.andReturn([
        { trickery: true },
      ]);
      const result = await db.write('beans', {});
      expect(result).toEqual({
        trickery: true,
      });
    });

  });

  describe('"before.read.node"', () => {
    let read, hook;

    beforeEach(() => {
      read = spyOn(storage, 'read');
      hook = createSpy();
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
      const [key, opts] = hook.calls[0].arguments;
      expect(key).toBe('key name');
      expect(opts).toContain(options);
    });

    it('should allow overriding the key', async () => {
      hook.andCall((key) => `prefix/${key}`);
      await db.read('stuff');
      const [uid] = read.calls[0].arguments;
      expect(uid).toBe('prefix/stuff');
    });

    it('should allow overriding the options', async () => {
      hook.andCall((key, options) => (
        Object.assign({ overridden: true }, options)
      ));

      await db.read('key', { original: true });
      const [, options] = read.calls[0].arguments;
      expect(options).toContain({
        overridden: true,
        original: true,
      });
    });

  });

  describe('"after.read.node"', () => {
    let hook;

    beforeEach(async () => {
      hook = createSpy();
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
      const [node, options] = hook.calls[0].arguments;

      expect(node).toBe(data);
      expect(options).toContain({ cool: 'totally' });
    });

    it('should allow override of the return node', async () => {
      hook.andReturn(['haha, replaced!']);
      const value = await db.read('data');
      expect(value).toBe('haha, replaced!');
    });

  });

  describe('"before.read.field"', () => {
    let hook, node, read;

    beforeEach(async () => {
      hook = createSpy();
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

    it('should be passed the field and options', async () => {
      await node.read('name', { passed: true });
      expect(hook).toHaveBeenCalled();

      const [field, options] = hook.calls[0].arguments;
      expect(field).toBe('name');
      expect(options).toContain({ passed: true });
    });

    it('should allow override of the field', async () => {
      await node.write('replaced', 'resolved');
      hook.andReturn(['replaced']);

      const value = await node.read('nothing here');
      expect(value).toBe('resolved');
    });

    it('should allow override of the options', async () => {
      await node.write('edge', { edge: 'potatoes' });

      hook.andCall((field, options) => [
        undefined,
        Object.assign({
          overridden: true,
        }, options),
      ]);

      await node.read('edge');

      const [, options] = read.calls[0].arguments;
      expect(options).toContain({ overridden: true });
    });

  });

  describe('"after.read.field"', () => {
    let hook, node;

    beforeEach(async () => {
      hook = createSpy();
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

      const [field, value, options] = hook.calls[0].arguments;
      expect(field).toBe('level');
      expect(value).toBe(5);
      expect(options).toContain({ opts: true });
    });

    it('should allow overriding the value', async () => {
      hook.andReturn(['was the key', 'replaced']);
      const value = await node.read('whatever');

      expect(value).toBe('replaced');
    });

    it('should be called after resolving edges', async () => {
      const edge = await db.write('edge', {});
      await node.write('edge', edge);

      hook.andCall((field, value) => {
        expect(value).toBe(edge);
        return [field, 'replaced value'];
      });

      const value = await node.read('edge');
      expect(value).toBe('replaced value');
    });

  });

});
